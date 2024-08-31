-- name: SelectCharacterById :one
SELECT * FROM character WHERE id = :id AND game = :game LIMIT 1;

-- name: SelectClosestCharacter :one
SELECT * FROM character WHERE LOWER(name) LIKE '%' || LOWER(:name) || '%' AND game = :game LIMIT 1;

-- name: SelectCharactersByGame :many
SELECT * FROM character WHERE character.game = :game;

-- name: UpsertCharacter :exec
INSERT OR IGNORE INTO character(id, game, name, avatar_url, element) 
VALUES(?, ?, ?, ?, ?);

-- name: InsertMod :exec
INSERT OR IGNORE INTO mod (
    mod_filename,
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
DELETE FROM mod WHERE mod_filename NOT IN (sqlc.slice('files')) AND game = :game;

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
            m.mod_filename LIKE '%' || :modFileName || '%'
            OR c.name LIKE '%' || :characterName || '%'
            OR t.tag_name LIKE '%' || :tagName || '%'
        ) OR (
            :modFileName is NULL AND :characterName is NULL AND :tagName is NULL 
        )
    )
ORDER BY c.name, m.mod_filename, t.tag_name;

-- name: SelectClosestCharacterMatch :one
SELECT * FROM character WHERE LOWER(name) LIKE '%' || LOWER(:name) || '%' AND game = :game LIMIT 1;

-- name: SelectModsByCharacterName :many
SELECT * FROM mod WHERE mod.char_name = :name AND mod.game = :game;
