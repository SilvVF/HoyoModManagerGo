package dbh

import (
	"hmm/db"
	"hmm/pkg/log"
	"hmm/pkg/types"
	"sort"
	"strings"
)

type PlaylistDao interface {
	SelectPlaylistWithModsAndTags(game types.Game) ([]types.PlaylistWithModsAndTags, error)
	DeletePlaylistById(id int64) error
}

var _ PlaylistDao = (*DbHelper)(nil)

func (h *DbHelper) DeletePlaylistById(id int64) error {
	return h.queries.DeletePlaylistById(h.ctx, id)
}

func (h *DbHelper) UpdatePlaylistName(id int64, name string) error {
	return h.queries.UpdatePlaylistName(h.ctx, db.UpdatePlaylistNameParams{
		ID:   id,
		Name: name,
	})
}

func (h *DbHelper) CreatePlaylist(game types.Game, name string) error {
	return h.withTransaction(func(q *db.Queries) error {
		pid, err := q.InsertPlaylist(h.ctx, db.InsertPlaylistParams{PlaylistName: name, Game: int64(game)})
		if err != nil {
			return err
		}
		enabled, err := q.SelectEnabledModsForGame(h.ctx, int64(game))
		if err != nil {
			return err
		}

		for _, mod := range enabled {
			q.InsertPlayListModCrossRef(h.ctx, db.InsertPlayListModCrossRefParams{
				PlaylistId: pid,
				ModId:      mod.ID,
			})
		}

		return nil
	})
}

func (h *DbHelper) SelectPlaylistWithModsAndTags(game types.Game) ([]types.PlaylistWithModsAndTags, error) {
	res, err := h.queries.SelectPlaylistWithModsAndTags(h.ctx, game.Int64())
	if err != nil {
		log.LogError(err.Error())
		return make([]types.PlaylistWithModsAndTags, 0), err
	}

	var playlistMap = map[types.Playlist][]types.ModWithTags{}

	for _, item := range res {
		playlist := types.Playlist{
			Id:   int(item.ID),
			Game: types.Game(item.Game),
			Name: item.PlaylistName,
		}

		if _, ok := playlistMap[playlist]; !ok {
			playlistMap[playlist] = []types.ModWithTags{}
		}

		playlistMap[playlist] = append(playlistMap[playlist], types.ModWithTags{
			Mod: types.Mod{
				Filename:       item.Fname,
				Game:           types.Game(item.Game),
				Character:      item.CharName,
				CharacterId:    int(item.CharID),
				Enabled:        item.Selected,
				PreviewImages:  strings.Split(item.PreviewImages, "<seperator>"),
				GbId:           int(item.GbID.Int64),
				ModLink:        item.ModLink.String,
				GbFileName:     item.GbFileName.String,
				GbDownloadLink: item.GbDownloadLink.String,
				Id:             int(item.ID_2),
			},
			Tags: make([]types.Tag, 0),
		})

		if item.TagName.Valid && item.ModID.Valid {
			for _, modWithTags := range playlistMap[playlist] {
				modWithTags.Tags = append(modWithTags.Tags, types.Tag{
					Name:  item.TagName.String,
					ModId: int(item.ModID.Int64),
				})
			}
		}
	}

	keys := make([]types.Playlist, 0, len(playlistMap))

	for k := range playlistMap {
		keys = append(keys, k)
	}

	sort.Slice(keys, func(i, j int) bool {
		return keys[i].Name < keys[j].Name
	})

	lst := make([]types.PlaylistWithModsAndTags, 0, len(playlistMap))

	for _, key := range keys {
		v := playlistMap[key]
		cwmt := types.PlaylistWithModsAndTags{
			Playlist:     key,
			ModsWithTags: v,
		}

		lst = append(lst, cwmt)
	}

	return lst, nil
}
