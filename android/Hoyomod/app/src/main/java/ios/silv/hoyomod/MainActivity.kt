package ios.silv.hoyomod

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.lifecycle.viewModelScope
import ios.silv.hoyomod.databinding.ActivityMainBinding
import ios.silv.hoyomod.response.Character
import ios.silv.hoyomod.response.CharacterWithModsAndTags
import ios.silv.hoyomod.response.DataListResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.mapLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.decodeFromStream
import okhttp3.Request
import okhttp3.internal.http.HttpMethod

object ServerConstants {
    val FULL_DATA = "/data"
    fun GAME_DATA(game: Int) = "/data/$game"
}

typealias Game = Int

class MainViewmodel(
    savedStateHandle: SavedStateHandle
): ViewModel() {

    private val ipAddressFlow = flowOf(NetUtils.getIpv4Addr())
        .restartableStateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = NetUtils.getIpv4Addr()
        )

    private val search = MutableSaveStateFlow(savedStateHandle, "search", "")

    private val _state: MutableStateFlow<State> = MutableStateFlow(State.Loading)
    val state: StateFlow<State> get() = _state

    init {
        viewModelScope.launch {
            ipAddressFlow.mapLatest { result ->
                runCatching {
                    val addr = result.getOrThrow()
                    val data = withContext(Dispatchers.IO) {
                        val res = App.client.newCall(
                            Request.Builder()
                                .url("http://$addr${ServerConstants.FULL_DATA}")
                                .build()
                        )
                            .execute()

                        Json.decodeFromStream<DataListResponse>(res.body!!.byteStream())
                    }
                    data.associateBy(
                        keySelector = { it.game },
                        valueTransform = { it.data }
                    )
                }
            }.combine(search.asStateFlow(), ::Pair).collect { (data, search) ->
               _state.update {
                   data.fold(
                       onSuccess = {
                           State.Success(
                               it.mapValues { (_, v) ->
                                   v.filter { (character) ->
                                       character.name.contains(search, ignoreCase = true)
                                   }
                               }
                           )
                       },
                       onFailure = { State.Failure(it.localizedMessage) }
                   )
               }
            }
        }
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
            val data: Map<Game, List<CharacterWithModsAndTags>>
        ): State()
    }
}

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    private val mainViewmodel by viewModels<MainViewmodel> {
        SavedStateViewModelFactory<MainViewmodel>(SavedStateHandle())
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        enableEdgeToEdge()
        setContentView(binding.root)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                mainViewmodel.state.collect {
                    // Update UI elements
                }
            }
        }
    }
}