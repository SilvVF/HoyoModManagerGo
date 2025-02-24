package ios.silv.hoyomod

import android.content.SharedPreferences
import androidx.compose.ui.text.input.TextFieldValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ios.silv.hoyomod.net.HmmApi
import ios.silv.hoyomod.net.ModsWithTagsAndTextures
import kotlinx.coroutines.Job
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.produceIn
import kotlinx.coroutines.launch

private const val SEARCH_KEY = "search"
private const val JOBS_KEY = "jobs"

class MainViewModel(
    private val api: HmmApi,
    private val prefs: SharedPreferences,
    private val savedStateHandle: SavedStateHandle,
): ViewModel() {

    private var refreshJob: Job? = null

    private val _jobs = MutableStateFlowMap<Int, GenJob>(savedStateHandle[JOBS_KEY] ?: emptyMap())
    val jobs: StateFlow<Map<Int, GenJob>> get() = _jobs

    private val ipAddressFlow = prefs
        .changesAsFlow(PrefKeys.ADDR, "")
        .produceIn(viewModelScope)

    private val modsAvailable = prefs.changesAsFlow(PrefKeys.MODS_AVAILABLE, false)

    private val error = MutableStateFlow<Throwable?>(null)
    private val _search = MutableStateFlow(TextFieldValue(savedStateHandle[SEARCH_KEY] ?: ""))
    val search: StateFlow<TextFieldValue> get() = _search
    private val modsData = MutableStateFlowMap<Int, List<ModsWithTagsAndTextures.Data>>(emptyMap())

    private fun Map<Int, List<ModsWithTagsAndTextures.Data>>.applyFilters(available: Boolean, search: String) =
        mapValues { (_, modList) ->
            modList.filterIf(available) { item ->
                item.modWithTags.isNotEmpty()
            }.filterIf(search.isNotBlank()) { item ->
                item.characters.name.contains(search, ignoreCase = true)
            }
        }

    val state = combine(
        modsData.asStateFlow(),
        _search.map { it.text },
        error.asStateFlow(),
        modsAvailable
    ) { mods, search, err, available ->
        if (err != null && mods.isEmpty()) {
            ModsState.Failure(err.localizedMessage ?: "Unknown error occurred")
        } else {
            ModsState.Success(available, mods.applyFilters(available, search))
        }
    }
        .stateInUi(viewModelScope, ModsState.Loading)

    init {
        viewModelScope.launch {
            for (ip in ipAddressFlow) {
                refresh()
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            refreshJob?.cancelAndJoin()
            refreshJob = launch {
                refreshData()
            }
        }
    }

    private suspend fun refreshData() {
        api.data().onSuccess { modData ->
            val modsByGame = modData.associateBy(
                keySelector = { it.game },
                valueTransform = { it.data }
            )
            modsData.mutate {
                clear()
                putAll(modsByGame)
            }
        }
            .onFailure { exception ->
                modsData.mutate { clear() }
                error.emit(exception)
            }
    }


    fun search(text: TextFieldValue) {
        _search.value = text
    }

    fun toggleHasModsFilter() {
        viewModelScope.launch {
            prefs.set(
                PrefKeys.MODS_AVAILABLE,
                !prefs.get(PrefKeys.MODS_AVAILABLE, false)
            )
        }
    }

    fun toggleMod(game: Int, id: Int, enabled: Boolean) {
        viewModelScope.launch {
            api.toggleMod(id, enabled).onSuccess {
                refreshGame(game)
            }.onFailure {

            }
        }
    }

    private suspend fun startPollingJob(jobId: Int, game: Int) {
        api.pollJobStatus(jobId, game) { status ->
            _jobs[jobId] = if (status.isComplete) {
                GenJob.Loading(jobId, game)
            } else {
                GenJob.Complete(jobId, game, status.error)
            }
        }
            .onSuccess { refreshGame(game) }
            .onFailure { e ->
                _jobs[jobId] = GenJob.Complete(
                    jobId, game,
                    error = when {
                        e is TimeoutCancellationException -> "polling timed out"
                        else -> e.message
                    }
                )
            }
    }

    fun confirmJob(jobId: Int) {
        _jobs.mutate { remove(jobId) }
    }

    fun startGenerateJob(game: Int) {
        viewModelScope.launch {
            api.startGenerationJob(game)
                .onSuccess { (jobId) ->
                    startPollingJob(jobId, game)
                }
        }
    }


    private suspend fun refreshGame(game: Int) {
        api.gameData(game).onSuccess { gameData ->
            modsData.mutate {
                this[game] = gameData
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        refreshJob?.cancel()
        savedStateHandle[SEARCH_KEY] = _search.value
        savedStateHandle[JOBS_KEY] = _jobs.value
    }

    sealed class  GenJob(open val id: Int, open val game: Int) {
        data class Complete(
            override val id: Int,
            override val game: Int,
            val error: String? = null,
        ): GenJob(id, game)
        data class Loading(
            override val id: Int,
            override val game: Int,
        ): GenJob(id, game)
    }


    sealed class ModsState(
        open val modsAvailable: Boolean = false,
    ) {
        data object Loading: ModsState()
        data class Failure(
            val msg: String?,
        ): ModsState(false)
        data class Success(
            override val modsAvailable: Boolean,
            val data: Map<Int, List<ModsWithTagsAndTextures.Data>>,
        ): ModsState(modsAvailable)
    }
}
