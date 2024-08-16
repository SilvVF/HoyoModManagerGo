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
INSERT INTO mod (
    id, 
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
    :id,
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