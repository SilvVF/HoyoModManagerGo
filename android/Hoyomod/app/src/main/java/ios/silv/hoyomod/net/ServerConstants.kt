package ios.silv.hoyomod.net


typealias Game = Int

object ServerConstants {
    val FULL_DATA = "/data"
    fun GAME_DATA(game: Int) = "/data/$game"
}
