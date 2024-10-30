CREATE TABLE IF NOT EXISTS mod(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    UNIQUE(fname, char_id, char_name)
);

CREATE TABLE IF NOT EXISTS texture(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mod_id INTEGER NOT NULL,
    fname TEXT NOT NULL,
    selected BOOLEAN NOT NULL DEFAULT FALSE,
    preview_images TEXT NOT NULL DEFAULT '',
    gb_id INTEGER,
    mod_link TEXT,
    gb_file_name TEXT,
    gb_download_link TEXT,
    UNIQUE(fname, mod_id),
    FOREIGN KEY (mod_id) REFERENCES mod(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS playlist(
    id INTEGER PRIMARY KEY NOT NULL,
    playlist_name TEXT NOT NULL DEFAULT '',
    game INTEGER NOT NULL 
);

CREATE TABLE IF NOT EXISTS playlist_mod_cross_ref(
    playlist_id INTEGER NOT NULL,
    mod_id INTEGER NOT NULL,
    PRIMARY KEY (playlist_id, mod_id),
    FOREIGN KEY (mod_id) REFERENCES mod(id) ON DELETE CASCADE,
    FOREIGN KEY (playlist_id) REFERENCES playlist(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tag(
    mod_id INTEGER NOT NULL,
    tag_name TEXT NOT NULL DEFAULT '',
    PRIMARY KEY(mod_id, tag_name),
    FOREIGN KEY(mod_id) REFERENCES mod(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS character(
    id INTEGER NOT NULL,
    game INTEGER NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT NOT NULL DEFAULT '',
    element TEXT NOT NULL,
    PRIMARY KEY(id, game)
);

