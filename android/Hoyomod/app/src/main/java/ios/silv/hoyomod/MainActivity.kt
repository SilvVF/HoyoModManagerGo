@file:OptIn(ExperimentalHazeMaterialsApi::class, ExperimentalMaterial3Api::class)

package ios.silv.hoyomod

import android.os.Bundle
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
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.calculateEndPadding
import androidx.compose.foundation.layout.calculateStartPadding
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.util.fastForEach
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import coil3.compose.AsyncImage
import coil3.request.ImageRequest
import coil3.request.crossfade
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.hazeEffect
import dev.chrisbanes.haze.hazeSource
import dev.chrisbanes.haze.materials.ExperimentalHazeMaterialsApi
import dev.chrisbanes.haze.materials.HazeMaterials
import ios.silv.hoyomod.MainViewModel.GenJob
import ios.silv.hoyomod.MainViewModel.ModsState
import ios.silv.hoyomod.lib.TextPagerIndicator
import ios.silv.hoyomod.lib.toStableFlow
import ios.silv.hoyomod.net.HmmApi
import ios.silv.hoyomod.net.ModsWithTagsAndTextures
import ios.silv.hoyomod.theme.MyApplicationTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private val viewmodel by viewModels<MainViewModel> {
        savedStateViewModelFactory<MainViewModel> { savedStateHandle ->
            MainViewModel(
                HmmApi(App.client, App.sharedPreferences),
                App.sharedPreferences,
                savedStateHandle,
            )
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val snackbarHostState = SnackbarHostState()

        lifecycleScope.launch {
            lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
                for (event in viewmodel.events) {
                    snackbarHostState.showSnackbar(
                        getString(R.string.error_occurred, event),
                        withDismissAction = true
                    )
                }
            }
        }

        setContent {
            CompositionLocalProvider(
                LocalSharedPreferences provides App.sharedPreferences
            ) {
                MyApplicationTheme {

                    val modsState by viewmodel.state.collectAsStateWithLifecycle()
                    val search by viewmodel.search.collectAsStateWithLifecycle()
                    val jobs by viewmodel.jobs.collectAsStateWithLifecycle()
                    val hazeState = remember { HazeState() }

                    var settingsVisible by rememberSaveable { mutableStateOf(false) }

                    if (settingsVisible) {
                        SettingsDialog(
                            onDismiss = { settingsVisible = !settingsVisible },
                            modifier = Modifier
                                .clip(MaterialTheme.shapes.medium)
                                .hazeEffect(
                                    state = hazeState,
                                    style = HazeMaterials.thin(MaterialTheme.colorScheme.surfaceContainer)
                                )
                        )
                    }

                    MainScreenContent(
                        modsState = modsState,
                        search = { search },
                        jobs = jobs,
                        snackbarHostState = snackbarHostState,
                        hazeState = hazeState,
                        actions = Actions(
                            startGenerateJob = { game ->
                                viewmodel.startGenerateJob(game)
                            },
                            restartJob = { job ->
                                viewmodel.confirmJob(job.id)
                                viewmodel.startGenerateJob(job.game)
                            },
                            confirmJob = { job ->
                                viewmodel.confirmJob(job.id)
                            },
                            refresh = {
                                viewmodel.refresh()
                            },
                            onSearchChange = { textFieldValue ->
                                viewmodel.search(textFieldValue)
                            },
                            onSettingsVisibilityChanged = { visible ->
                                settingsVisible = visible
                            },
                            toggleHasModsFilter = {
                                viewmodel.toggleHasModsFilter()
                            },
                            toggleMod = { game, id, enabled ->
                                viewmodel.toggleMod(game, id, enabled)
                            }
                        )
                    )
                }
            }
        }
    }
}

@Stable
@Immutable
data class Actions(
    val startGenerateJob: (game: Int) -> Unit = {},
    val restartJob: (GenJob) -> Unit = {},
    val confirmJob: (GenJob) -> Unit = {},
    val refresh: () -> Unit = {},
    val onSearchChange: (TextFieldValue) -> Unit = {},
    val onSettingsVisibilityChanged: (Boolean) -> Unit = {},
    val toggleHasModsFilter: () -> Unit = {},
    val toggleMod: (game: Int, id: Int, enabled: Boolean) -> Unit = { _, _, _ -> }
)

fun gameFromPage(page: Int): Int = page + 1

@Composable
fun MainScreenContent(
    modifier: Modifier = Modifier,
    modsState: ModsState,
    search: () -> TextFieldValue,
    jobs: Map<Int, GenJob>,
    hazeState: HazeState,
    snackbarHostState: SnackbarHostState,
    actions: Actions,
) {
    val context = LocalContext.current
    val tabs = remember {
        with(context) {
            mutableStateListOf(
                getString(R.string.genshin),
                getString(R.string.star_rail),
                getString(R.string.zenless),
                getString(R.string.wuthering_waves)
            )
        }
    }

    val pagerState = rememberPagerState { tabs.size }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { actions.startGenerateJob(gameFromPage(pagerState.currentPage)) },
                icon = {
                    Icon(imageVector = Icons.Filled.Refresh, null)
                },
                containerColor = Color.Transparent,
                text = {
                    Text(text = stringResource(R.string.generate))
                },
                elevation = FloatingActionButtonDefaults.elevation(0.dp, 0.dp, 0.dp, 0.dp),
                modifier = Modifier
                    .clip(
                        MaterialTheme.shapes.medium
                    )
                    .hazeSource(hazeState, 1f)
                    .hazeEffect(
                        state = hazeState,
                        style = HazeMaterials.thin(MaterialTheme.colorScheme.primary)
                    )
            )
        },
        snackbarHost = {
            StackingSnackBarHost(
                jobs,
                actions,
                snackbarHostState,
                hazeState,
            )
        },
        topBar = {
            TopAppBarPagerIndicator(
                pagerState,
                tabs,
                search,
                actions,
                Modifier
                    .hazeSource(hazeState, 1f)
                    .hazeEffect(
                        state = hazeState,
                        style = HazeMaterials.thin()
                    )
            )
        }
    ) { innerPadding ->
        PullToRefreshBox(
            isRefreshing = modsState is ModsState.Loading,
            onRefresh = { actions.refresh() },
        ) {
            HorizontalPager(
                state = pagerState,
                contentPadding = PaddingValues(
                    start = innerPadding.calculateStartPadding(LocalLayoutDirection.current),
                    end = innerPadding.calculateEndPadding(LocalLayoutDirection.current),
                    bottom = innerPadding.calculateBottomPadding()
                ),
                modifier = Modifier
                    .fillMaxSize()
                    .hazeSource(state = hazeState, 0f)
            ) { page ->
                when (modsState) {
                    is ModsState.Failure -> ErrorScreen(
                        onRetry = { actions.refresh() },
                        message = modsState.msg
                    )

                    ModsState.Loading -> LoadingScreen()
                    is ModsState.Success -> {
                        val data = modsState.data[gameFromPage(page)].orEmpty()
                        if (data.isEmpty()) {
                            EmptySuccessPage(
                                modsState,
                                search,
                                tabs,
                                page,
                                actions
                            )
                        } else {
                            ModDataSuccessContent(
                                data = data,
                                paddingValues = PaddingValues(
                                    innerPadding.calculateTopPadding(),
                                ),
                                onEnableMod = { id, enabled ->
                                    actions.toggleMod(gameFromPage(page), id, enabled)
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun EmptySuccessPage(
    modsState: ModsState.Success,
    query: () -> TextFieldValue,
    tabs: List<String>,
    page: Int,
    actions: Actions,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = stringResource(
                R.string.no_characters_found_for_game_query,
                tabs.getOrNull(page).orEmpty(),
                query().text
            ),
            textAlign = TextAlign.Center
        )
        if (modsState.modsAvailable) {
            Button(onClick = { actions.toggleHasModsFilter() }) {
                Text(text = stringResource(R.string.show_all_characters))
            }
        }
    }
}


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TopAppBarPagerIndicator(
    pagerState: PagerState,
    tabs: SnapshotStateList<String>,
    search: () -> TextFieldValue,
    actions: Actions,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    val modsAvailable by LocalSharedPreferences.collectPreferenceAsState(
        PrefKeys.MODS_AVAILABLE,
        false
    )
    Column(
        modifier
    ) {
        TopAppBar(
            title = { Text(stringResource(R.string.app_title)) },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = Color.Transparent
            ),
            actions = {
                Checkbox(
                    modsAvailable,
                    onCheckedChange = {
                        actions.toggleHasModsFilter()
                    },
                )
                IconButton(onClick = {
                    actions.onSettingsVisibilityChanged(true)
                }) {
                    Icon(
                        imageVector = Icons.Filled.Settings,
                        contentDescription = stringResource(R.string.settings)
                    )
                }
            }
        )
        Box(
            contentAlignment = Alignment.Center
        ) {
            Column {
                OutlinedTextField(
                    value = search(),
                    onValueChange = { actions.onSearchChange(it) },
                    singleLine = true,
                    placeholder = { Text(stringResource(R.string.search_placeholder)) },
                    trailingIcon = {
                        Icon(
                            imageVector = Icons.Filled.Search,
                            contentDescription = stringResource(R.string.search)
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

@Composable
fun StackingSnackBarHost(
    jobs: Map<Int, GenJob>,
    actions: Actions,
    snackbarHostState: SnackbarHostState,
    hazeState: HazeState,
    modifier: Modifier = Modifier
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        jobs.forEach { (_, job) ->
            Snackbar(
                modifier = Modifier.hazeEffect(
                    state = hazeState,
                    style = HazeMaterials.thin()
                ),
                dismissAction = {
                    JobDismissAction(job, actions)
                }
            ) {
                Text(
                    text = when (job) {
                        is GenJob.Complete -> if (job.error != null) {
                            stringResource(R.string.job_failed, job.id, job.error)
                        } else {
                            stringResource(R.string.job_completed, job.id)
                        }

                        is GenJob.Loading -> stringResource(R.string.job_loading, job.id)
                    }
                )
            }
        }
        SnackbarHost(
            snackbarHostState,
            modifier = Modifier.hazeEffect(
                state = hazeState,
                style = HazeMaterials.thin()
            ),
        )
    }
}

@Composable
fun JobDismissAction(
    job: GenJob,
    actions: Actions,
) {
    when (job) {
        is GenJob.Complete -> {
            if (job.error != null) {
                Row {
                    Button(
                        onClick = {
                            actions.restartJob(job)
                        }
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Refresh,
                            contentDescription = stringResource(R.string.refresh)
                        )
                    }
                    Button(onClick = { actions.confirmJob(job) }) {
                        Icon(
                            imageVector = Icons.Filled.Close,
                            contentDescription = stringResource(R.string.close)
                        )
                    }
                }
            } else {
                Button(onClick = { actions.confirmJob(job) }) {
                    Icon(
                        imageVector = Icons.Filled.Check,
                        contentDescription = stringResource(R.string.confirm)
                    )
                }
            }
        }

        is GenJob.Loading -> CircularProgressIndicator()
    }
}

@Composable
fun ModDataSuccessContent(
    data: List<ModsWithTagsAndTextures.Data>,
    onEnableMod: (id: Int, enabled: Boolean) -> Unit,
    paddingValues: PaddingValues,
) {
    val context = LocalContext.current
    LazyColumn(
        Modifier.fillMaxSize(),
    ) {
        item {
            Spacer(Modifier.height(paddingValues.calculateTopPadding()))
        }
        items(data, key = { it.characters.id }) { mwt ->
            ElevatedCard(
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
        item { Spacer(modifier = Modifier.height(64.dp)) }
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
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = stringResource(R.string.could_not_load_data, message ?: "Unknown Error"),
        )
        Button(onClick = onRetry) {
            Text(text = stringResource(R.string.retry))
        }
    }
}