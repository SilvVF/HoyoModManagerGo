package ios.silv.hoyomod

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.viewModels
import androidx.lifecycle.AbstractSavedStateViewModelFactory
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlin.coroutines.cancellation.CancellationException

fun <T> List<T>.filterIf(condition: Boolean, block: (T) -> Boolean): List<T> {
    return if (condition) {
        filter(block)
    } else {
        this
    }
}


@Suppress("UNCHECKED_CAST")
public inline fun <reified T : ViewModel> ComponentActivity.activityViewModel(
    defaultArgs: Bundle? = null,
    crossinline provider: (handle: SavedStateHandle) -> T,
): Lazy<T> {
    return viewModels<T>(
        factoryProducer = {
            object : AbstractSavedStateViewModelFactory(this, defaultArgs) {
                override fun <T : ViewModel> create(
                    key: String,
                    modelClass: Class<T>,
                    handle: SavedStateHandle,
                ): T = provider(handle) as T
            }
        }
    )
}

fun <T> Flow<T>.stateInUi(scope: CoroutineScope, initialValue: T) = stateIn(
    scope,
    SharingStarted.WhileSubscribed(5_000),
    initialValue
)

/**
 * Attempts [block], returning a successful [Result] if it succeeds, otherwise a [Result.Failure]
 * taking care not to break structured concurrency
 */
suspend fun <T> suspendRunCatching(block: suspend () -> T): Result<T> =
    try {
        Result.success(block())
    } catch (cancellationException: CancellationException) {
        throw cancellationException
    } catch (exception: Exception) {
        Result.failure(exception)
    }

@JvmName("mutate_Map")
fun <K, V> MutableStateFlow<Map<K, V>>.mutate(update: MutableMap<K, V>.() -> Unit) {
    return update { value ->
        value.toMutableMap().apply(update)
    }
}

class MutableStateFlowMap<K: Any, V: Any>(
    value: Map<K, V>
) : MutableStateFlow<Map<K, V>> by MutableStateFlow(value) {

    operator fun get(key: K): V? = this.value[key]

    operator fun set(key: K, value: V) {
        mutate {
            this[key] = value
        }
    }
}