package dbh

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"hmm/db"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"hmm/pkg/util"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/pressly/goose/v3"
)

const (
	CHAR_FLAG_IS_CUSTOM = 1 << 0
)

type DbHelper struct {
	queries         *db.Queries
	ctx             context.Context
	db              db.DBTX
	withTransaction func(func(*db.Queries) error) error
	ModDao
	TagDao
	TextureDao
	CharacterDao
}

func BackupDatabase() error {
	dbFile := util.GetDbFile()
	currentTime := time.Now()
	backupFileName := strings.ReplaceAll(currentTime.Format("2006-01-02 15:04:05"), " ", "_")
	backupFileName = strings.ReplaceAll(backupFileName, ":", "-")

	db, err := os.Open(dbFile)
	if err != nil {
		return err
	}
	defer db.Close()

	backupDir := filepath.Join(util.GetCacheDir(), "backup")
	os.MkdirAll(backupDir, os.ModePerm)
	backup, err := os.Create(filepath.Join(backupDir, backupFileName+".db"))
	if err != nil {
		return err
	}
	defer backup.Close()

	_, err = io.Copy(db, backup)
	return err
}

func InitDbAndRunMigrations(ctx context.Context, migrations embed.FS, ddl string) (*db.Queries, *sql.DB) {
	dbfile := util.GetDbFile()
	os.MkdirAll(filepath.Dir(dbfile), os.ModePerm)

	util.CreateFileIfNotExists(dbfile)

	dbSql, err := sql.Open("sqlite3", dbfile)
	if err != nil {
		panic(err)
	}
	// create tables
	if _, err := dbSql.ExecContext(ctx, ddl); err != nil {
		panic(err)
	}

	goose.SetBaseFS(migrations)

	if err := goose.SetDialect(string(goose.DialectSQLite3)); err != nil {
		log.LogError(err.Error())
	}

	if err := goose.Up(dbSql, "db/migrations"); err != nil {
		log.LogError(err.Error())
	}

	queries := db.New(dbSql)

	return queries, dbSql
}

func NewDbHelper(queries *db.Queries, dbsql *sql.DB) *DbHelper {

	ctx := context.Background()

	withTransaction := func(transact func(qtx *db.Queries) error) error {
		tx, err := dbsql.Begin()
		if err != nil {
			return err
		}
		defer tx.Rollback()

		qtx := queries.WithTx(tx)

		if err := transact(qtx); err != nil {
			return err
		}

		return tx.Commit()
	}

	return &DbHelper{
		ctx:             ctx,
		queries:         queries,
		db:              dbsql,
		withTransaction: withTransaction,
	}
}

func (d *DbHelper) DeleteTextureById(textureId int) error {
	return d.withTransaction(func(q *db.Queries) error {
		dbTexture, err := q.SelectTextureById(d.ctx, int64(textureId))
		if err != nil {
			log.LogError(err.Error())
			return err
		}
		texture := textureFromDb(dbTexture)

		dbMod, err := q.SelectModById(d.ctx, int64(texture.ModId))
		if err != nil {
			log.LogError(err.Error())
			return err
		}
		mod := modFromDb(dbMod)

		path := filepath.Join(util.GetModDir(mod), "textures", texture.Filename)
		if err = os.RemoveAll(path); err != nil {
			log.LogError(err.Error())
			return err
		}

		return q.DeleteTextureById(d.ctx, int64(textureId))
	})
}

func (d *DbHelper) DeleteModById(modId int) error {
	return d.withTransaction(func(q *db.Queries) error {
		dbMod, err := q.SelectModById(d.ctx, int64(modId))
		if err != nil {
			log.LogPrint(err.Error())
			return err
		}
		mod := modFromDb(dbMod)

		path := filepath.Join(util.GetCharacterDir(mod.Character, mod.Game), mod.Filename)
		log.LogPrint(path)
		if err = os.RemoveAll(path); err != nil {
			return err
		}

		return q.DeleteModById(d.ctx, int64(modId))
	})
}

func (h *DbHelper) DeleteCharacter(name string, id int64, game types.Game) error {

	dir := util.GetCharacterDir(name, game)

	if err := os.RemoveAll(dir); err != nil {
		return err
	}

	return h.deleteCharacterById(id)
}

func (h *DbHelper) CreateCustomCharacter(name, img, element string, game types.Game) error {

	if err := os.MkdirAll(util.GetCharacterDir(name, game), os.ModePerm); err != nil {
		return err
	}

	return h.UpsertCharacter(
		types.Character{
			Id:        util.HashForName(name),
			Game:      game,
			Name:      name,
			AvatarUrl: img,
			Element:   element,
			Custom:    true,
		},
	)
}

func (h *DbHelper) RenameTexture(id int, name string) error {
	texture, err := h.SelectTextureById(id)
	if err != nil {
		return err
	}
	mod, err := h.SelectModById(texture.ModId)
	if err != nil {
		return err
	}

	currDir := filepath.Join(util.GetModDir(mod), "textures", texture.Filename)
	newDir := filepath.Join(filepath.Dir(currDir), name)
	err = os.Rename(currDir, newDir)
	if err != nil {
		return err
	}

	return err
}

func (h *DbHelper) RenameMod(id int64, name string) error {
	dbmod, err := h.queries.SelectModById(h.ctx, id)
	if err != nil {
		return err
	}
	mod := modFromDb(dbmod)
	currDir := util.GetModDir(mod)
	newDir := filepath.Join(filepath.Dir(currDir), name)
	err = os.Rename(currDir, newDir)
	if err != nil {
		return err
	}
	query := fmt.Sprintf("UPDATE mod SET fname = '%s' WHERE id = %d;", name, id)
	log.LogDebug(query)
	_, err = h.db.ExecContext(h.ctx, query)
	return err
}
