package ios.silv.hoyomod.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import ios.silv.hoyomod.LocalSharedPreferences
import ios.silv.hoyomod.PrefKeys
import ios.silv.hoyomod.collectPreferenceAsState
import ios.silv.myapplication.ui.theme.Pink40
import ios.silv.myapplication.ui.theme.Pink80
import ios.silv.myapplication.ui.theme.Purple40
import ios.silv.myapplication.ui.theme.Purple80
import ios.silv.myapplication.ui.theme.PurpleGrey40
import ios.silv.myapplication.ui.theme.PurpleGrey80
import ios.silv.myapplication.ui.theme.Typography

private val DarkColorScheme = darkColorScheme(
    primary = Purple80,
    secondary = PurpleGrey80,
    tertiary = Pink80
)

private val LightColorScheme = lightColorScheme(
    primary = Purple40,
    secondary = PurpleGrey40,
    tertiary = Pink40

    /* Other default colors to override
    background = Color(0xFFFFFBFE),
    surface = Color(0xFFFFFBFE),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = Color(0xFF1C1B1F),
    onSurface = Color(0xFF1C1B1F),
    */
)

@Composable
fun MyApplicationTheme(
    content: @Composable () -> Unit
) {
    runCatching {
        val themeMode by LocalSharedPreferences.collectPreferenceAsState(PrefKeys.THEME_MODE,"system")
        val dynamic by LocalSharedPreferences.collectPreferenceAsState(PrefKeys.DYNAMIC_COLOR,true)

        val sysDark = isSystemInDarkTheme()

        val colorScheme = when {
            dynamic && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
                val context = LocalContext.current
                if (themeMode == "dark" || (themeMode == "system" && sysDark))
                    dynamicDarkColorScheme(context)
                else
                    dynamicLightColorScheme(context)
            }
            themeMode == "system" -> if(sysDark) DarkColorScheme else LightColorScheme
            themeMode == "dark" -> DarkColorScheme
            else -> LightColorScheme
        }
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            content = content
        )
    }.onFailure {
        MaterialTheme(
            colorScheme = DarkColorScheme,
            typography = Typography,
            content = content
        )
    }
}