package ios.silv.hoyomod

import android.content.SharedPreferences
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import ios.silv.hoyomod.theme.MyApplicationTheme
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.launch

@Composable
fun collectPreferenceAsState(key: String, default: String): String {

    val preferences = LocalSharedPreferences.current
    val lifecycle = LocalLifecycleOwner.current

    val scope = rememberCoroutineScope()

    val value by remember { mutableStateOf(preferences.getString(key, default)) }

    DisposableEffect(Unit) {
       scope.launch {
            lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
                callbackFlow {
                    val listener = SharedPreferences.OnSharedPreferenceChangeListener { prefs, prefKey ->
                        if (prefKey == key) {
                            prefs.getString(prefKey, default)?.let {
                                trySend(it)
                            }
                        }
                    }
                    try {
                        preferences.registerOnSharedPreferenceChangeListener(listener)
                        awaitCancellation()
                    } finally {
                        preferences.unregisterOnSharedPreferenceChangeListener(listener)
                    }
                }
                    .launchIn(this)
            }
        }
        onDispose {
            scope.cancel()
        }
    }

    return value ?: default
}

@Composable
fun SettingsDialog(
    onDismiss: () -> Unit,
) {
    val configuration = LocalConfiguration.current

    /**
     * usePlatformDefaultWidth = false is use as a temporary fix to allow
     * height recalculation during recomposition. This, however, causes
     * Dialog's to occupy full width in Compact mode. Therefore max width
     * is configured below. This should be removed when there's fix to
     * https://issuetracker.google.com/issues/221643630
     */
    AlertDialog(
        properties = DialogProperties(usePlatformDefaultWidth = false),
        modifier = Modifier.widthIn(max = configuration.screenWidthDp.dp - 80.dp),
        onDismissRequest = { onDismiss() },
        title = {
            Text(
                text = "Settings",
                style = MaterialTheme.typography.titleLarge,
            )
        },
        text = {
            HorizontalDivider()
            Column(Modifier.verticalScroll(rememberScrollState())) {
                SettingsPanel()
                HorizontalDivider(Modifier.padding(top = 8.dp))
                LinksPanel()
            }
        },
        confirmButton = {
            Text(
                text = "dismiss",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier
                    .padding(horizontal = 8.dp)
                    .clickable { onDismiss() },
            )
        },
    )
}

// [ColumnScope] is used for using the [ColumnScope.AnimatedVisibility] extension overload composable.
@Composable
private fun ColumnScope.SettingsPanel() {
    SettingsDialogSectionTitle(text = "Theme")
    Column(Modifier.selectableGroup()) {
        SettingsDialogThemeChooserRow(
            text = "default",
            selected = true,
            onClick = {  },
        )
        SettingsDialogThemeChooserRow(
            text = "android",
            selected = false,
            onClick = { },
        )
    }
    AnimatedVisibility(visible = true) {
        Column {
            SettingsDialogSectionTitle(text = "Dynamic color")
            Column(Modifier.selectableGroup()) {
                SettingsDialogThemeChooserRow(
                    text = "use dynamic color",
                    selected = true,
                    onClick = {  },
                )
                SettingsDialogThemeChooserRow(
                    text = "use app theme",
                    selected = false,
                    onClick = { },
                )
            }
        }
    }
    SettingsDialogSectionTitle(text = "Dark mode")
    Column(Modifier.selectableGroup()) {
        SettingsDialogThemeChooserRow(
            text = "use system theme",
            selected = true,
            onClick = { },
        )
        SettingsDialogThemeChooserRow(
            text = "light",
            selected = false,
            onClick = { },
        )
        SettingsDialogThemeChooserRow(
            text = "dark",
            selected = false,
            onClick = { },
        )
    }
}

@Composable
private fun SettingsDialogSectionTitle(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleMedium,
        modifier = Modifier.padding(top = 16.dp, bottom = 8.dp),
    )
}

@Composable
private fun SettingsEditTextItem(modifier: Modifier = Modifier) {

}

@Composable
fun SettingsDialogThemeChooserRow(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .selectable(
                selected = selected,
                role = Role.RadioButton,
                onClick = onClick,
            )
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RadioButton(
            selected = selected,
            onClick = null,
        )
        Spacer(Modifier.width(8.dp))
        Text(text)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun LinksPanel() {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(
            space = 16.dp,
            alignment = Alignment.CenterHorizontally,
        ),
        modifier = Modifier.fillMaxWidth(),
    ) {
        val uriHandler = LocalUriHandler.current
        TextButton(
            onClick = { uriHandler.openUri(GITHUB_URL) },
        ) {
            Text(text = "source code")
        }
    }
}

@Preview
@Composable
private fun PreviewSettingsDialog() {
    MyApplicationTheme {
        SettingsDialog(
            onDismiss = {},
        )
    }
}


private const val GITHUB_URL = "https://github.com/SilvVF/HoyoModManagerGo"
private const val BRAND_GUIDELINES_URL = "https://developer.android.com/distribute/marketing-tools/brand-guidelines"
private const val FEEDBACK_URL = "https://goo.gle/nia-app-feedback"