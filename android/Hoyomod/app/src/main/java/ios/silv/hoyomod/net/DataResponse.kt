package ios.silv.hoyomod.net

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

typealias DataListResponse = List<DataResult>;

@Serializable
data class DataResult(
    val game: Int,
    val data: List<CharacterWithModsAndTags>,
)

@Serializable
data class CharacterWithModsAndTags(
    @SerialName("characters")
    val character: Character,
    val modWithTags: List<ModWithTag>,
)

@Serializable
data class Character(
    val id: Long,
    val game: Long,
    val name: String,
    val avatarUrl: String,
    val element: String,
)

@Serializable
data class ModWithTag(
    val mod: Mod,
    val tags: List<Map<String, String>> = emptyList(),
)

@Serializable
data class Mod(
    val filename: String,
    val game: Long,
    val character: String,
    val characterId: Long,
    val enabled: Boolean,
    val previewImages: List<String>,
    val gbId: Long,
    val modLink: String,
    val gbFileName: String,
    val gbDownloadLink: String,
    val id: Long,
)
