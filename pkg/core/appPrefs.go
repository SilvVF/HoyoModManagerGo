package core

import (
	"hmm/pkg/pref"
	"hmm/pkg/types"
)

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
	DiscoverGamePref       *DiscoverGamePref
	ServerPortPref         *ServerPortPref
	ServerAuthTypePref     *ServerAuthTypePref
	ServerUsernamePref     *ServerUsernamePref
	ServerPasswordPref     *ServerPasswordPref
	SpaceSaverPref         *SpaceSaverPref
}

func NewAppPrefs(store pref.PreferenceStore) *AppPrefs {
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
			Preference: store.GetInt("playlist_game", int(types.Genshin)),
		},
		&DiscoverGamePref{
			Preference: store.GetString("discovergamepref", ""),
		},
		&ServerPortPref{
			Preference: store.GetInt("server_port", 6969),
		},
		&ServerAuthTypePref{
			Preference: store.GetInt("server_auth_type", int(types.AUTH_BASIC)),
		},
		&ServerUsernamePref{
			Preference: store.GetString("server_username", "username"),
		},
		&ServerPasswordPref{
			Preference: store.GetString("server_password", "password"),
		},
		&SpaceSaverPref{
			Preference: store.GetBoolean("space_saver", false),
		},
	}
}

type DarkThemePref struct{ pref.Preference[string] }

type StartScreenPref struct{ pref.Preference[string] }

type SortModPref struct{ pref.Preference[string] }

type ModsAvailablePref struct{ pref.Preference[bool] }

type MaxDownloadWorkersPref struct{ pref.Preference[int] }

type GenshinElementPref struct{ pref.Preference[[]string] }
type HonkaiElementPref struct{ pref.Preference[[]string] }
type ZenlessElementPref struct{ pref.Preference[[]string] }
type WuwaElementPref struct{ pref.Preference[[]string] }

type HonkaiDirPref struct{ pref.Preference[string] }
type GenshinDirPref struct{ pref.Preference[string] }
type ZZZDirPref struct{ pref.Preference[string] }
type WuwaDirPref struct{ pref.Preference[string] }

type IgnoreDirPref struct{ pref.Preference[[]string] }

type PlaylistGamePref struct{ pref.Preference[int] }
type DiscoverGamePref struct{ pref.Preference[string] }

type ServerPortPref struct{ pref.Preference[int] }
type ServerUsernamePref struct{ pref.Preference[string] }
type ServerPasswordPref struct{ pref.Preference[string] }
type ServerAuthTypePref struct{ pref.Preference[int] }

type SpaceSaverPref struct{ pref.Preference[bool] }
