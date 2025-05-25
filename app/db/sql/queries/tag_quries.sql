-- tag(
--     mod_id INTEGER NOT NULL,
--     tag_name TEXT NOT NULL DEFAULT '',
--     PRIMARY KEY(mod_id, tag_name),
--     FOREIGN KEY(mod_id) REFERENCES mod(id) ON DELETE CASCADE
-- );

-- name: UpdateTagName :exec
UPDATE tag SET 
    tag_name = :updatedName
WHERE mod_id = :id AND tag_name = :oldName;


-- name: InsertTag :exec
INSERT OR IGNORE INTO tag(tag_name, mod_id) VALUES(:tagName, :modId);

-- name: DeleteTag :exec
DELETE FROM tag WHERE tag_name = :name AND mod_id = :modId;

-- name: SelectTagsByModId :many
SELECT * FROM tag WHERE mod_id = :modId;