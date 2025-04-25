-- +goose Up
ALTER TABLE mod RENAME TO mod_old;

CREATE TABLE mod (
    id INTEGER PRIMARY KEY NOT NULL,
    fname TEXT NOT NULL,
    game INTEGER NOT NULL,
    char_name TEXT NOT NULL,
    char_id INTEGER NOT NULL,
    selected BOOLEAN NOT NULL DEFAULT FALSE,
    preview_images TEXT NOT NULL DEFAULT '',
    gb_id INTEGER,
    mod_link TEXT,
    gb_file_name TEXT,
    gb_download_link TEXT,
    UNIQUE(fname, char_id, char_name),
    FOREIGN KEY (char_id) REFERENCES character(id) ON DELETE CASCADE
);

INSERT INTO mod (
    id, fname, game, char_name, char_id, selected, preview_images,
    gb_id, mod_link, gb_file_name, gb_download_link
)
SELECT
    id, fname, game, char_name, char_id, selected, preview_images,
    gb_id, mod_link, gb_file_name, gb_download_link
FROM mod_old;

DROP TABLE mod_old;

-- +goose Down
