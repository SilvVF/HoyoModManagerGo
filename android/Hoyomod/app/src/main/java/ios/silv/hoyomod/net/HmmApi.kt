package ios.silv.hoyomod.net

import android.content.SharedPreferences
import ios.silv.hoyomod.App
import ios.silv.hoyomod.PrefKeys
import ios.silv.hoyomod.get
import ios.silv.hoyomod.suspendRunCatching
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import okhttp3.OkHttpClient
import okhttp3.Request
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.Duration.Companion.seconds

class HmmApi(
    private val client: OkHttpClient,
    private val prefs: SharedPreferences,
) {
    private suspend fun getAddr() = prefs.get(PrefKeys.ADDR, "").also {
        if (it.isBlank()) error("address needs to be set")
    }

    suspend fun data(): Result<List<ModsWithTagsAndTextures>> = withContext(Dispatchers.IO) {
        suspendRunCatching {
            App.client.GET("http://${getAddr()}$DATA_ROUTE")
                .awaitSuccess()
                .parseAs<List<ModsWithTagsAndTextures>>()
        }
    }

    suspend fun gameData(game: Int) = withContext(Dispatchers.IO) {
        suspendRunCatching {
            assert(game in arrayOf(1, 2, 3, 4))
            App.client.newCall(
                Request.Builder()
                    .url("http://${getAddr()}${GAME_ROUTE(game)}")
                    .build()
            )
                .awaitSuccess()
                .parseAs<List<ModsWithTagsAndTextures.Data>>()
        }
    }

    suspend fun toggleMod(id: Int, enabled: Boolean): Result<Unit> = withContext(Dispatchers.IO) {
        suspendRunCatching<Unit> {
            App.client.POST(
                "http://${getAddr()}$UPDATE_MOD",
                TogglePostRequest(id, enabled)
            )
                .awaitSuccess()
        }
    }

    suspend fun startGenerationJob(game: Int): Result<GenerateResponse> = withContext(Dispatchers.IO) {
        suspendRunCatching {
            assert(game in arrayOf(1, 2, 3, 4))
            App.client.POST(
                "http://${getAddr()}/generate",
                body = GeneratePostRequest(game)
            )
                .awaitSuccess()
                .parseAs<GenerateResponse>()
        }
    }

    suspend fun pollUntilSuccess(
        jobId: Int,
        onStatus: (JobStatus) -> Unit = {},
    ): Result<JobStatus> = withContext(Dispatchers.IO) {
        runCatching {
            val request = Request.Builder()
                .url("http://${getAddr()}/poll-generation?jobId=$jobId")
                .build()

            var lastStatus: JobStatus?
            var endMillis = 0L

            withTimeout(30.seconds) {
                do {
                    val elapsed =  (System.currentTimeMillis() - endMillis).milliseconds
                    val delay = 5.seconds.inWholeMilliseconds - elapsed.inWholeMilliseconds
                    if (delay.seconds.isPositive()) {
                        delay(delay)
                    }

                    ensureActive()
                    val response = client
                        .newCall(request)
                        .await()

                    lastStatus = runCatching { response.parseAs<JobStatus>() }
                        .onSuccess { onStatus(it) }
                        .getOrNull()

                    endMillis = System.currentTimeMillis()
                } while(response.code == 204 || !lastStatus!!.isComplete)
            }
            lastStatus!!
        }
    }

    companion object {
        private const val DATA_ROUTE = "/data"
        private val GAME_ROUTE = { game: Int -> "/data/$game" }
        private const val UPDATE_MOD = "/update/mod"
    }
}