package main

import (
	"hmmweb/views"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Get("/", views.HandleIndex)

	workDir, _ := os.Getwd()
	filesDir := http.Dir(filepath.Join(workDir, "assets"))
	log.Print(filesDir)
	fs := http.FileServer(filesDir)
	r.Handle("/*", fs)

	http.ListenAndServe(":3000", r)
}
