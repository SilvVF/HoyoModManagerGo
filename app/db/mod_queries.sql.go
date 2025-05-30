// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.27.0
// source: mod_queries.sql

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

// mod(
//
//	id INTEGER PRIMARY KEY NOT NULL,
//	fname TEXT NOT NULL,
//	game INTEGER NOT NULL,
//	char_name TEXT NOT NULL,
//	char_id INTEGER NOT NULL,
//	selected BOOLEAN NOT NULL DEFAULT FALSE,
//	preview_images TEXT NOT NULL DEFAULT '',
//	gb_id INTEGER,
//	mod_link TEXT,
//	gb_file_name TEXT,
//	gb_download_link TEXT,
//	UNIQUE(fname, char_id, char_name),
//	FOREIGN KEY (char_id) REFERENCES character(id) ON DELETE CASCADE
//
// );
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

const selectModByFileCharacterGame = `-- name: SelectModByFileCharacterGame :one
SELECT id, fname, game, char_name, char_id, selected, preview_images, gb_id, mod_link, gb_file_name, gb_download_link FROM mod WHERE mod.fname = ?1 AND mod.game = ?2 AND mod.char_name = ?3
`

type SelectModByFileCharacterGameParams struct {
	Fname         string
	Game          int64
	CharacterName string
}

func (q *Queries) SelectModByFileCharacterGame(ctx context.Context, arg SelectModByFileCharacterGameParams) (Mod, error) {
	row := q.db.QueryRowContext(ctx, selectModByFileCharacterGame, arg.Fname, arg.Game, arg.CharacterName)
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

const selectModsByCharacterId = `-- name: SelectModsByCharacterId :many
SELECT id, fname, game, char_name, char_id, selected, preview_images, gb_id, mod_link, gb_file_name, gb_download_link FROM mod WHERE mod.char_id = ?1 AND mod.game = ?2
`

type SelectModsByCharacterIdParams struct {
	Name int64
	Game int64
}

func (q *Queries) SelectModsByCharacterId(ctx context.Context, arg SelectModsByCharacterIdParams) ([]Mod, error) {
	rows, err := q.db.QueryContext(ctx, selectModsByCharacterId, arg.Name, arg.Game)
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

const updateDisableAllModsByGame = `-- name: UpdateDisableAllModsByGame :exec
UPDATE mod SET 
    selected = FALSE
WHERE mod.game = ?
`

func (q *Queries) UpdateDisableAllModsByGame(ctx context.Context, game int64) error {
	_, err := q.db.ExecContext(ctx, updateDisableAllModsByGame, game)
	return err
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
