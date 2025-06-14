-- character(
--     id INTEGER NOT NULL,
--     game INTEGER NOT NULL,
--     name TEXT NOT NULL,
--     avatar_url TEXT NOT NULL DEFAULT '',
--     element TEXT NOT NULL,
--     flags INT NOT NULL DEFAULT 0,
--     PRIMARY KEY(id, game)
-- );

-- name: SelectCharacterById :one
SELECT * FROM character WHERE id = :id AND game = :game LIMIT 1;

-- name: SelectClosestCharacter :one
SELECT * FROM character WHERE LOWER(name) LIKE '%' || LOWER(:name) || '%' AND game = :game LIMIT 1;

-- name: SelectCharactersByGame :many
SELECT * FROM character WHERE game = :game;

-- name: SelectCharactersWithModsAndTags :many
SELECT 
    c.*,
    m.*,
    t.*,
    tex.*
FROM character c
LEFT JOIN mod m ON (
    m.char_id = c.id AND m.game = c.game
) 
LEFT JOIN tag t ON t.mod_id = m.id
LEFT JOIN texture tex ON tex.mod_id = m.id
WHERE c.game = :game 
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


-- name: DeleteCharacterById :exec
DELETE FROM character 
WHERE id = :id;