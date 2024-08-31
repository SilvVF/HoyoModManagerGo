package core

type AppPrefs struct {
	DarkTheme      *DarkThemePref
	StartScreen    *StartScreenPref
	GenshinDirPref *GenshinDirPref
	HonkaiDirPref  *HonkaiDirPref
	ZZZDirPref     *ZZZDirPref
	WuwaDirPref    *WuwaDirPref
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
	}
}

type DarkThemePref struct{ Preference[string] }

type StartScreenPref struct{ Preference[string] }

type HonkaiDirPref struct{ Preference[string] }
type GenshinDirPref struct{ Preference[string] }
type ZZZDirPref struct{ Preference[string] }
type WuwaDirPref struct{ Preference[string] }
