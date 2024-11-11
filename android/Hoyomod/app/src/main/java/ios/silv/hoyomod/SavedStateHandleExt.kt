package ios.silv.hoyomod

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

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