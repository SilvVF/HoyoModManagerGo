package server

import (
	"context"
	"hmm/pkg/core"
)

const (
	CMD_START = iota
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
}

func NewServerManager(port core.Preference[int], db *core.DbHelper) *ServerManager {
	return &ServerManager{
		server: nil,
		port:   port,
		db:     db,
	}
}

func (sm *ServerManager) ListenAndServe(ctx context.Context) chan<- ServCmd {

	cmdchan := make(chan ServCmd)

	go func() {
		for {
			select {
			case <-ctx.Done():
				close(cmdchan)
				return
			case cmd := <-cmdchan:
				switch cmd {
				case CMD_START:
					sm.start()
				case CMD_STOP:
					sm.shutdown()
				case CMD_RESTART:
					sm.shutdown()
					sm.start()
				}
			}
		}
	}()

	return cmdchan
}

func (sm *ServerManager) Running() bool {
	return sm.server != nil
}

func (sm *ServerManager) shutdown() {
	if sm.server != nil {
		sm.server.cancel()
		sm.server = nil
	}
}

func (sm *ServerManager) start() {

	if sm.server != nil {
		sm.shutdown()
	}

	ctx, cancel := context.WithCancel(context.Background())

	sm.server = &CancelableServer{
		cancel,
		newServer(ctx, sm.port, sm.db),
	}

	go func() {
		sm.server.server.run()
		sm.shutdown()
	}()
}
