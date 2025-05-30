package ios.silv.hoyomod.net

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class TogglePostRequest(
    @SerialName("mod_id")
    val id:      Int,
    @SerialName("enabled")
    val enabled: Boolean,
)

@Serializable
data class JobStatus(
    val jobId: Int? = null,
    val status: String? = null,
    val completedAt: String? = null,
    val error: String? = null
) {
    val isComplete = status == "completed" || status == "failed"
}

@Serializable
data class GeneratePostRequest(
    @SerialName("game")
    val game: Int
)

@Serializable
data class GenerateResponse(
    @SerialName("job_id")
    val jobId: Int
)

@Serializable
data class ModsWithTagsAndTextures(
    @SerialName("data")
    val data: List<Data>,
    @SerialName("game")
    val game: Int
) {
    @Serializable
    data class Data(
        @SerialName("characters")
        val characters: Characters,
        @SerialName("modWithTags")
        val modWithTags: List<ModWithTag>
    ) {
        @Serializable
        data class Characters(
            @SerialName("avatarUrl")
            val avatarUrl: String,
            @SerialName("element")
            val element: String,
            @SerialName("game")
            val game: Int,
            @SerialName("id")
            val id: Long,
            @SerialName("name")
            val name: String,
            @SerialName("custom")
            val custom: Boolean? = false,
        )

        @Serializable
        data class ModWithTag(
            @SerialName("mod")
            val mod: Mod,
            @SerialName("tags")
            val tags: List<Map<String, String>> = emptyList(),
            @SerialName("textures")
            val textures: List<Texture> = emptyList()
        ) {
            @Serializable
            data class Mod(
                @SerialName("character")
                val character: String,
                @SerialName("characterId")
                val characterId: Long,
                @SerialName("enabled")
                val enabled: Boolean,
                @SerialName("filename")
                val filename: String,
                @SerialName("game")
                val game: Int,
                @SerialName("gbDownloadLink")
                val gbDownloadLink: String,
                @SerialName("gbFileName")
                val gbFileName: String,
                @SerialName("gbId")
                val gbId: Int,
                @SerialName("id")
                val id: Int,
                @SerialName("modLink")
                val modLink: String,
                @SerialName("previewImages")
                val previewImages: List<String> = emptyList()
            )

            @Serializable
            data class Texture(
                @SerialName("enabled")
                val enabled: Boolean,
                @SerialName("filename")
                val filename: String,
                @SerialName("gbDownloadLink")
                val gbDownloadLink: String,
                @SerialName("gbFileName")
                val gbFileName: String,
                @SerialName("gbId")
                val gbId: Int,
                @SerialName("id")
                val id: Int,
                @SerialName("modId")
                val modId: Int,
                @SerialName("modLink")
                val modLink: String,
                @SerialName("previewImages")
                val previewImages: List<String> = emptyList()
            )
        }
    }
}