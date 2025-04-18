package server

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"hmm/pkg/core"
	"hmm/pkg/log"
	"hmm/pkg/pref"
	"hmm/pkg/types"
	"io"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type Job struct {
	err         error
	startedAt   time.Time
	completedAt time.Time
}

func (j *Job) Status() string {
	if j.startedAt.IsZero() {
		return "pending"
	} else if j.completedAt.IsZero() {
		return "in progress"
	} else if j.err != nil {
		return "failed"
	} else {
		return "completed"
	}
}

type Server struct {
	port      int
	db        *core.DbHelper
	generator *core.Generator
	authType  pref.Preference[int]
	username  pref.Preference[string]
	password  pref.Preference[string]
	jobs      map[int]*Job
	jobId     *atomic.Int32
	jobMutex  *sync.Mutex
}

func newServer(
	port int,
	db *core.DbHelper,
	generator *core.Generator,
	prefs *core.AppPrefs,
) *Server {
	return &Server{
		port:      port,
		db:        db,
		generator: generator,
		authType:  prefs.ServerAuthTypePref,
		username:  prefs.ServerUsernamePref,
		password:  prefs.ServerPasswordPref,
		jobs:      map[int]*Job{},
		jobId:     &atomic.Int32{},
		jobMutex:  &sync.Mutex{},
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

func (s *Server) Run(ctx context.Context) error {

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
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		log.LogDebug("Shutting down the server...")
		return server.Shutdown(shutdownCtx)
	case err := <-stopChan:
		return err
	}
}

type DataResponse struct {
	Game int                              `json:"game"`
	Data []types.CharacterWithModsAndTags `json:"data"`
}

type GeneratePostRequest struct {
	Game int `json:"game"`
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

	mux.HandleFunc("GET /data", basicAuthMiddleware(dataHandler(s.db)))
	mux.HandleFunc("GET /data/{game}", basicAuthMiddleware(gameDataHandler(s.db)))

	mux.HandleFunc("POST /update/mod", basicAuthMiddleware(updateModHandler(s.db)))

	mux.HandleFunc("POST /generate", basicAuthMiddleware(s.generateHandler()))

	mux.HandleFunc("GET /poll-generation", basicAuthMiddleware(s.pollGenerationHandler()))
}
func validateGame(w http.ResponseWriter, r *http.Request) (types.Game, error) {
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

func gameDataHandler(db *core.DbHelper) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		game, err := validateGame(w, r)
		if err != nil {
			return
		}

		cwmt := db.SelectCharacterWithModsTagsAndTextures(game, "", "", "")

		bytes, err := json.Marshal(cwmt)

		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Server encountered an error"))
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write(bytes)
	}
}

func dataHandler(db *core.DbHelper) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {

		results := make([]DataResponse, 0, 4)

		for _, game := range validGame {

			data := DataResponse{
				Game: game,
				Data: db.SelectCharacterWithModsTagsAndTextures(types.Game(game), "", "", ""),
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
	}
}

func updateModHandler(db *core.DbHelper) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
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

		err = db.EnableModById(t.Enabled, t.Id)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Bad Request: unable to update mod"))
			return
		}

		w.WriteHeader(http.StatusOK)
	}
}

func (s *Server) generateHandler() func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Bad Request: unable to read body"))
			return
		}
		var t GeneratePostRequest
		err = json.Unmarshal(body, &t)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Bad Request: unable to unmarshal body"))
			return
		}

		if !slices.Contains(validGame, t.Game) {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("Bad Request: invalid game"))
			return
		}

		jobId := s.jobId.Add(1)

		go func() {

			s.jobMutex.Lock()
			job := &Job{startedAt: time.Now()}
			s.jobs[int(jobId)] = job
			s.jobMutex.Unlock()

			err := s.generator.Reload(types.Game(t.Game))

			if err != nil {
				log.LogError(err.Error())
			}

			s.jobMutex.Lock()
			job.completedAt = time.Now()
			job.err = err
			s.jobMutex.Unlock()
		}()

		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"job_id": "%d"}`, jobId)
	}
}

func (s *Server) pollGenerationHandler() func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.Atoi(r.URL.Query().Get("jobId"))
		if err != nil {
			http.Error(w, "Bad Request: Invalid job id", http.StatusBadRequest)
			return
		}

		s.jobMutex.Lock()
		job, ok := s.jobs[id]
		s.jobMutex.Unlock()

		if !ok {
			http.Error(w, "Bad Request: job does not exist", http.StatusBadRequest)
			return
		}

		timeout := time.After(5 * time.Second)
		ticker := time.NewTicker(500 * time.Millisecond)

		var status string
	outer:
		for {
			select {
			case <-timeout:
				s.jobMutex.Lock()
				status = job.Status()
				s.jobMutex.Unlock()
				break outer
			case <-ticker.C:
				s.jobMutex.Lock()
				status = job.Status()
				s.jobMutex.Unlock()
				if status == "completed" || status == "failed" {
					break outer
				}
			}
		}
		response := map[string]any{
			"jobId":  id,
			"status": status,
		}

		if status == "completed" {
			response["completedAt"] = job.completedAt
		} else if status == "failed" {
			response["error"] = job.err.Error()
		}

		w.Header().Set("Content-Type", "application/json")

		if status == "in progress" {
			w.WriteHeader(http.StatusNoContent)
		} else {
			w.WriteHeader(http.StatusOK)
		}

		log.LogDebugf("server sending response to polling %v", response)

		json.NewEncoder(w).Encode(response)
	}
}
