package ios.silv.hoyomod

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ios.silv.hoyomod.net.CharacterWithModsAndTags
import ios.silv.hoyomod.net.DataListResponse
import ios.silv.hoyomod.net.Game
import ios.silv.hoyomod.net.ServerConstants
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.mapLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.decodeFromStream
import okhttp3.Request

class MainViewModel(
    savedStateHandle: SavedStateHandle
): ViewModel() {

    private val ipAddressFlow = flowOf(kotlin.runCatching { "192.168.1.251" })
        .restartableStateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = NetUtils.getIpv4Addr()
        )

    private val search = MutableSaveStateFlow(savedStateHandle, "search", "")
    private val selectedTabIdx = MutableSaveStateFlow(savedStateHandle, "tab_idx", 0)
    val tabIdx: StateFlow<Int> get() = selectedTabIdx.asStateFlow()

    private val _state: MutableStateFlow<State> = MutableStateFlow(State.Loading)
    val state: StateFlow<State> get() = _state

    private val dataFlow = ipAddressFlow.mapLatest { result ->
        runCatching {
            val addr = result.getOrThrow()
            val data = withContext(Dispatchers.IO) {
                val res = App.client.newCall(
                    Request.Builder()
                        .url("http://192.168.1.251:6969/data")
                        .build()
                )
                    .execute()

                Json.decodeFromStream<DataListResponse>(res.body!!.byteStream())
            }
            data.associateBy(
                keySelector = { it.game },
                valueTransform = { it.data }
            )
        }.onFailure { it.printStackTrace() }
    }

    init {
        viewModelScope.launch {
            combine(
                dataFlow,
                search.asStateFlow(),
                selectedTabIdx.asStateFlow(),
               ::Triple
            ).collect { (data, query, tab) ->
                _state.update {
                    data.fold(
                        onSuccess = {
                            val list = it[tab + 1] ?: emptyList()
                            State.Success(
                                list.filter { (character) ->
                                    query.isBlank() || character.name.contains(query, ignoreCase = true)
                                }
                            )
                        },
                        onFailure = { State.Failure(it.localizedMessage) }
                    )
                }
            }
        }
    }

    fun updateCurrentTab(position: Int) {
        selectedTabIdx.value = position
    }

    fun search(text: String) {
        search.value = text
    }

    fun refresh() {
        ipAddressFlow.restart()
    }

    sealed class State() {
        data object Loading: State()
        data class Failure(val msg: String?): State()
        data class Success(
            val data: List<CharacterWithModsAndTags>
        ): State()
    }
}
