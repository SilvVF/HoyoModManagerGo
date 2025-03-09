package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"flag"
	"fmt"
	"log"
	"log/slog"
	godotenv "mserv/lib"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/httprate"
	"github.com/go-chi/jwtauth/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

var port = flag.Int("server port", 6969, "listen port for server")
var host = flag.String("server addr", "localhost", "listen addr for server")

var keydbHost = flag.String("key db host address", "localhost", "key db host address")
var keydbPort = flag.Int("key db port", 6379, "key db port")

var tokenAuth *jwtauth.JWTAuth

func init() {

	err := godotenv.Load("local.env")
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	flag.Parse()

	tokenAuth = jwtauth.New("HS256", []byte(os.Getenv("HS256_SECRET")), nil)
}

type App struct {
	rc  *redis.Client
	ctx context.Context
}

func main() {

	keydbAddr := fmt.Sprintf("%s:%d", *keydbHost, *keydbPort)
	rc := redis.NewClient(&redis.Options{
		Addr:     keydbAddr,
		Password: os.Getenv("KEYDB_PASS"),
		DB:       0,
	})

	sAddr := fmt.Sprintf("%s:%d", *host, *port)
	fmt.Printf("Starting server on %v\n", sAddr)

	app := App{
		rc:  rc,
		ctx: context.Background(),
	}

	if err := http.ListenAndServe(sAddr, router(&app)); err != nil {
		log.Fatal(err)
	}
}

func router(a *App) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(httprate.LimitByIP(100, 1*time.Minute))

	r.Group(a.authenticatedRoutes)
	r.Group(a.publicRoutes)

	return r
}

func (a *App) publicRoutes(r chi.Router) {
	r.Post("/signup", a.signupAnonymous)
}

func (a *App) authenticatedRoutes(r chi.Router) {
	// Seek, verify and validate JWT tokens
	r.Use(jwtauth.Verifier(tokenAuth))

	r.Use(a.AuthenticatorCheckRefresh(tokenAuth))
	r.Post("/delaccount", a.deleteAnonAccount)

	r.Post("/upload", func(w http.ResponseWriter, r *http.Request) {
		_, claims, _ := jwtauth.FromContext(r.Context())
		w.Write(fmt.Appendf([]byte{}, "protected area. hi %v", claims["sub"]))
	})
}

func (a *App) AuthenticatorCheckRefresh(ja *jwtauth.JWTAuth) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		hfn := func(w http.ResponseWriter, r *http.Request) {
			token, claims, err := jwtauth.FromContext(r.Context())

			if err != nil {
				http.Error(w, err.Error(), http.StatusUnauthorized)
				return
			}

			if token == nil {
				http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
				return
			}

			uid := claims["sub"].(string)

			if err := a.rc.Get(a.ctx, uid).Err(); err != nil {
				http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
				return
			}

			// Token is authenticated, pass it through
			next.ServeHTTP(w, r)
		}
		return http.HandlerFunc(hfn)
	}
}

func (a *App) deleteAnonAccount(w http.ResponseWriter, r *http.Request) {
	_, claims, _ := jwtauth.FromContext(r.Context())

	uid := claims["sub"].(string)

	if err := a.rc.Del(a.ctx, uid).Err(); err != nil {
		http.Error(w, "failed to delete token", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func generateRefreshToken() string {
	token := make([]byte, 32)
	_, err := rand.Read(token)
	if err != nil {
		log.Fatalf("Failed to generate random token: %v", err)
	}
	return base64.URLEncoding.EncodeToString(token)
}

func (a *App) signupAnonymous(w http.ResponseWriter, _ *http.Request) {

	uid := uuid.NewString()

	rTok := generateRefreshToken()

	err := a.rc.Set(a.ctx, uid, rTok, 0).Err()
	if err != nil {
		slog.Error(err.Error())
		http.Error(w, "Error creating refresh token", http.StatusInternalServerError)
		return
	}

	jwtClaims := map[string]any{
		"iss":     "hmm-auth-server",
		"sub":     uid,
		"exp":     time.Now().Add(time.Hour * 24 * 7).Unix(),
		"refresh": rTok,
	}

	_, tokStr, err := tokenAuth.Encode(jwtClaims)
	if err != nil {
		slog.Error(err.Error())
		http.Error(w, "Error creating jwt token", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte(tokStr))
}
