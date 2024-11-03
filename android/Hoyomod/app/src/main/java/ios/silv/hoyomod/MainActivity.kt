package ios.silv.hoyomod

import android.os.Bundle
import android.preference.PreferenceManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.basicMarquee
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.util.fastForEach
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import coil3.request.ImageRequest
import coil3.request.crossfade
import ios.silv.hoyomod.lib.TextPagerIndicator
import ios.silv.hoyomod.lib.rememberMutableStateListOf
import ios.silv.hoyomod.lib.toStableFlow
import ios.silv.hoyomod.net.ModsWithTagsAndTextures
import ios.silv.hoyomod.theme.MyApplicationTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private val mainViewmodel by viewModels<MainViewModel> {
        SavedStateViewModelFactory<MainViewModel> { savedStateHandle ->
            MainViewModel(
                savedStateHandle,
                applicationContext.getSharedPreferences(
                    PreferenceManager.getDefaultSharedPreferencesName(applicationContext),
                    0
                )
            )
        }
    }

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            MyApplicationTheme {
                val state by mainViewmodel.state.collectAsStateWithLifecycle()
                val scope = rememberCoroutineScope()
                val tabs = rememberMutableStateListOf {
                    listOf("Genshin", "Star Rail", "Zenless Zone Zero", "Wuthering Waves")
                }

                val pagerState = rememberPagerState { tabs.size }

                var settingsVisible by rememberSaveable { mutableStateOf(false) }

                if (settingsVisible) {
                    SettingsDialog {
                        settingsVisible = !settingsVisible
                    }
                }

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    topBar = {
                        Column {
                            TopAppBar(
                                title = { Text("HoyoModManager") },
                                actions = {
                                    IconButton(onClick = { settingsVisible = !settingsVisible }) {
                                        Icon(
                                            imageVector = Icons.Filled.Settings,
                                            contentDescription = "settings"
                                        )
                                    }
                                }
                            )
                            Box(
                                contentAlignment = Alignment.Center
                            ) {
                                Column {
                                    OutlinedTextField(
                                        value = mainViewmodel.search.state,
                                        onValueChange = mainViewmodel::search,
                                        singleLine = true,
                                        placeholder = { Text("Search...") },
                                        trailingIcon = {
                                            Icon(
                                                imageVector = Icons.Filled.Search,
                                                contentDescription = "search"
                                            )
                                        },
                                        shape = MaterialTheme.shapes.extraLarge,
                                        modifier = Modifier
                                            .padding(12.dp)
                                            .fillMaxWidth()
                                    )
                                    TextPagerIndicator(
                                        texts = tabs,
                                        offsetPercentWithSelectFlow = remember {
                                            snapshotFlow {
                                                pagerState.currentPageOffsetFraction
                                            }.toStableFlow()
                                        },
                                        selectIndexFlow = remember { snapshotFlow { pagerState.currentPage }.toStableFlow() },
                                        fontSize = 14.sp,
                                        selectFontSize = 16.sp,
                                        textColor = LocalContentColor.current,
                                        selectTextColor = MaterialTheme.colorScheme.primary,
                                        selectIndicatorColor = MaterialTheme.colorScheme.primary,
                                        onIndicatorClick = {
                                            scope.launch {
                                                pagerState.animateScrollToPage(it)
                                            }
                                        },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(48.dp),
                                        margin = 18.dp,
                                    )
                                }
                            }
                        }
                    }
                ) { innerPadding ->
                    PullToRefreshBox(
                        isRefreshing = state is MainViewModel.State.Loading,
                        onRefresh = { mainViewmodel.restart() }
                    ) {
                        HorizontalPager(
                            state = pagerState,
                            contentPadding = innerPadding,
                            modifier = Modifier.fillMaxSize()
                        ) {page ->
                            when (val s = state){
                                is MainViewModel.State.Failure -> ErrorScreen(
                                    onRetry = { mainViewmodel.restart() },
                                    message = s.msg
                                )
                                MainViewModel.State.Loading -> LoadingScreen()
                                is MainViewModel.State.Success ->  SuccessScreen(
                                    data =  s.data[page + 1].orEmpty(),
                                    onEnableMod = mainViewmodel::toggleMod
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SuccessScreen(
    data: List<ModsWithTagsAndTextures.Data>,
    onEnableMod: (id: Int, enabled: Boolean) -> Unit
) {
    val context = LocalContext.current
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(4.dp)
    ) {
        items(data, key = { it.characters.id }) {mwt ->
            ElevatedCard(
                onClick = { /*TODO*/ },
                modifier = Modifier
                    .padding(8.dp)
                    .fillMaxWidth()
            ) {
                Row(
                    Modifier.fillMaxWidth()
                ) {
                    AsyncImage(
                        model = ImageRequest.Builder(context)
                            .data(mwt.characters.avatarUrl)
                            .crossfade(true)
                            .build(),
                        contentDescription = null,
                        modifier = Modifier
                            .height(120.dp)
                            .aspectRatio(1f)
                            .clip(CircleShape),
                        contentScale = ContentScale.Fit
                    )
                    Column {
                        Text(
                            text = mwt.characters.name,
                            style = MaterialTheme.typography.titleLarge
                        )
                        mwt.modWithTags.fastForEach { mod ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.End
                            ) {
                                Text(
                                    text = mod.mod.filename,
                                    style = MaterialTheme.typography.labelMedium,
                                    modifier = Modifier
                                        .weight(1f)
                                        .basicMarquee()
                                )
                                Switch(
                                    checked = mod.mod.enabled,
                                    onCheckedChange = {
                                        onEnableMod(mod.mod.id, it)
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun LoadingScreen() {
    Box(modifier = Modifier.fillMaxSize()) {
        CircularProgressIndicator(Modifier.align(Alignment.Center))
    }
}

@Composable
fun ErrorScreen(
    onRetry: () -> Unit,
    message: String?,
) {
    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = message ?: "Unknown Error",
        )
        Button(onClick = onRetry) {
            Text(text = "Retry")
        }
    }
}