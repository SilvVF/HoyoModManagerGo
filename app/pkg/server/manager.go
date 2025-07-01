package server

import (
	"context"
	"errors"
	"fmt"
	"hmm/pkg/core"
	"hmm/pkg/core/dbh"
	"hmm/pkg/log"
	"net"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	EVENT_NAME    = "server_event"
	EVENT_STOPPED = "server_stopped"
	EVENT_STARTED = "server_started"
	CMD_START     = iota + 1
	CMD_STOP
	CMD_RESTART
)

type CancelableServer struct {
	cancel context.CancelFunc
	server *Server
}

type ServCmd int

type ServerManager struct {
	server    *CancelableServer
	prefs     *core.AppPrefs
	generator *core.Generator
	db        *dbh.DbHelper
	notifier  core.Notifier
	err       chan error
	events    chan ServCmd
}

func (*ServerManager) GetLocalIp() (string, error) {
	ifaces, err := net.Interfaces()
	if err != nil {
		return "", err
	}
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 {
			continue // interface down
		}
		if iface.Flags&net.FlagLoopback != 0 {
			continue // loopback interface
		}
		addrs, err := iface.Addrs()
		if err != nil {
			return "", err
		}
		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}
			if ip == nil || ip.IsLoopback() {
				continue
			}
			ip = ip.To4()
			if ip == nil {
				continue // not an ipv4 address
			}
			return ip.String(), nil
		}
	}
	return "", errors.New("are you connected to the network?")
}

func NewServerManager(prefs *core.AppPrefs, db *dbh.DbHelper, g *core.Generator, notifier core.Notifier) *ServerManager {
	return &ServerManager{
		server:    nil,
		prefs:     prefs,
		db:        db,
		generator: g,
		notifier:  notifier,
		events:    make(chan ServCmd),
		err:       make(chan error),
	}
}

func (sm *ServerManager) Listen(ctx context.Context) {
	portChan, cancelPortWatch := sm.prefs.ServerPortPref.Watch()

	portPref := sm.prefs.ServerPortPref.Preference

	stopServer := func() {
		sm.cancelServer()
		runtime.EventsEmit(ctx, EVENT_NAME, EVENT_STOPPED)
	}

	startServer := func(port int) {
		sm.startCancellableServer(port)
		runtime.EventsEmit(ctx, EVENT_NAME, EVENT_STARTED)
	}

	go func() {
		for {
			select {
			case _, ok := <-portChan:
				if !ok {
					return
				}
				if sm.Running() {
					sm.events <- CMD_RESTART
				}

			case cmd := <-sm.events:
				switch cmd {
				case CMD_START:
					startServer(portPref.Get())
					sm.notifier.Info(fmt.Sprintf("started server on port: %d", portPref.Get()))
				case CMD_STOP:
					stopServer()
					sm.notifier.Info(fmt.Sprintf("stopped server on port: %d", portPref.Get()))
				case CMD_RESTART:
					stopServer()
					startServer(portPref.Get())
					sm.notifier.Info(fmt.Sprintf("restarted server on port: %d", portPref.Get()))
				}
			case <-ctx.Done():
				stopServer()
				close(sm.events)
				cancelPortWatch()
				return
			}
		}
	}()
}

func (sm *ServerManager) Running() bool {
	return sm.server != nil
}

func (sm *ServerManager) Restart() {
	sm.events <- CMD_RESTART
}

func (sm *ServerManager) Start() {
	sm.events <- CMD_START
}

func (sm *ServerManager) Stop() {
	sm.events <- CMD_STOP
}

func (sm *ServerManager) cancelServer() {
	if sm.server != nil {
		sm.server.cancel()
		sm.server = nil
	}
}

func (sm *ServerManager) startCancellableServer(port int) {

	if sm.server != nil {
		log.LogDebug(fmt.Sprintf("cancelling previously running server on %d", sm.server.server.port))
		sm.cancelServer()
	}

	ctx, cancel := context.WithCancel(context.Background())

	sm.server = &CancelableServer{
		cancel,
		newServer(port, sm.db, sm.generator, sm.prefs),
	}

	go func() {
		sm.err <- sm.server.server.Run(ctx)
	}()
}
