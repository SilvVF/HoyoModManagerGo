package ios.silv.hoyomod

import android.content.SharedPreferences
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ios.silv.hoyomod.net.ModsWithTagsAndTextures
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.mapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.decodeFromStream
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

class MainViewModel(
    savedStateHandle: SavedStateHandle,
    preferences: SharedPreferences
): ViewModel() {

    private val ipAddressFlow = callbackFlow {
        send(preferences.getString("addr_pref", "192.168.1.251:6969").orEmpty())
        val listener = SharedPreferences.OnSharedPreferenceChangeListener { prefs, key ->
            if (key == "addr_pref") {
                prefs.getString(key, null)?.let {
                    trySend(it)
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
        .stateIn(
            viewModelScope,
            SharingStarted.Lazily,
            preferences.getString("addr_pref", "192.168.1.251:6969").orEmpty()
        )

    val search = MutableSavedState(savedStateHandle, "search", "")

    private val _state: MutableStateFlow<State> = MutableStateFlow(State.Loading)
    val state: StateFlow<State> get() = _state

    private val dataFlow = ipAddressFlow.mapLatest { addr ->
        runCatching {
            val resp = withContext(Dispatchers.IO) {
                val res = App.client.newCall(
                    Request.Builder()
                        .url("http://$addr/data")
                        .build()
                )
                    .execute()

                Json.decodeFromStream<List<ModsWithTagsAndTextures>>(res.body!!.byteStream())
            }
            resp.associateBy(
                keySelector = { it.game },
                valueTransform = { it.data }
            )
        }.onFailure { it.printStackTrace() }
    }
        .restartableStateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5_000L),
            null
        )

    init {
        viewModelScope.launch {
            combine(
                dataFlow,
                search.asFlow(),
                ::Pair
            ).collect { (data, query) ->
                _state.update {
                    data?.fold(
                        onSuccess = {
                            State.Success(
                               data = it.mapValues { (_, mwt) ->
                                   if (query.isBlank()) {
                                       mwt
                                   } else {
                                       mwt.filter { item -> item.characters.name.contains(query, true) }
                                   }
                               }
                            )
                        },
                        onFailure = { State.Failure(it.localizedMessage) }
                    ) ?: State.Loading
                }
            }
        }
    }

    fun search(text: String) {
        search.value = text
    }

    fun toggleMod(id: Int, enabled: Boolean) {
        viewModelScope.launch {
            runCatching {
                val addr = ipAddressFlow.value
                val res = withContext(Dispatchers.IO) {
                    App.client.newCall(
                        Request.Builder()
                            .url("http://$addr/update/mod")
                            .post(
                                body = Json.encodeToString(
                                    TogglePostRequest(id, enabled)
                                ).toRequestBody("application/json".toMediaType())
                            )
                            .build()
                    )
                        .execute()
                }
                if (res.isSuccessful) { dataFlow.refresh() }
            }
                .onFailure {
                    it.printStackTrace()
                }
        }
    }

    fun restart() {
        dataFlow.restart()
    }

    @Serializable
    data class TogglePostRequest(
        @SerialName("mod_id")
        val id:      Int,
        @SerialName("enabled")
        val enabled: Boolean,
    )


    sealed class State {
        data object Loading: State()
        data class Failure(val msg: String?): State()
        data class Success(
            val data: Map<Int, List<ModsWithTagsAndTextures.Data>>
        ): State()
    }
}
