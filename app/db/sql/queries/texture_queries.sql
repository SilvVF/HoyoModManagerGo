-- texture(
--     id INTEGER PRIMARY KEY NOT NULL,
--     mod_id INTEGER NOT NULL,
--     fname TEXT NOT NULL,
--     selected BOOLEAN NOT NULL DEFAULT FALSE,
--     preview_images TEXT NOT NULL DEFAULT '',
--     gb_id INTEGER,
--     mod_link TEXT,
--     gb_file_name TEXT,
--     gb_download_link TEXT,
--     UNIQUE(fname, mod_id),
--     FOREIGN KEY (mod_id) REFERENCES mod(id) ON DELETE CASCADE
-- );

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

-- name: SelectTexturesByModId :many
SELECT * FROM texture WHERE mod_id = :modId;

-- name: SelectEnabledTexturesByModId :many
SELECT * FROM texture WHERE (mod_id = :modId AND selected);

-- name: SelectTextureById :one
SELECT * FROM texture WHERE texture.id = :id LIMIT 1;


-- name: UpdateTextureEnabledById :exec
UPDATE texture SET
    selected = :selected
WHERE texture.id = :id;


-- name: UpdateTextureNameById :exec
UPDATE texture SET
    fname = :fname
WHERE texture.id = :id;


-- name: DeleteTextureById :exec
DELETE FROM texture WHERE texture.id = :id;

-- name: DeleteUnusedTextures :exec
DELETE FROM texture WHERE fname NOT IN sqlc.slice('files') AND mod_id = :modId;
