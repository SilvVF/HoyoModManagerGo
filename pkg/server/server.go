package server

import (
	"context"
	"encoding/json"
	"fmt"
	"hmm/pkg/core"
	"hmm/pkg/types"
	"io"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"
)

type Server struct {
	port int
	db   *core.DbHelper
	ctx  context.Context
}

func newServer(ctx context.Context, port int, db *core.DbHelper) *Server {
	return &Server{
		port: port,
		db:   db,
		ctx:  ctx,
	}
}

var validGame []int = []int{types.Genshin, types.StarRail, types.WuWa, types.ZZZ}

func joinIntSlice(intSlice []int, sep string) string {
	strSlice := make([]string, len(intSlice))
	for i, v := range intSlice {
		strSlice[i] = strconv.Itoa(v)
	}
	return strings.Join(strSlice, sep)
}

func (s *Server) run() error {

	mux := http.NewServeMux()
	s.registerHandlers(mux)

	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", s.port),
		Handler: mux,
	}

	stopChan := make(chan error)

	go func() {
		err := server.ListenAndServe()
		if err != nil && err != http.ErrServerClosed {
			stopChan <- err
		}
		close(stopChan)
	}()

	select {
	case <-s.ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		fmt.Println("Shutting down the server...")
		err := server.Shutdown(shutdownCtx)
		if err != nil {
			return err
		}
	case err := <-stopChan:
		return err
	}

	return nil
}

type DataResponse struct {
	Game int                              `json:"game"`
	Data []types.CharacterWithModsAndTags `json:"data"`
}

type TogglePostRequest struct {
	Id      int  `json:"mod_id"`
	Enabled bool `json:"enabled"`
}

func (s *Server) registerHandlers(mux *http.ServeMux) {

	validateGame := func(w http.ResponseWriter, r *http.Request) (types.Game, error) {
		game, err := strconv.Atoi(r.PathValue("game"))

		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("Bad Request: Invalid game"))
			return 0, err
		}

		if !slices.Contains(validGame, game) {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte(fmt.Sprintf("Bad Request: Invalid game %d acceptable values %s", game, joinIntSlice(validGame, ", "))))
			return 0, err
		}

		return types.Game(game), nil
	}

	mux.HandleFunc("GET /data", func(w http.ResponseWriter, r *http.Request) {

		results := make([]DataResponse, 0, 4)

		for _, game := range validGame {

			data := DataResponse{
				Game: game,
				Data: s.db.SelectCharacterWithModsTagsAndTextures(types.Game(game), "", "", ""),
			}

			results = append(results, data)
		}

		bytes, err := json.Marshal(results)

		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Server encountered an error"))
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write(bytes)
	})
	mux.HandleFunc("GET /data/{game}", func(w http.ResponseWriter, r *http.Request) {

		game, err := validateGame(w, r)
		if err != nil {
			return
		}

		cwmt := s.db.SelectCharacterWithModsTagsAndTextures(game, "", "", "")

		bytes, err := json.Marshal(cwmt)

		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Server encountered an error"))
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write(bytes)
	})

	mux.HandleFunc("POST /update/mod", func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Bad Request: unable to read body"))
			return
		}
		var t TogglePostRequest
		err = json.Unmarshal(body, &t)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Bad Request: unable to unmarshal body"))
			return
		}

		err = s.db.EnableModById(t.Enabled, t.Id)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Bad Request: unable to update mod"))
			return
		}

		w.WriteHeader(http.StatusOK)
	})
}
