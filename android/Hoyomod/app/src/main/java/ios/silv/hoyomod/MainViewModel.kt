package ios.silv.hoyomod

import android.content.SharedPreferences
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ios.silv.hoyomod.net.GET
import ios.silv.hoyomod.net.ModsWithTagsAndTextures
import ios.silv.hoyomod.net.POST
import ios.silv.hoyomod.net.await
import ios.silv.hoyomod.net.awaitSuccess
import ios.silv.hoyomod.net.parseAs
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.mapLatest
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.time.withTimeout
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okio.IOException
import java.time.LocalDateTime
import kotlin.time.Duration.Companion.seconds

class MainViewModel(
    savedStateHandle: SavedStateHandle,
    private val preferences: SharedPreferences
): ViewModel() {

    val jobs = mutableStateMapOf<Int, Job>()

    private val ipAddressFlow = preferences.changesAsFlow(PrefKeys.ADDR, "")
        .onStart { emit(preferences.get(PrefKeys.ADDR, "")) }
        .stateIn(
            viewModelScope,
            SharingStarted.Lazily,
            null
        )

    private val modsAvailable = preferences
        .changesAsFlow(PrefKeys.MODS_AVAILABLE, false)
        .onStart { emit(preferences.get(PrefKeys.MODS_AVAILABLE, false)) }

    val search = MutableSavedState(savedStateHandle, "search", "")

    private val _state: MutableStateFlow<State> = MutableStateFlow(State.Loading)
    val state: StateFlow<State> get() = _state

    private val dataFlow = ipAddressFlow.filterNotNull().mapLatest { addr ->
        runCatching {
            val resp = withContext(Dispatchers.IO) {
                App.client.GET("http://$addr$DATA_ROUTE")
                    .awaitSuccess()
                    .parseAs<List<ModsWithTagsAndTextures>>()
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
                modsAvailable,
                ::Triple
            ).collect { (data, query, hasMods) ->
                _state.update {
                    data?.fold(
                        onSuccess = {
                            State.Success(
                               data = it.mapValues { (_, mwt) ->
                                   mwt
                                       .filterIf(hasMods) { item -> item.modWithTags.isNotEmpty() }
                                       .filterIf(query.isNotBlank()) {item -> item.characters.name.contains(query, ignoreCase = true) }
                               },
                                modsAvailable = hasMods
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

    fun toggleHasModsFilter() {
        viewModelScope.launch {
            preferences.set(PrefKeys.MODS_AVAILABLE, !preferences.get(PrefKeys.MODS_AVAILABLE, false))
        }
    }

    fun toggleMod(game: Int, id: Int, enabled: Boolean) {
        viewModelScope.launch {
            runCatching {
                val addr = ipAddressFlow.value
                val res = withContext(Dispatchers.IO) {
                    App.client.POST(
                        "http://$addr$UPDATE_MOD",
                           body = TogglePostRequest(id, enabled)
                    )
                        .awaitSuccess()
                }
                if (res.isSuccessful) { refreshGame(game) }
            }
                .onFailure {
                    it.printStackTrace()
                }
        }
    }

    fun startGenerateJob(game: Int) {
        App.applicationScope.launch(Dispatchers.IO) {
            kotlin.runCatching {
                val addr = ipAddressFlow.value
                val res = App.client.POST(
                    "http://$addr/generate",
                    body = GeneratePostRequest(game)
                )
                    .awaitSuccess()
                    .parseAs<GenerateResponse>()
                jobs[res.jobId] = Job.Loading(res.jobId, game)

               runCatching {
                    withTimeout(45.seconds) {
                        pollJobStatus(res.jobId, game, App.client)
                    }
                }
                   .onSuccess { refreshGame(game) }
                   .onFailure {
                       jobs[res.jobId] = when {
                           it is TimeoutCancellationException -> Job.Complete(res.jobId, game, "polling timed out")
                           jobs[res.jobId] is Job.Loading -> Job.Complete(res.jobId, game, "unknown error")
                           else -> jobs[res.jobId] ?: return@launch
                       }
                   }
            }
        }
    }

    private tailrec suspend fun pollJobStatus(jobId: Int, game: Int, client: OkHttpClient) {
        val request = Request.Builder()
            .url("http://${ipAddressFlow.value}/poll-generation?jobId=$jobId")
            .build()
        val response = client.newCall(request).await()
        if (response.isSuccessful) {
            val status = response.parseAs<JobStatus>()
            if (status.isComplete) {
                jobs[jobId] = Job.Complete(jobId, game, status.error)
            } else {
                jobs[jobId] = Job.Loading(jobId, game)
                pollJobStatus(jobId, game, client)
            }
        } else if (response.code == 204) {
            jobs[jobId] = Job.Loading(jobId, game)
            pollJobStatus(jobId, game, client)
        }
    }


    private suspend fun refreshGame(game: Int) {
        runCatching {
            val addr = ipAddressFlow.value
            val res = withContext(Dispatchers.IO) {
                App.client.newCall(
                    Request.Builder()
                        .url("http://$addr${GAME_ROUTE(game)}")
                        .build()
                )
                    .awaitSuccess()
                    .parseAs<List<ModsWithTagsAndTextures.Data>>()
            }
            _state.update { state ->
                when(state) {
                    is State.Success -> state.copy(
                        data = buildMap {
                            putAll(state.data)
                            put(game, res)
                        }.mapValues { (_, mwt) ->
                            mwt
                                .filterIf(state.modsAvailable) { item -> item.modWithTags.isNotEmpty() }
                                .filterIf(search.value.isNotBlank()) { item ->
                                    item.characters.name.contains(search.value, ignoreCase = true)
                                }
                        }
                    )
                    else -> state
                }
            }
        }
            .onFailure { it.printStackTrace() }
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

    @Serializable
    data class JobStatus(
        val jobId: Int? = null,
        val status: String? = null,
        val completedAt: String? = null,
        val error: String? = null
    ) {
        val isComplete = status == "completed" || status == "failed"
    }

    @Serializable
    data class GeneratePostRequest(
        @SerialName("game")
        val game: Int
    )

    @Serializable
    data class GenerateResponse(
        @SerialName("job_id")
        val jobId: Int
    )

    sealed class  Job(open val id: Int, open val game: Int) {
        data class Complete(
            override val id: Int,
            override val game: Int,
            val error: String? = null,
        ): Job(id, game)
        data class Loading(
            override val id: Int,
            override val game: Int,
        ): Job(id, game)
    }


    sealed class State {
        data object Loading: State()
        data class Failure(val msg: String?): State()
        data class Success(
            val data: Map<Int, List<ModsWithTagsAndTextures.Data>>,
            val modsAvailable: Boolean,
        ): State()
    }

    companion object {
        private const val DATA_ROUTE = "/data"
        private val GAME_ROUTE = { game: Int -> "/data/$game" }
        private const val UPDATE_MOD = "/update/mod"
    }
}
