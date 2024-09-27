package core

import "hmm/pkg/types"

type AppPrefs struct {
	DarkTheme              *DarkThemePref
	StartScreen            *StartScreenPref
	GenshinDirPref         *GenshinDirPref
	HonkaiDirPref          *HonkaiDirPref
	ZZZDirPref             *ZZZDirPref
	WuwaDirPref            *WuwaDirPref
	IgnoreDirPref          *IgnoreDirPref
	SortModPref            *SortModPref
	ModsAvailablePref      *ModsAvailablePref
	GenshinElementPref     *GenshinElementPref
	HonkaiElementPref      *HonkaiElementPref
	ZenlessElementPref     *ZenlessElementPref
	WuwaElementPref        *WuwaElementPref
	MaxDownloadWorkersPref *MaxDownloadWorkersPref
	PlaylistGamePref       *PlaylistGamePref
}

func NewAppPrefs(store PreferenceStore) *AppPrefs {
	return &AppPrefs{
		&DarkThemePref{
			Preference: store.GetString("darktheme", "system"),
		},
		&StartScreenPref{
			Preference: store.GetString("startscreen", "genshin"),
		},
		&GenshinDirPref{
			Preference: store.GetString("genshindir", ""),
		},
		&HonkaiDirPref{
			Preference: store.GetString("honkaidir", ""),
		},
		&ZZZDirPref{
			Preference: store.GetString("zzzdir", ""),
		},
		&WuwaDirPref{
			Preference: store.GetString("wuwadir", ""),
		},
		&IgnoreDirPref{
			Preference: store.GetStringSlice("ignoredirs", []string{}),
		},
		&SortModPref{
			Preference: store.GetString("sortModPref", ""),
		},
		&ModsAvailablePref{
			Preference: store.GetBoolean("modsAvailable", false),
		},
		&GenshinElementPref{
			Preference: store.GetStringSlice("genshinElementPref", []string{}),
		},
		&HonkaiElementPref{
			Preference: store.GetStringSlice("HonkaiElementPref", []string{}),
		},
		&ZenlessElementPref{
			Preference: store.GetStringSlice("ZenlessElementPref", []string{}),
		},

		&WuwaElementPref{
			Preference: store.GetStringSlice("WuwaElementPref", []string{}),
		},
		&MaxDownloadWorkersPref{
			Preference: store.GetInt("max_download_workers", 1),
		},
		&PlaylistGamePref{
			Preference: store.GetInt("playlist_game", types.Genshin),
		},
	}
}

type DarkThemePref struct{ Preference[string] }

type StartScreenPref struct{ Preference[string] }

type SortModPref struct{ Preference[string] }

type ModsAvailablePref struct{ Preference[bool] }

type MaxDownloadWorkersPref struct{ Preference[int] }

type GenshinElementPref struct{ Preference[[]string] }
type HonkaiElementPref struct{ Preference[[]string] }
type ZenlessElementPref struct{ Preference[[]string] }
type WuwaElementPref struct{ Preference[[]string] }

type HonkaiDirPref struct{ Preference[string] }
type GenshinDirPref struct{ Preference[string] }
type ZZZDirPref struct{ Preference[string] }
type WuwaDirPref struct{ Preference[string] }

type IgnoreDirPref struct{ Preference[[]string] }

type PlaylistGamePref struct{ Preference[int] }
