-- name: SelectCharacterById :one
SELECT * FROM character WHERE id = :id AND game = :game LIMIT 1;

-- name: SelectClosestCharacter :one
SELECT * FROM character WHERE LOWER(name) LIKE '%' || LOWER(:name) || '%' AND game = :game LIMIT 1;

-- name: SelectCharactersByGame :many
SELECT * FROM character WHERE game = :game;

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

-- name: SelectAllTexturesByModIds :many
SELECT * FROM texture WHERE mod_id IN sqlc.slice('ids');

-- name: InsertTexture :one
INSERT INTO texture (
    mod_id,
    fname,
    selected, 
    preview_images, 
    gb_id, 
    mod_link, 
    gb_file_name, 
    gb_download_link
) VALUES(
    :modId,
    :modFilename,
    :selected,
    :previewImages,
    :gbId,
    :modLink,
    :gbFilename,
    :gbDownloadLink
)
ON CONFLICT(fname, mod_id) DO NOTHING
RETURNING id;

-- name: DeleteUnusedMods :exec
DELETE FROM mod WHERE fname NOT IN sqlc.slice('files') AND game = :game;

-- name: SelectCharactersWithModsAndTags :many
SELECT 
    c.*,
    m.*,
    t.*,
    tex.*
FROM 
    character c
    LEFT JOIN mod m 
        ON m.char_id = c.id
    LEFT JOIN tag t 
        ON t.mod_id = m.id
    LEFT JOIN texture tex 
        ON tex.mod_id = m.id
WHERE 
    c.game = :game 
    AND (
        (
            m.fname LIKE '%' || :modFileName || '%'
            OR c.name LIKE '%' || :characterName || '%'
            OR t.tag_name LIKE '%' || :tagName || '%'
        ) OR (
            :modFileName IS NULL 
            AND :characterName IS NULL 
            AND :tagName IS NULL 
        )
    )
ORDER BY 
    c.name, m.fname, t.tag_name, tex.id;
    
-- name: SelectClosestCharacterMatch :one
SELECT * FROM character WHERE LOWER(name) LIKE '%' || LOWER(:name) || '%' AND game = :game LIMIT 1;

-- name: SelectModsByCharacterName :many
SELECT * FROM mod WHERE mod.char_name = :name AND mod.game = :game;

-- name: SelectTexturesByModId :many
SELECT * FROM texture WHERE mod_id = :modId;

-- name: SelectEnabledTexturesByModId :many
SELECT * FROM texture WHERE mod_id = :modId AND selected;

-- name: SelectModById :one
SELECT * FROM mod WHERE mod.id = :id LIMIT 1;

-- name: DeleteModById :exec
DELETE FROM mod WHERE mod.id = :id;

-- name: SelectTextureById :one
SELECT * FROM texture WHERE texture.id = :id LIMIT 1;

-- name: DeleteTextureById :exec
DELETE FROM texture WHERE texture.id = :id;

-- name: SelectModsByGbId :many
SELECT * FROM mod WHERE mod.gb_id = :gbId;

-- name: UpdateModEnabledById :exec
UPDATE mod SET
    selected = :selected
WHERE mod.id = :id;

-- name: SelectModByCharAndGame :one
SELECT * FROM mod WHERE mod.fname = :fname AND mod.game = :game AND mod.char_name = :characterName;

-- name: UpdateTextureEnabledById :exec
UPDATE texture SET
    selected = :selected
WHERE texture.id = :id;

-- name: UpdateModGbFilename :exec
UPDATE mod SET
    gb_file_name = :gbFilename
WHERE mod.id = :id;

-- name: UpdateModGbId :exec
UPDATE mod SET
    gb_id = :gbId
WHERE mod.id = :id;


-- name: UpdateModImages :exec
UPDATE mod SET
    preview_images = :previewImages
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

-- name: InsertPlayListModCrossRef :exec
INSERT INTO playlist_mod_cross_ref (
    playlist_id,
    mod_id
) VALUES (
    :playlistId,
    :modId
);

-- name: DisableAllModsByGame :exec
UPDATE mod SET 
    selected = FALSE
WHERE mod.game = ?;

-- name: UpdateModsEnabledFromSlice :exec
UPDATE mod SET 
    selected = CASE WHEN mod.id IN (sqlc.slice('enabled'))
        THEN TRUE
        ELSE FALSE
    END
WHERE mod.game = ?;

-- name: UpdatePlaylistName :exec
UPDATE playlist SET
    playlist_name = :name
WHERE id = :id;

-- name: DeleteCharacterById :exec
DELETE FROM character 
WHERE id = :id;