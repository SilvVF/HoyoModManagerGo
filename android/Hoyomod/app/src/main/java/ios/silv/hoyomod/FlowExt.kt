package ios.silv.hoyomod

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharingCommand
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.merge
import kotlinx.coroutines.flow.stateIn

// RestartableStateFlow that allows you to re-run the execution
interface RestartableStateFlow<out T> : StateFlow<T> {
    /*** restart the flow and reset the replay cache*/
    fun restart()
    /*** restart the flow keeping the replay cache*/
    fun refresh()
}

interface SharingRestartable : SharingStarted {
    fun restart()
    fun refresh()
}

// impementation of the sharing restartable
private data class SharingRestartableImpl(
    private val sharingStarted: SharingStarted,
) : SharingRestartable {

    private val restartFlow = MutableSharedFlow<SharingCommand>(extraBufferCapacity = 2)

    // combine the commands from the restartFlow and the subscriptionCount
    override fun command(subscriptionCount: StateFlow<Int>): Flow<SharingCommand> {
        return merge(restartFlow, sharingStarted.command(subscriptionCount))
    }

    // stop and reset the replay cache and restart
    override fun refresh() {
        restartFlow.tryEmit(SharingCommand.STOP)
        restartFlow.tryEmit(SharingCommand.START)
    }

    // stop and reset the replay cache and restart
    override fun restart() {
        restartFlow.tryEmit(SharingCommand.STOP_AND_RESET_REPLAY_CACHE)
        restartFlow.tryEmit(SharingCommand.START)
    }
}

// create a hot flow, which is restartable by manually from a cold flow
fun <T> Flow<T>.restartableStateIn(
    scope: CoroutineScope,
    started: SharingStarted,
    initialValue: T
): RestartableStateFlow<T> {
    val sharingRestartable = SharingRestartableImpl(started)
    val stateFlow = stateIn(scope, sharingRestartable, initialValue)
    return object : RestartableStateFlow<T>, StateFlow<T> by stateFlow {
        override fun refresh() = sharingRestartable.refresh()
        override fun restart() = sharingRestartable.restart()
    }
}