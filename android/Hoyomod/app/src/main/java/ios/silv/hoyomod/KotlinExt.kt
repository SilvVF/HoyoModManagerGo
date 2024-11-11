package ios.silv.hoyomod

fun <T> List<T>.filterIf(condition: Boolean, block: (T) -> Boolean): List<T> {
    return if (condition) {
        filter(block)
    } else {
        this
    }
}