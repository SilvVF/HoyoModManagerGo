package ios.silv.hoyomod

import android.util.Log
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.LifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.SavedStateHandle
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.supervisorScope

//class  AutoRestartClient<T : HttpClientEngineConfig>(
//    private val engineFactory: HttpClientEngineFactory<T>,
//    private val block: HttpClientConfig<T>.() -> Unit = {}
//) {
//    private var internalClient: HttpClient? = null
//
//    private fun build() = HttpClient(engineFactory, block).also { internalClient = it }
//
//    val client
//        get() = synchronized(this) {
//            val client = internalClient
//            when {
//                client == null -> build()
//                !(client.engine.coroutineContext[Job]?.isActive ?: false) -> build()
//                else -> client
//            }
//                .also { internalClient = it }
//        }
//
//    fun close() {
//        internalClient?.close()
//        internalClient = null
//    }
//}
//
//class SyncClient(
//    savedStateHandle: SavedStateHandle
//): DefaultLifecycleObserver {
//
//    private val autoRestartClient = AutoRestartClient(CIO) { install(WebSockets) }
//
//    private val client by lazy { autoRestartClient.client }
//    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
//
//    var job: Job? = null
//
//    private var host by savedStateHandle.stored<String?>("host", null)
//    private var port by savedStateHandle.stored<Int?>("port", null)
//
//    private val sendChannel = Channel<ByteArray>()
//
//    override fun onStart(owner: LifecycleOwner) {
//        super.onStart(owner)
//        runCatching {
//            if (host != null && port != null) {
//                scope.launch { connect(host!!, port!!) }
//            }
//        }
//    }
//
//    override fun onStop(owner: LifecycleOwner) {
//        super.onStop(owner)
//        close()
//    }
//
//    suspend fun connect(host: String, port: Int) = client.webSocket(
//        host = host.also { this.host = it },
//        port = port.also { this.port = it },
//    ) {
//        job = scope.launch {
//            supervisorScope {
//
//                launch {
//                    sendChannel.receiveAsFlow()
//                        .collect {
//                            runCatching {
//                                send(Frame.Binary(true, it))
//                            }
//                        }
//                }
//
//                try {
//                    for (message in incoming) {
//                        when (message) {
//                            is Frame.Binary -> {
//
//                            }
//                            else -> Unit
//                        }
//                        ensureActive()
//                    }
//                } catch (e: CancellationException) {
//                    close(CloseReason(CloseReason.Codes.NORMAL, "Client closing connection"))
//                } catch (e: Exception) {
//                    closeExceptionally(e)
//                }
//            }
//        }
//    }
//
//    fun close() {
//        job?.cancel()
//        autoRestartClient.close()
//    }
//
//
//    companion object {
//        const val LOG_TAG = "SyncClient"
//    }
//}