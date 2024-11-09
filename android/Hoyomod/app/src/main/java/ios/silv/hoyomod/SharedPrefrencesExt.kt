package ios.silv.hoyomod

import android.content.SharedPreferences
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocal
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.core.content.edit
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.trySendBlocking
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext

object PrefKeys {
    const val THEME = "theme_pref"
    const val THEME_MODE = "theme_mode_pref"
    const val DYNAMIC_COLOR = "dynamic_color_pref"
    const val ADDR = "addr_pref"
    const val USERNAME = "username_pref"
    const val PASSWORD = "password_pref"
    const val MODS_AVAILABLE = "mods_available_pref"
}

suspend inline fun <reified T> SharedPreferences.set(key: String, value: T): Boolean {
    return runCatching {
        withContext(Dispatchers.IO) {
            edit(commit = true) {
                when(T::class) {
                    String::class -> putString(key, value as String)
                    Long::class -> putLong(key, value as Long)
                    Int::class -> putInt(key, value as Int)
                    Boolean::class -> putBoolean(key, value as Boolean)
                    else -> error("Incompatible type")
                }
            }
        }
    }.onFailure { it.printStackTrace() }.isSuccess
}

suspend inline fun <reified T> SharedPreferences.get(key: String, default: T): T {
    return runCatching {
        withContext(Dispatchers.IO) {
            when(T::class) {
                String::class -> getString(key, default as String)
                Long::class -> getLong(key, default as Long)
                Int::class -> getInt(key, default as Int)
                Boolean::class -> getBoolean(key, default as Boolean)
                else -> error("Incompatible type")
            } as T
        }
    }
        .onFailure { it.printStackTrace() }
        .getOrDefault(default)
}

inline fun <reified T> SharedPreferences.changesAsFlow(watchKey: String, default: T) = callbackFlow {
    val listener = SharedPreferences.OnSharedPreferenceChangeListener { prefs, key ->
        if (key == watchKey) {
            runBlocking {
                prefs.get<T>(watchKey, default)?.let {
                    send(it)
                }
            }
        }
    }
    try {
        registerOnSharedPreferenceChangeListener(listener)
        awaitCancellation()
    } finally {
        unregisterOnSharedPreferenceChangeListener(listener)
    }
}

@Composable
inline fun <reified T> CompositionLocal<SharedPreferences>.collectPreferenceAsState(key: String, default: T): State<T> {

    val lifecycle = LocalLifecycleOwner.current
    val preferences = this.current

    return produceState(initialValue = default) {
        value = preferences.get(key, default)
        lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            callbackFlow {
                val listener =
                    SharedPreferences.OnSharedPreferenceChangeListener { prefs, prefKey ->
                        if (prefKey == key) {
                            runBlocking {
                                send(prefs.get<T>(prefKey, default))
                            }
                        }
                    }
                try {
                    preferences.registerOnSharedPreferenceChangeListener(listener)
                    awaitCancellation()
                } finally {
                    preferences.unregisterOnSharedPreferenceChangeListener(listener)
                }
            }
                .flowOn(Dispatchers.IO)
                .collect { value = it }
        }
    }
}