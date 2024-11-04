package server

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"hmm/pkg/core"
	"hmm/pkg/pref"
	"hmm/pkg/types"
	"io"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"
)

type Server struct {
	port     int
	db       *core.DbHelper
	authType pref.Preference[int]
	username pref.Preference[string]
	password pref.Preference[string]
	ctx      context.Context
}

func newServer(
	ctx context.Context,
	port int,
	db *core.DbHelper,
	prefs *core.AppPrefs,
) *Server {
	return &Server{
		port:     port,
		db:       db,
		ctx:      ctx,
		authType: prefs.ServerAuthTypePref,
		username: prefs.ServerUsernamePref,
		password: prefs.ServerPasswordPref,
	}
}

var validGame []int = []int{int(types.Genshin), int(types.StarRail), int(types.WuWa), int(types.ZZZ)}

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

	basicAuthMiddleware := func(next func(w http.ResponseWriter, r *http.Request)) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if s.authType.Get() != int(types.AUTH_BASIC) {
				next(w, r)
				return
			}

			username, password, ok := r.BasicAuth()

			if ok {
				// Calculate SHA-256 hashes for the provided and expected
				// usernames and passwords.
				usernameHash := sha256.Sum256([]byte(username))
				passwordHash := sha256.Sum256([]byte(password))
				expectedUsernameHash := sha256.Sum256([]byte(s.username.Get()))
				expectedPasswordHash := sha256.Sum256([]byte(s.password.Get()))

				// Use the subtle.ConstantTimeCompare() function to check if
				// the provided username and password hashes equal the
				// expected username and password hashes. ConstantTimeCompare
				// will return 1 if the values are equal, or 0 otherwise.
				// Importantly, we should to do the work to evaluate both the
				// username and password before checking the return values to
				// avoid leaking information.
				usernameMatch := (subtle.ConstantTimeCompare(usernameHash[:], expectedUsernameHash[:]) == 1)
				passwordMatch := (subtle.ConstantTimeCompare(passwordHash[:], expectedPasswordHash[:]) == 1)

				// If the username and password are correct, then call
				// the next handler in the chain. Make sure to return
				// afterwards, so that none of the code below is run.
				if usernameMatch && passwordMatch {
					next(w, r)
					return
				}
			}
			// If the Authentication header is not present, is invalid, or the
			// username or password is wrong, then set a WWW-Authenticate
			// header to inform the client that we expect them to use basic
			// authentication and send a 401 Unauthorized response.
			w.Header().Set("WWW-Authenticate", `Basic realm="restricted", charset="UTF-8"`)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
		}
	}

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

	mux.HandleFunc("GET /data", basicAuthMiddleware(func(w http.ResponseWriter, r *http.Request) {

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
	}))
	mux.HandleFunc("GET /data/{game}", basicAuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
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
	}))

	mux.HandleFunc("POST /update/mod", basicAuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
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
	}))
}
