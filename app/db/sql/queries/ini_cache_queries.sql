
-- CREATE TABLE IF NOT EXISTS inicache (
--     mod_id INTEGER PRIMARY KEY NOT NULL,
--     fname TEXT NOT NULL,
--     FOREIGN KEY (mod_id) REFERENCES mod(id) ON DELETE CASCADE
-- );

-- name: SelectIniCacheByModId :one
SELECT * FROM inicache WHERE mod_id = :modId;

-- name: InsertOrUpdateEntry :exec
INSERT INTO inicache(mod_id, fname)
VALUES (:modId, :fName)
ON CONFLICT(mod_id) DO UPDATE SET
  fname = excluded.fname;