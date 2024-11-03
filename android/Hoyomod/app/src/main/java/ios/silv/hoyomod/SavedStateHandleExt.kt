package ios.silv.hoyomod

import androidx.compose.runtime.MutableState
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.SavedStateViewModelFactory
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlin.reflect.KProperty

interface Stored<out T> {
    val value: T
}

@Suppress("NOTHING_TO_INLINE")
inline operator fun <T> Stored<T>.getValue(thisObj: Any?, property: KProperty<*>): T = value

interface MutableStored<T> : Stored<T> {
    override var value: T
    operator fun component1(): T
    operator fun component2(): (T) -> Unit
}

@Suppress("NOTHING_TO_INLINE")
inline operator fun <T> MutableStored<T>.setValue(thisObj: Any?, property: KProperty<*>, value: T) {
    this.value = value
}

inline fun <reified T> SavedStateHandle.stored(key: String, defaultValue: T) = object : MutableStored<T> {
    override var value: T
        get() { return this@stored.get<T>(key) ?: defaultValue }
        set(value) = this@stored.set(key, value)

    override fun component1(): T = value
    override fun component2(): (T) -> Unit = { v -> value = v }
}


inline fun <reified T : ViewModel> SavedStateViewModelFactory(
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

class MutableSavedState<T>(
    private val savedStateHandle: SavedStateHandle,
    private val key: String,
    defaultValue: T
){
    var state by mutableStateOf(savedStateHandle.get<T>(key) ?: defaultValue)
        private set

    var value: T
        get() = state
        set(value) {
           state = value
            savedStateHandle[key] = value
        }

    fun asFlow() = snapshotFlow { state }
}

class MutableSaveStateFlow<T>(
    private val savedStateHandle: SavedStateHandle,
    private val key: String,
    defaultValue: T
) {
    private val _state: MutableStateFlow<T> =
        MutableStateFlow(savedStateHandle.get<T>(key) ?: defaultValue)

    var value: T
        get() = _state.value
        set(value) {
            _state.value = value
            savedStateHandle[key] = value
        }

    fun asStateFlow(): StateFlow<T> = _state
}