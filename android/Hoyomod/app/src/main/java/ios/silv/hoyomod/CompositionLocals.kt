package ios.silv.hoyomod

import android.content.SharedPreferences
import androidx.compose.runtime.staticCompositionLocalOf

val LocalSharedPreferences =
    staticCompositionLocalOf<SharedPreferences> { error("SharedPreferences not provided in scope") }
