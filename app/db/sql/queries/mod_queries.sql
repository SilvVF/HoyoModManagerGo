
-- mod(
--    id INTEGER PRIMARY KEY NOT NULL,
--    fname TEXT NOT NULL,
--    game INTEGER NOT NULL,
--    char_name TEXT NOT NULL,
--    char_id INTEGER NOT NULL,
--    selected BOOLEAN NOT NULL DEFAULT FALSE,
--    preview_images TEXT NOT NULL DEFAULT '',
--    gb_id INTEGER,
--    mod_link TEXT,
--    gb_file_name TEXT,
--    gb_download_link TEXT,
--    UNIQUE(fname, char_id, char_name),
--    FOREIGN KEY (char_id) REFERENCES character(id) ON DELETE CASCADE
-- );

-- name: InsertMod :one
INSERT INTO mod (
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
)
ON CONFLICT(fname, char_id, char_name) DO NOTHING
RETURNING id;

-- name: SelectModsByCharacterName :many
SELECT * FROM mod WHERE mod.char_name = :name AND mod.game = :game;

-- name: SelectModsByCharacterId :many
SELECT * FROM mod WHERE mod.char_id = :name AND mod.game = :game;

-- name: SelectModById :one
SELECT * FROM mod WHERE mod.id = :id LIMIT 1;

-- name: SelectEnabledModsForGame :many
SELECT * FROM mod WHERE selected AND game = :game;

-- name: SelectModByFileCharacterGame :one
SELECT * FROM mod WHERE mod.fname = :fname AND mod.game = :game AND mod.char_name = :characterName;

-- name: SelectModsByGbId :many
SELECT * FROM mod WHERE mod.gb_id = :gbId;

-- name: DeleteModById :exec
DELETE FROM mod WHERE mod.id = :id;

-- name: DeleteUnusedMods :exec
DELETE FROM mod WHERE fname NOT IN sqlc.slice('files') AND game = :game;

-- name: UpdateModGbId :exec
UPDATE mod SET
    gb_id = :gbId
WHERE mod.id = :id;

-- name: UpdateModImages :exec
UPDATE mod SET
    preview_images = :previewImages
WHERE mod.id = :id;

-- name: UpdateDisableAllModsByGame :exec
UPDATE mod SET 
    selected = FALSE
WHERE mod.game = ?;

-- name: UpdateModEnabledById :exec
UPDATE mod SET
    selected = :selected
WHERE mod.id = :id;


-- name: UpdateModsEnabledFromSlice :exec
UPDATE mod SET 
    selected = CASE WHEN mod.id IN (sqlc.slice('enabled'))
        THEN TRUE
        ELSE FALSE
    END
WHERE mod.game = ?;