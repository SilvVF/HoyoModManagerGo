package ios.silv.hoyomod

import android.content.SharedPreferences
import android.util.Log
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocal
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.modifier.ModifierLocalModifierNode
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.edit
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import ios.silv.hoyomod.theme.MyApplicationTheme
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch


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

private fun isValidAddress(address: String): Boolean {
    // Regular expression to match IPv4 address with port
    val regex = Regex(
        """^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?):(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[0-9]{1,4})$"""
    )
    return regex.matches(address)
}

// [ColumnScope] is used for using the [ColumnScope.AnimatedVisibility] extension overload composable.
@Composable
private fun ColumnScope.SettingsPanel() {
    val scope = rememberCoroutineScope()
    val sharedPreferences = LocalSharedPreferences.current
    SettingsDialogSectionTitle(text = "Config")
    Column {
        SettingsEditTextItem(
            modifier = Modifier.fillMaxWidth(),
            key = PrefKeys.ADDR,
            label = "Server address",
            supportingText = "ex. \"192.168.1.251:6969\"",
            default = "",
            validate = { text ->
                isValidAddress(text)
            }
        )
        SettingsEditTextItem(
            modifier = Modifier.fillMaxWidth(),
            key = PrefKeys.USERNAME,
            label = "Username",
            supportingText = "",
            default = "",
        )
        SettingsEditTextItem(
            modifier = Modifier.fillMaxWidth(),
            key = PrefKeys.PASSWORD,
            label = "Password",
            supportingText = "",
            default = "",
        )
        val modsAvailable by LocalSharedPreferences.collectPreferenceAsState(PrefKeys.MODS_AVAILABLE,false)
        SettingsDialogCheckboxRow(
            text = "only show characters with mods",
            selected = modsAvailable,
            onClick = {
                scope.launch { sharedPreferences.set(PrefKeys.MODS_AVAILABLE, !modsAvailable) }
            }
        )
    }
    SettingsDialogSectionTitle(text = "Theme")
    Column(Modifier.selectableGroup()) {
        val theme by LocalSharedPreferences.collectPreferenceAsState(PrefKeys.THEME,"default")
        SettingsDialogThemeChooserRow(
            text = "default",
            selected = theme == "default",
            onClick = {
                scope.launch {
                    sharedPreferences.set(PrefKeys.THEME, "default")
                }
            },
        )
        SettingsDialogThemeChooserRow(
            text = "android",
            selected = theme == "android",
            onClick = {
                scope.launch {
                    sharedPreferences.set(PrefKeys.THEME, "android")
                }
            },
        )
    }
    AnimatedVisibility(visible = true) {
        Column {
            val dynamic by LocalSharedPreferences.collectPreferenceAsState(PrefKeys.DYNAMIC_COLOR,true)
            SettingsDialogSectionTitle(text = "Dynamic color")
            Column(Modifier.selectableGroup()) {
                SettingsDialogThemeChooserRow(
                    text = "use dynamic color",
                    selected = dynamic,
                    onClick = {
                        scope.launch {
                            sharedPreferences.set(PrefKeys.DYNAMIC_COLOR, true)
                        }
                    },
                )
                SettingsDialogThemeChooserRow(
                    text = "use app theme",
                    selected = !dynamic,
                    onClick = {
                        scope.launch {
                            sharedPreferences.set(PrefKeys.DYNAMIC_COLOR, false)
                        }
                    },
                )
            }
        }
    }
    SettingsDialogSectionTitle(text = "Theme mode")
    Column(Modifier.selectableGroup()) {
        val themeMode by LocalSharedPreferences.collectPreferenceAsState(PrefKeys.THEME_MODE,"system")
        SettingsDialogThemeChooserRow(
            text = "use system theme",
            selected = themeMode == "system",
            onClick = {
                scope.launch {
                    sharedPreferences.set(PrefKeys.THEME_MODE, "system")
                }
            },
        )
        SettingsDialogThemeChooserRow(
            text = "light",
            selected = themeMode == "light",
            onClick = {
                scope.launch {
                    sharedPreferences.set(PrefKeys.THEME_MODE, "light")
                }
            },
        )
        SettingsDialogThemeChooserRow(
            text = "dark",
            selected = themeMode == "dark",
            onClick = {
                scope.launch {
                    sharedPreferences.set(PrefKeys.THEME_MODE, "dark")
                }
            },
        )
    }
}

@Composable
private fun SettingsEditTextItem(
    modifier: Modifier = Modifier,
    validate: (String) -> Boolean = { true },
    label: String,
    key: String,
    default: String,
    supportingText: String
) {
    val sharedPreferences = LocalSharedPreferences.current
    val preferenceValue by LocalSharedPreferences.collectPreferenceAsState(key, default)
    val scope = rememberCoroutineScope()

    var isError by rememberSaveable { mutableStateOf(false) }
    var textFieldValue by rememberSaveable(stateSaver = TextFieldValue.Saver) {
        mutableStateOf(TextFieldValue(preferenceValue))
    }
    var editing by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(sharedPreferences) {
        combine(
            snapshotFlow { editing },
            snapshotFlow { preferenceValue },
            ::Pair
        ).collect { (edit, pref) ->
            if (!edit) {
                textFieldValue = textFieldValue.copy(text = pref)
            }
        }
    }

    OutlinedTextField(
        modifier = modifier,
        value = textFieldValue,
        isError = isError,
        onValueChange = {
            textFieldValue = it
        },
        label = { Text(label) },
        singleLine = true,
        enabled = editing,
        supportingText = {
            Text(supportingText)
        },
        trailingIcon = {
            AnimatedContent(
                targetState = editing,
                label = "editing_address"
            ) { targetState ->
                if (targetState) {
                    Row {
                        IconButton(
                            onClick = {
                               editing = false
                               isError = false
                            }
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Close,
                                contentDescription = "cancel"
                            )
                        }
                        IconButton(
                            onClick = {
                                val value = textFieldValue.text
                                if (validate(value)) {
                                    scope.launch {
                                        sharedPreferences.set(key, value)
                                    }
                                    editing = false
                                    isError = false
                                } else {
                                    isError = true
                                }
                            }
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Done,
                                contentDescription = "save"
                            )
                        }
                    }
                } else {
                    IconButton(
                        onClick = {
                            editing = true
                        }
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Edit,
                            contentDescription = "edit",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }
    )
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
fun SettingsDialogCheckboxRow(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .selectable(
                selected = selected,
                role = Role.Checkbox,
                onClick = onClick,
            )
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Checkbox(
            checked = selected,
            onCheckedChange = null,
        )
        Spacer(Modifier.width(8.dp))
        Text(text)
    }
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