package server

import (
	"context"
	"errors"
	"hmm/pkg/core"
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
	port   core.Preference[int]
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

func NewServerManager(port core.Preference[int], db *core.DbHelper) *ServerManager {
	return &ServerManager{
		server: nil,
		port:   port,
		db:     db,
		events: make(chan ServCmd),
	}
}

func (sm *ServerManager) Listen(ctx context.Context) {
	go func() {
		for {
			select {
			case <-ctx.Done():
				close(sm.events)
				return
			case cmd := <-sm.events:
				switch cmd {
				case CMD_START:
					sm.startCancellableServer()
					runtime.EventsEmit(ctx, EVENT_NAME, EVENT_STARTED)
				case CMD_STOP:
					sm.cancelServer()
					runtime.EventsEmit(ctx, EVENT_NAME, EVENT_STOPPED)
				case CMD_RESTART:
					sm.cancelServer()
					runtime.EventsEmit(ctx, EVENT_NAME, EVENT_STOPPED)
					sm.startCancellableServer()
					runtime.EventsEmit(ctx, EVENT_NAME, EVENT_STARTED)
				}
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

func (sm *ServerManager) startCancellableServer() {

	if sm.server != nil {
		sm.cancelServer()
	}

	ctx, cancel := context.WithCancel(context.Background())

	sm.server = &CancelableServer{
		cancel,
		newServer(ctx, sm.port.Get(), sm.db),
	}

	go func() {
		sm.server.server.run()
		sm.cancelServer()
	}()
}
