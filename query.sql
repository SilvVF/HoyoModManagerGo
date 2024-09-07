-- name: SelectCharacterById :one
SELECT * FROM character WHERE id = :id AND game = :game LIMIT 1;

-- name: SelectClosestCharacter :one
SELECT * FROM character WHERE LOWER(name) LIKE '%' || LOWER(:name) || '%' AND game = :game LIMIT 1;

-- name: SelectCharactersByGame :many
SELECT * FROM character WHERE game = :game;

-- name: InsertMod :exec
INSERT OR IGNORE INTO mod (
    fname,
    game, 
    char_name, 
    char_id, 
    selected, 
    preview_images, 
    gb_id, mod_link, 
    gb_file_name, 
    gb_download_link
) VALUES(
    :modFilename,
    :game,
    :charName,
    :charId,
    :selected,
    :previewImages,
    :gbId,
    :modLink,
    :gbFilename,
    :gbDownloadLink
);

-- name: DeleteUnusedMods :exec
DELETE FROM mod WHERE fname NOT IN sqlc.slice('files') AND game = :game;

-- name: SelectCharactersWithModsAndTags :many
SELECT 
    c.*,
    m.*,
    t.*
FROM 
    character c
    LEFT JOIN  mod m 
    ON m.char_id = c.id
    LEFT JOIN tag t 
    ON t.mod_id = m.id
    WHERE c.game = :game 
    AND (
        (
            m.fname LIKE '%' || :modFileName || '%'
            OR c.name LIKE '%' || :characterName || '%'
            OR t.tag_name LIKE '%' || :tagName || '%'
        ) OR (
            :modFileName is NULL AND :characterName is NULL AND :tagName is NULL 
        )
    )
ORDER BY c.name, m.fname, t.tag_name;

-- name: SelectClosestCharacterMatch :one
SELECT * FROM character WHERE LOWER(name) LIKE '%' || LOWER(:name) || '%' AND game = :game LIMIT 1;

-- name: SelectModsByCharacterName :many
SELECT * FROM mod WHERE mod.char_name = :name AND mod.game = :game;

-- name: SelectModById :one
SELECT * FROM mod WHERE mod.id = :id LIMIT 1;

-- name: DeleteModById :exec
DELETE FROM mod WHERE mod.id = :id;

-- name: UpdateModEnabledById :exec
UPDATE mod SET
    selected = :selected
WHERE mod.id = :id;

-- name: SelectEnabledModsForGame :many
SELECT * FROM mod WHERE selected AND game = :game;

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

-- name: UpdatePlayist :exec
UPDATE playlist SET
    playlist_name = :playlistName
WHERE playlist.id = :id;

-- name: InsertPlayListModCrossRef :exec
INSERT INTO playlist_mod_cross_ref (
    playlist_id,
    mod_id
) VALUES (
    :playlistId,
    :modId
);

-- name: UpdateModsEnabledFromSlice :exec
UPDATE mod SET 
    selected = CASE WHEN mod.id IN (sqlc.slice('enabled'))
        THEN TRUE
        ELSE FALSE
    END
WHERE mod.game = ?;
