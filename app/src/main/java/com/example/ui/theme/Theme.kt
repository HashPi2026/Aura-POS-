package com.example.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = TealPrimaryDark,
    onPrimary = Color(0xFF00363D),
    primaryContainer = TealPrimaryContainerDark,
    onPrimaryContainer = Color(0xFF97F0FF),
    secondary = AmberOfflineDark,
    onSecondary = Color(0xFF451A03),
    secondaryContainer = AmberOfflineDarkContainer,
    onSecondaryContainer = Color(0xFFFDE68A),
    background = SlateDarkBg,
    onBackground = Color(0xFFF1F5F9),
    surface = SlateDarkSurface,
    onSurface = Color(0xFFF8FAFC),
    surfaceVariant = SlateDarkSurfaceVariant,
    onSurfaceVariant = Color(0xFFCBD5E1),
    outline = SlateDarkBorder
)

private val LightColorScheme = lightColorScheme(
    primary = TealPrimary,
    onPrimary = Color.White,
    primaryContainer = TealPrimaryContainer,
    onPrimaryContainer = Color(0xFF002025),
    secondary = AmberOffline,
    onSecondary = Color.White,
    secondaryContainer = AmberOfflineContainer,
    onSecondaryContainer = AmberOfflineText,
    background = SlateLightBg,
    onBackground = InkBase,
    surface = SlateLightSurface,
    onSurface = InkBase,
    surfaceVariant = SlateLightSurfaceVariant,
    onSurfaceVariant = Color(0xFF475569),
    outline = SlateLightBorder
)

@Composable
fun AuraPosTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
