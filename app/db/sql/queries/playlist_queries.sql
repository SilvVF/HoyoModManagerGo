-- playlist(
--     id INTEGER PRIMARY KEY NOT NULL,
--     playlist_name TEXT NOT NULL DEFAULT '',
--     game INTEGER NOT NULL 
-- );

-- CREATE TABLE IF NOT EXISTS playlist_mod_cross_ref(
--     playlist_id INTEGER NOT NULL,
--     mod_id INTEGER NOT NULL,
--     PRIMARY KEY (playlist_id, mod_id),
--     FOREIGN KEY (mod_id) REFERENCES mod(id) ON DELETE CASCADE,
--     FOREIGN KEY (playlist_id) REFERENCES playlist(id) ON DELETE CASCADE
-- );

-- name: SelectPlaylistWithModsAndTags :many
SELECT 
    p.*,
    m.*,
    t.*
FROM 
    playlist p
JOIN 
    playlist_mod_cross_ref pmcr ON p.id = pmcr.playlist_id
JOIN 
    mod m ON pmcr.mod_id = m.id
LEFT JOIN 
    tag t ON m.id = t.mod_id
WHERE p.game = :game
ORDER BY m.char_name, m.fname;

-- name: InsertPlaylist :one
INSERT INTO playlist(
    playlist_name,
    game
) VALUES (
    :playlistName,
    :game
)
RETURNING id;

-- name: InsertPlayListModCrossRef :exec
INSERT INTO playlist_mod_cross_ref (
    playlist_id,
    mod_id
) VALUES (
    :playlistId,
    :modId
);

-- name: UpdatePlaylistName :exec
UPDATE playlist SET
    playlist_name = :name
WHERE id = :id;

-- name: DeletePlaylistById :exec
DELETE FROM playlist WHERE id = :id;