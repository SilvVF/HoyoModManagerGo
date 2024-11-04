package server

import (
	"context"
	"errors"
	"fmt"
	"hmm/pkg/core"
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
	server *CancelableServer
	prefs  *core.AppPrefs
	db     *core.DbHelper
	events chan ServCmd
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

func NewServerManager(prefs *core.AppPrefs, db *core.DbHelper) *ServerManager {
	return &ServerManager{
		server: nil,
		prefs:  prefs,
		db:     db,
		events: make(chan ServCmd),
	}
}

func (sm *ServerManager) Listen(ctx context.Context) {
	var portChan <-chan int
	var cancelPortWatch func()

	portPref := sm.prefs.ServerPortPref.Preference

	stopServer := func() {
		if cancelPortWatch != nil {
			cancelPortWatch()
			portChan = nil
			cancelPortWatch = nil
		}
		sm.cancelServer()
		runtime.EventsEmit(ctx, EVENT_NAME, EVENT_STOPPED)
	}

	startServer := func(port int) {
		sm.startCancellableServer(port)
		portChan, cancelPortWatch = portPref.Watch()
		runtime.EventsEmit(ctx, EVENT_NAME, EVENT_STARTED)
	}

	go func() {
		for {
			select {
			case p, ok := <-portChan:
				if !ok {
					return
				}
				if sm.Running() {
					log.LogDebug(fmt.Sprintf("Restarting server with port: %d", p))
					stopServer()
					startServer(p)
				}
			case cmd := <-sm.events:
				switch cmd {
				case CMD_START:
					startServer(portPref.Get())
				case CMD_STOP:
					stopServer()
				case CMD_RESTART:
					stopServer()
					startServer(portPref.Get())
				}
			case <-ctx.Done():
				stopServer()
				close(sm.events)
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
		newServer(ctx, port, sm.db, sm.prefs),
	}

	go func() {
		sm.server.server.run()
	}()
}
