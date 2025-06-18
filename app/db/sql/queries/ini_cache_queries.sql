
-- CREATE TABLE IF NOT EXISTS inicache (
--     id INTEGER NOT NULL,
--     mod_id INTEGER NOT NULL,
--     fname TEXT NOT NULL,
--     FOREIGN KEY (mod_id) REFERENCES mod(id) ON DELETE CASCADE,
--     CREATE INDEX 
-- )

-- name: SelectIniCacheByModId :one
SELECT * FROM inicache WHERE mod_id = :modId;

-- name: InsertOrUpdateEntry :exec
INSERT INTO inicache(mod_id, fname)
VALUES (:modId, :fName)
ON CONFLICT(mod_id) DO UPDATE SET
  mod_id = excluded.mod_id,
  fname = excluded.fname;