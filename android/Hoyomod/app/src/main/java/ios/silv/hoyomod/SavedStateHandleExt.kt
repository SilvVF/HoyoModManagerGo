package ios.silv.hoyomod

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.SavedStateViewModelFactory
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
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
    savedStateHandle: SavedStateHandle
) = object : ViewModelProvider.Factory {
    override fun <VM : ViewModel> create(modelClass: Class<VM>): VM {
        if (modelClass.isAssignableFrom(T::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return T::class.java.getConstructor(SavedStateHandle::class.java)
                .newInstance(savedStateHandle) as VM
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}