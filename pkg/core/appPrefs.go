package core

func AppPrefs(store PreferenceStore) []interface{} {
	return []interface{}{
		&DarkThemePref{
			Preference: store.GetString("darktheme", "system"),
		},
		&StartScreenPref{
			Preference: store.GetString("startscreen", "genshin"),
		},
	}
}

type DarkThemePref struct{ Preference[string] }

type StartScreenPref struct{ Preference[string] }
