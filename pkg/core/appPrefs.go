package core

func AppPrefs(store PreferenceStore) []interface{} {
	return []interface{}{
		&DarkThemePref{
			Preference: store.GetBoolean("darktheme", false),
		},
		&StartScreenPref{
			Preference: store.GetString("startscreen", "genshin"),
		},
	}
}

type DarkThemePref struct{ Preference[bool] }

type StartScreenPref struct{ Preference[string] }
