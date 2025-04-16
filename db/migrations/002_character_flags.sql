-- +goose Up
ALTER TABLE character ADD COLUMN flags INTEGER NOT NULL DEFAULT 0;

-- +goose Down