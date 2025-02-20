// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.27.0
// source: query.sql

package db

import (
	"context"
	"database/sql"
	"strings"
)

const deleteModById = `-- name: DeleteModById :exec
DELETE FROM mod WHERE mod.id = ?1
`

func (q *Queries) DeleteModById(ctx context.Context, id int64) error {
	_, err := q.db.ExecContext(ctx, deleteModById, id)
	return err
}

const deleteTextureById = `-- name: DeleteTextureById :exec
DELETE FROM texture WHERE texture.id = ?1
`

func (q *Queries) DeleteTextureById(ctx context.Context, id int64) error {
	_, err := q.db.ExecContext(ctx, deleteTextureById, id)
	return err
}

const deleteUnusedMods = `-- name: DeleteUnusedMods :exec
DELETE FROM mod WHERE fname NOT IN /*SLICE:files*/? AND game = ?2
`

type DeleteUnusedModsParams struct {
	Files []string
	Game  int64
}

func (q *Queries) DeleteUnusedMods(ctx context.Context, arg DeleteUnusedModsParams) error {
	query := deleteUnusedMods
	var queryParams []interface{}
	if len(arg.Files) > 0 {
		for _, v := range arg.Files {
			queryParams = append(queryParams, v)
		}
		query = strings.Replace(query, "/*SLICE:files*/?", strings.Repeat(",?", len(arg.Files))[1:], 1)
	} else {
		query = strings.Replace(query, "/*SLICE:files*/?", "NULL", 1)
	}
	queryParams = append(queryParams, arg.Game)
	_, err := q.db.ExecContext(ctx, query, queryParams...)
	return err
}

const disableAllModsByGame = `-- name: DisableAllModsByGame :exec
UPDATE mod SET 
    selected = FALSE
WHERE mod.game = ?
`

func (q *Queries) DisableAllModsByGame(ctx context.Context, game int64) error {
	_, err := q.db.ExecContext(ctx, disableAllModsByGame, game)
	return err
}

const insertMod = `-- name: InsertMod :one
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
    ?1,
    ?2,
    ?3,
    ?4,
    ?5,
    ?6,
    ?7,
    ?8,
    ?9,
    ?10
)
ON CONFLICT(fname, char_id, char_name) DO NOTHING
RETURNING id
`

type InsertModParams struct {
	ModFilename    string
	Game           int64
	CharName       string
	CharId         int64
	Selected       bool
	PreviewImages  string
	GbId           sql.NullInt64
	ModLink        sql.NullString
	GbFilename     sql.NullString
	GbDownloadLink sql.NullString
}

func (q *Queries) InsertMod(ctx context.Context, arg InsertModParams) (int64, error) {
	row := q.db.QueryRowContext(ctx, insertMod,
		arg.ModFilename,
		arg.Game,
		arg.CharName,
		arg.CharId,
		arg.Selected,
		arg.PreviewImages,
		arg.GbId,
		arg.ModLink,
		arg.GbFilename,
		arg.GbDownloadLink,
	)
	var id int64
	err := row.Scan(&id)
	return id, err
}

const insertPlayListModCrossRef = `-- name: InsertPlayListModCrossRef :exec
INSERT INTO playlist_mod_cross_ref (
    playlist_id,
    mod_id
) VALUES (
    ?1,
    ?2
)
`

type InsertPlayListModCrossRefParams struct {
	PlaylistId int64
	ModId      int64
}

func (q *Queries) InsertPlayListModCrossRef(ctx context.Context, arg InsertPlayListModCrossRefParams) error {
	_, err := q.db.ExecContext(ctx, insertPlayListModCrossRef, arg.PlaylistId, arg.ModId)
	return err
}

const insertPlaylist = `-- name: InsertPlaylist :one
INSERT INTO playlist(
    playlist_name,
    game
) VALUES (
    ?1,
    ?2
)
RETURNING id
`

type InsertPlaylistParams struct {
	PlaylistName string
	Game         int64
}

func (q *Queries) InsertPlaylist(ctx context.Context, arg InsertPlaylistParams) (int64, error) {
	row := q.db.QueryRowContext(ctx, insertPlaylist, arg.PlaylistName, arg.Game)
	var id int64
	err := row.Scan(&id)
	return id, err
}

const insertTexture = `-- name: InsertTexture :one
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
    ?1,
    ?2,
    ?3,
    ?4,
    ?5,
    ?6,
    ?7,
    ?8
)
ON CONFLICT(fname, mod_id) DO NOTHING
RETURNING id
`

type InsertTextureParams struct {
	ModId          int64
	ModFilename    string
	Selected       bool
	PreviewImages  string
	GbId           sql.NullInt64
	ModLink        sql.NullString
	GbFilename     sql.NullString
	GbDownloadLink sql.NullString
}

func (q *Queries) InsertTexture(ctx context.Context, arg InsertTextureParams) (int64, error) {
	row := q.db.QueryRowContext(ctx, insertTexture,
		arg.ModId,
		arg.ModFilename,
		arg.Selected,
		arg.PreviewImages,
		arg.GbId,
		arg.ModLink,
		arg.GbFilename,
		arg.GbDownloadLink,
	)
	var id int64
	err := row.Scan(&id)
	return id, err
}

const selectAllTexturesByModIds = `-- name: SelectAllTexturesByModIds :many
SELECT id, mod_id, fname, selected, preview_images, gb_id, mod_link, gb_file_name, gb_download_link FROM texture WHERE mod_id IN /*SLICE:ids*/?
`

func (q *Queries) SelectAllTexturesByModIds(ctx context.Context, ids []int64) ([]Texture, error) {
	query := selectAllTexturesByModIds
	var queryParams []interface{}
	if len(ids) > 0 {
		for _, v := range ids {
			queryParams = append(queryParams, v)
		}
		query = strings.Replace(query, "/*SLICE:ids*/?", strings.Repeat(",?", len(ids))[1:], 1)
	} else {
		query = strings.Replace(query, "/*SLICE:ids*/?", "NULL", 1)
	}
	rows, err := q.db.QueryContext(ctx, query, queryParams...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Texture
	for rows.Next() {
		var i Texture
		if err := rows.Scan(
			&i.ID,
			&i.ModID,
			&i.Fname,
			&i.Selected,
			&i.PreviewImages,
			&i.GbID,
			&i.ModLink,
			&i.GbFileName,
			&i.GbDownloadLink,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const selectCharacterById = `-- name: SelectCharacterById :one
SELECT id, game, name, avatar_url, element FROM character WHERE id = ?1 AND game = ?2 LIMIT 1
`

type SelectCharacterByIdParams struct {
	ID   int64
	Game int64
}

func (q *Queries) SelectCharacterById(ctx context.Context, arg SelectCharacterByIdParams) (Character, error) {
	row := q.db.QueryRowContext(ctx, selectCharacterById, arg.ID, arg.Game)
	var i Character
	err := row.Scan(
		&i.ID,
		&i.Game,
		&i.Name,
		&i.AvatarUrl,
		&i.Element,
	)
	return i, err
}

const selectCharactersByGame = `-- name: SelectCharactersByGame :many
SELECT id, game, name, avatar_url, element FROM character WHERE game = ?1
`

func (q *Queries) SelectCharactersByGame(ctx context.Context, game int64) ([]Character, error) {
	rows, err := q.db.QueryContext(ctx, selectCharactersByGame, game)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Character
	for rows.Next() {
		var i Character
		if err := rows.Scan(
			&i.ID,
			&i.Game,
			&i.Name,
			&i.AvatarUrl,
			&i.Element,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const selectCharactersWithModsAndTags = `-- name: SelectCharactersWithModsAndTags :many
SELECT 
    c.id, c.game, c.name, c.avatar_url, c.element,
    m.id, m.fname, m.game, m.char_name, m.char_id, m.selected, m.preview_images, m.gb_id, m.mod_link, m.gb_file_name, m.gb_download_link,
    t.mod_id, t.tag_name,
    tex.id, tex.mod_id, tex.fname, tex.selected, tex.preview_images, tex.gb_id, tex.mod_link, tex.gb_file_name, tex.gb_download_link
FROM 
    character c
    LEFT JOIN mod m 
        ON m.char_id = c.id
    LEFT JOIN tag t 
        ON t.mod_id = m.id
    LEFT JOIN texture tex 
        ON tex.mod_id = m.id
WHERE 
    c.game = ?1 
    AND (
        (
            m.fname LIKE '%' || ?2 || '%'
            OR c.name LIKE '%' || ?3 || '%'
            OR t.tag_name LIKE '%' || ?4 || '%'
        ) OR (
            ?2 IS NULL 
            AND ?3 IS NULL 
            AND ?4 IS NULL 
        )
    )
ORDER BY 
    c.name, m.fname, t.tag_name, tex.id
`

type SelectCharactersWithModsAndTagsParams struct {
	Game          int64
	ModFileName   sql.NullString
	CharacterName sql.NullString
	TagName       sql.NullString
}

type SelectCharactersWithModsAndTagsRow struct {
	ID               int64
	Game             int64
	Name             string
	AvatarUrl        string
	Element          string
	ID_2             sql.NullInt64
	Fname            sql.NullString
	Game_2           sql.NullInt64
	CharName         sql.NullString
	CharID           sql.NullInt64
	Selected         sql.NullBool
	PreviewImages    sql.NullString
	GbID             sql.NullInt64
	ModLink          sql.NullString
	GbFileName       sql.NullString
	GbDownloadLink   sql.NullString
	ModID            sql.NullInt64
	TagName          sql.NullString
	ID_3             sql.NullInt64
	ModID_2          sql.NullInt64
	Fname_2          sql.NullString
	Selected_2       sql.NullBool
	PreviewImages_2  sql.NullString
	GbID_2           sql.NullInt64
	ModLink_2        sql.NullString
	GbFileName_2     sql.NullString
	GbDownloadLink_2 sql.NullString
}

func (q *Queries) SelectCharactersWithModsAndTags(ctx context.Context, arg SelectCharactersWithModsAndTagsParams) ([]SelectCharactersWithModsAndTagsRow, error) {
	rows, err := q.db.QueryContext(ctx, selectCharactersWithModsAndTags,
		arg.Game,
		arg.ModFileName,
		arg.CharacterName,
		arg.TagName,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []SelectCharactersWithModsAndTagsRow
	for rows.Next() {
		var i SelectCharactersWithModsAndTagsRow
		if err := rows.Scan(
			&i.ID,
			&i.Game,
			&i.Name,
			&i.AvatarUrl,
			&i.Element,
			&i.ID_2,
			&i.Fname,
			&i.Game_2,
			&i.CharName,
			&i.CharID,
			&i.Selected,
			&i.PreviewImages,
			&i.GbID,
			&i.ModLink,
			&i.GbFileName,
			&i.GbDownloadLink,
			&i.ModID,
			&i.TagName,
			&i.ID_3,
			&i.ModID_2,
			&i.Fname_2,
			&i.Selected_2,
			&i.PreviewImages_2,
			&i.GbID_2,
			&i.ModLink_2,
			&i.GbFileName_2,
			&i.GbDownloadLink_2,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const selectClosestCharacter = `-- name: SelectClosestCharacter :one
SELECT id, game, name, avatar_url, element FROM character WHERE LOWER(name) LIKE '%' || LOWER(?1) || '%' AND game = ?2 LIMIT 1
`

type SelectClosestCharacterParams struct {
	Name string
	Game int64
}

func (q *Queries) SelectClosestCharacter(ctx context.Context, arg SelectClosestCharacterParams) (Character, error) {
	row := q.db.QueryRowContext(ctx, selectClosestCharacter, arg.Name, arg.Game)
	var i Character
	err := row.Scan(
		&i.ID,
		&i.Game,
		&i.Name,
		&i.AvatarUrl,
		&i.Element,
	)
	return i, err
}

const selectClosestCharacterMatch = `-- name: SelectClosestCharacterMatch :one
SELECT id, game, name, avatar_url, element FROM character WHERE LOWER(name) LIKE '%' || LOWER(?1) || '%' AND game = ?2 LIMIT 1
`

type SelectClosestCharacterMatchParams struct {
	Name string
	Game int64
}

func (q *Queries) SelectClosestCharacterMatch(ctx context.Context, arg SelectClosestCharacterMatchParams) (Character, error) {
	row := q.db.QueryRowContext(ctx, selectClosestCharacterMatch, arg.Name, arg.Game)
	var i Character
	err := row.Scan(
		&i.ID,
		&i.Game,
		&i.Name,
		&i.AvatarUrl,
		&i.Element,
	)
	return i, err
}

const selectEnabledModsForGame = `-- name: SelectEnabledModsForGame :many
SELECT id, fname, game, char_name, char_id, selected, preview_images, gb_id, mod_link, gb_file_name, gb_download_link FROM mod WHERE selected AND game = ?1
`

func (q *Queries) SelectEnabledModsForGame(ctx context.Context, game int64) ([]Mod, error) {
	rows, err := q.db.QueryContext(ctx, selectEnabledModsForGame, game)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Mod
	for rows.Next() {
		var i Mod
		if err := rows.Scan(
			&i.ID,
			&i.Fname,
			&i.Game,
			&i.CharName,
			&i.CharID,
			&i.Selected,
			&i.PreviewImages,
			&i.GbID,
			&i.ModLink,
			&i.GbFileName,
			&i.GbDownloadLink,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const selectEnabledTexturesByModId = `-- name: SelectEnabledTexturesByModId :many
SELECT id, mod_id, fname, selected, preview_images, gb_id, mod_link, gb_file_name, gb_download_link FROM texture WHERE mod_id = ?1 AND selected
`

func (q *Queries) SelectEnabledTexturesByModId(ctx context.Context, modid int64) ([]Texture, error) {
	rows, err := q.db.QueryContext(ctx, selectEnabledTexturesByModId, modid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Texture
	for rows.Next() {
		var i Texture
		if err := rows.Scan(
			&i.ID,
			&i.ModID,
			&i.Fname,
			&i.Selected,
			&i.PreviewImages,
			&i.GbID,
			&i.ModLink,
			&i.GbFileName,
			&i.GbDownloadLink,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const selectModByCharAndGame = `-- name: SelectModByCharAndGame :one
SELECT id, fname, game, char_name, char_id, selected, preview_images, gb_id, mod_link, gb_file_name, gb_download_link FROM mod WHERE mod.fname = ?1 AND mod.game = ?2 AND mod.char_name = ?3
`

type SelectModByCharAndGameParams struct {
	Fname         string
	Game          int64
	CharacterName string
}

func (q *Queries) SelectModByCharAndGame(ctx context.Context, arg SelectModByCharAndGameParams) (Mod, error) {
	row := q.db.QueryRowContext(ctx, selectModByCharAndGame, arg.Fname, arg.Game, arg.CharacterName)
	var i Mod
	err := row.Scan(
		&i.ID,
		&i.Fname,
		&i.Game,
		&i.CharName,
		&i.CharID,
		&i.Selected,
		&i.PreviewImages,
		&i.GbID,
		&i.ModLink,
		&i.GbFileName,
		&i.GbDownloadLink,
	)
	return i, err
}

const selectModById = `-- name: SelectModById :one
SELECT id, fname, game, char_name, char_id, selected, preview_images, gb_id, mod_link, gb_file_name, gb_download_link FROM mod WHERE mod.id = ?1 LIMIT 1
`

func (q *Queries) SelectModById(ctx context.Context, id int64) (Mod, error) {
	row := q.db.QueryRowContext(ctx, selectModById, id)
	var i Mod
	err := row.Scan(
		&i.ID,
		&i.Fname,
		&i.Game,
		&i.CharName,
		&i.CharID,
		&i.Selected,
		&i.PreviewImages,
		&i.GbID,
		&i.ModLink,
		&i.GbFileName,
		&i.GbDownloadLink,
	)
	return i, err
}

const selectModsByCharacterName = `-- name: SelectModsByCharacterName :many
SELECT id, fname, game, char_name, char_id, selected, preview_images, gb_id, mod_link, gb_file_name, gb_download_link FROM mod WHERE mod.char_name = ?1 AND mod.game = ?2
`

type SelectModsByCharacterNameParams struct {
	Name string
	Game int64
}

func (q *Queries) SelectModsByCharacterName(ctx context.Context, arg SelectModsByCharacterNameParams) ([]Mod, error) {
	rows, err := q.db.QueryContext(ctx, selectModsByCharacterName, arg.Name, arg.Game)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Mod
	for rows.Next() {
		var i Mod
		if err := rows.Scan(
			&i.ID,
			&i.Fname,
			&i.Game,
			&i.CharName,
			&i.CharID,
			&i.Selected,
			&i.PreviewImages,
			&i.GbID,
			&i.ModLink,
			&i.GbFileName,
			&i.GbDownloadLink,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const selectModsByGbId = `-- name: SelectModsByGbId :many
SELECT id, fname, game, char_name, char_id, selected, preview_images, gb_id, mod_link, gb_file_name, gb_download_link FROM mod WHERE mod.gb_id = ?1
`

func (q *Queries) SelectModsByGbId(ctx context.Context, gbid sql.NullInt64) ([]Mod, error) {
	rows, err := q.db.QueryContext(ctx, selectModsByGbId, gbid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Mod
	for rows.Next() {
		var i Mod
		if err := rows.Scan(
			&i.ID,
			&i.Fname,
			&i.Game,
			&i.CharName,
			&i.CharID,
			&i.Selected,
			&i.PreviewImages,
			&i.GbID,
			&i.ModLink,
			&i.GbFileName,
			&i.GbDownloadLink,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const selectPlaylistWithModsAndTags = `-- name: SelectPlaylistWithModsAndTags :many
SELECT 
    p.id, p.playlist_name, p.game,
    m.id, m.fname, m.game, m.char_name, m.char_id, m.selected, m.preview_images, m.gb_id, m.mod_link, m.gb_file_name, m.gb_download_link,
    t.mod_id, t.tag_name
FROM 
    playlist p
JOIN 
    playlist_mod_cross_ref pmcr ON p.id = pmcr.playlist_id
JOIN 
    mod m ON pmcr.mod_id = m.id
LEFT JOIN 
    tag t ON m.id = t.mod_id
WHERE p.game = ?1
ORDER BY m.char_name, m.fname
`

type SelectPlaylistWithModsAndTagsRow struct {
	ID             int64
	PlaylistName   string
	Game           int64
	ID_2           int64
	Fname          string
	Game_2         int64
	CharName       string
	CharID         int64
	Selected       bool
	PreviewImages  string
	GbID           sql.NullInt64
	ModLink        sql.NullString
	GbFileName     sql.NullString
	GbDownloadLink sql.NullString
	ModID          sql.NullInt64
	TagName        sql.NullString
}

func (q *Queries) SelectPlaylistWithModsAndTags(ctx context.Context, game int64) ([]SelectPlaylistWithModsAndTagsRow, error) {
	rows, err := q.db.QueryContext(ctx, selectPlaylistWithModsAndTags, game)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []SelectPlaylistWithModsAndTagsRow
	for rows.Next() {
		var i SelectPlaylistWithModsAndTagsRow
		if err := rows.Scan(
			&i.ID,
			&i.PlaylistName,
			&i.Game,
			&i.ID_2,
			&i.Fname,
			&i.Game_2,
			&i.CharName,
			&i.CharID,
			&i.Selected,
			&i.PreviewImages,
			&i.GbID,
			&i.ModLink,
			&i.GbFileName,
			&i.GbDownloadLink,
			&i.ModID,
			&i.TagName,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const selectTextureById = `-- name: SelectTextureById :one
SELECT id, mod_id, fname, selected, preview_images, gb_id, mod_link, gb_file_name, gb_download_link FROM texture WHERE texture.id = ?1 LIMIT 1
`

func (q *Queries) SelectTextureById(ctx context.Context, id int64) (Texture, error) {
	row := q.db.QueryRowContext(ctx, selectTextureById, id)
	var i Texture
	err := row.Scan(
		&i.ID,
		&i.ModID,
		&i.Fname,
		&i.Selected,
		&i.PreviewImages,
		&i.GbID,
		&i.ModLink,
		&i.GbFileName,
		&i.GbDownloadLink,
	)
	return i, err
}

const selectTexturesByModId = `-- name: SelectTexturesByModId :many
SELECT id, mod_id, fname, selected, preview_images, gb_id, mod_link, gb_file_name, gb_download_link FROM texture WHERE mod_id = ?1
`

func (q *Queries) SelectTexturesByModId(ctx context.Context, modid int64) ([]Texture, error) {
	rows, err := q.db.QueryContext(ctx, selectTexturesByModId, modid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Texture
	for rows.Next() {
		var i Texture
		if err := rows.Scan(
			&i.ID,
			&i.ModID,
			&i.Fname,
			&i.Selected,
			&i.PreviewImages,
			&i.GbID,
			&i.ModLink,
			&i.GbFileName,
			&i.GbDownloadLink,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const updateModEnabledById = `-- name: UpdateModEnabledById :exec
UPDATE mod SET
    selected = ?1
WHERE mod.id = ?2
`

type UpdateModEnabledByIdParams struct {
	Selected bool
	ID       int64
}

func (q *Queries) UpdateModEnabledById(ctx context.Context, arg UpdateModEnabledByIdParams) error {
	_, err := q.db.ExecContext(ctx, updateModEnabledById, arg.Selected, arg.ID)
	return err
}

const updateModGbFilename = `-- name: UpdateModGbFilename :exec
UPDATE mod SET
    gb_file_name = ?1
WHERE mod.id = ?2
`

type UpdateModGbFilenameParams struct {
	GbFilename sql.NullString
	ID         int64
}

func (q *Queries) UpdateModGbFilename(ctx context.Context, arg UpdateModGbFilenameParams) error {
	_, err := q.db.ExecContext(ctx, updateModGbFilename, arg.GbFilename, arg.ID)
	return err
}

const updateModGbId = `-- name: UpdateModGbId :exec
UPDATE mod SET
    gb_id = ?1
WHERE mod.id = ?2
`

type UpdateModGbIdParams struct {
	GbId sql.NullInt64
	ID   int64
}

func (q *Queries) UpdateModGbId(ctx context.Context, arg UpdateModGbIdParams) error {
	_, err := q.db.ExecContext(ctx, updateModGbId, arg.GbId, arg.ID)
	return err
}

const updateModImages = `-- name: UpdateModImages :exec
UPDATE mod SET
    preview_images = ?1
WHERE mod.id = ?2
`

type UpdateModImagesParams struct {
	PreviewImages string
	ID            int64
}

func (q *Queries) UpdateModImages(ctx context.Context, arg UpdateModImagesParams) error {
	_, err := q.db.ExecContext(ctx, updateModImages, arg.PreviewImages, arg.ID)
	return err
}

const updateModsEnabledFromSlice = `-- name: UpdateModsEnabledFromSlice :exec
UPDATE mod SET 
    selected = CASE WHEN mod.id IN (/*SLICE:enabled*/?)
        THEN TRUE
        ELSE FALSE
    END
WHERE mod.game = ?
`

type UpdateModsEnabledFromSliceParams struct {
	Enabled []int64
	Game    int64
}

func (q *Queries) UpdateModsEnabledFromSlice(ctx context.Context, arg UpdateModsEnabledFromSliceParams) error {
	query := updateModsEnabledFromSlice
	var queryParams []interface{}
	if len(arg.Enabled) > 0 {
		for _, v := range arg.Enabled {
			queryParams = append(queryParams, v)
		}
		query = strings.Replace(query, "/*SLICE:enabled*/?", strings.Repeat(",?", len(arg.Enabled))[1:], 1)
	} else {
		query = strings.Replace(query, "/*SLICE:enabled*/?", "NULL", 1)
	}
	queryParams = append(queryParams, arg.Game)
	_, err := q.db.ExecContext(ctx, query, queryParams...)
	return err
}

const updatePlayist = `-- name: UpdatePlayist :exec
UPDATE playlist SET
    playlist_name = ?1
WHERE playlist.id = ?2
`

type UpdatePlayistParams struct {
	PlaylistName string
	ID           int64
}

func (q *Queries) UpdatePlayist(ctx context.Context, arg UpdatePlayistParams) error {
	_, err := q.db.ExecContext(ctx, updatePlayist, arg.PlaylistName, arg.ID)
	return err
}

const updateTextureEnabledById = `-- name: UpdateTextureEnabledById :exec
UPDATE texture SET
    selected = ?1
WHERE texture.id = ?2
`

type UpdateTextureEnabledByIdParams struct {
	Selected bool
	ID       int64
}

func (q *Queries) UpdateTextureEnabledById(ctx context.Context, arg UpdateTextureEnabledByIdParams) error {
	_, err := q.db.ExecContext(ctx, updateTextureEnabledById, arg.Selected, arg.ID)
	return err
}
