package ios.silv.hoyomod

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
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

inline fun <reified T : ViewModel> savedStateViewModelFactory(
    crossinline create: (SavedStateHandle) -> T
) = object : ViewModelProvider.Factory {
    override fun <VM : ViewModel> create(modelClass: Class<VM>): VM {
        if (modelClass.isAssignableFrom(T::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return create(SavedStateHandle()) as VM
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
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