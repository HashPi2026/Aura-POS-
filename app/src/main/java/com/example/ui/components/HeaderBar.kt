package com.example.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.PointOfSale
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.PrintDisabled
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.AmberOffline
import com.example.ui.theme.AmberOfflineContainer
import com.example.ui.theme.AmberOfflineText
import com.example.ui.theme.GreenSuccess
import com.example.ui.theme.GreenSuccessContainer
import com.example.ui.theme.GreenSuccessText
import com.example.ui.viewmodel.ScreenTab

@Composable
fun HeaderBar(
    activeTab: ScreenTab,
    onTabSelected: (ScreenTab) -> Unit,
    isOnline: Boolean,
    isSyncing: Boolean,
    unsyncedCount: Int,
    onToggleOnline: () -> Unit,
    printerConnected: Boolean,
    onTogglePrinter: () -> Unit,
    isDarkMode: Boolean,
    onToggleDarkMode: () -> Unit,
    cashierName: String,
    counterName: String,
    onLockTerminal: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 3.dp,
        shadowElevation = 2.dp
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Left Brand & Counter Info
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(MaterialTheme.colorScheme.primary),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "A",
                            color = MaterialTheme.colorScheme.onPrimary,
                            fontWeight = FontWeight.Black,
                            fontSize = 22.sp
                        )
                    }

                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "Aura POS",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = MaterialTheme.colorScheme.surfaceVariant
                            ) {
                                Text(
                                    text = counterName,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        Text(
                            text = "Retail Terminal • India",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Middle: Persistent Connection Chip & Printer Chip
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Persistent Connection Status Chip
                    ConnectionStatusChip(
                        isOnline = isOnline,
                        isSyncing = isSyncing,
                        unsyncedCount = unsyncedCount,
                        onToggle = onToggleOnline
                    )

                    // Bluetooth Printer Status Chip
                    PrinterStatusChip(
                        connected = printerConnected,
                        onClick = onTogglePrinter
                    )
                }

                // Right: Navigation Tabs, Cashier Badge, Dark Mode, Lock
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Nav Buttons
                    NavTabButton(
                        title = "Checkout",
                        icon = Icons.Default.PointOfSale,
                        isSelected = activeTab == ScreenTab.CHECKOUT,
                        testTag = "nav_checkout",
                        onClick = { onTabSelected(ScreenTab.CHECKOUT) }
                    )

                    NavTabButton(
                        title = "Queue",
                        icon = Icons.Default.Sync,
                        isSelected = activeTab == ScreenTab.SYNC_QUEUE,
                        badgeCount = unsyncedCount,
                        testTag = "nav_queue",
                        onClick = { onTabSelected(ScreenTab.SYNC_QUEUE) }
                    )

                    NavTabButton(
                        title = "History",
                        icon = Icons.Default.History,
                        isSelected = activeTab == ScreenTab.SALES_HISTORY,
                        testTag = "nav_history",
                        onClick = { onTabSelected(ScreenTab.SALES_HISTORY) }
                    )

                    NavTabButton(
                        title = "Settings",
                        icon = Icons.Default.Settings,
                        isSelected = activeTab == ScreenTab.SETTINGS,
                        testTag = "nav_settings",
                        onClick = { onTabSelected(ScreenTab.SETTINGS) }
                    )

                    Spacer(modifier = Modifier.width(4.dp))

                    // Dark/Light Mode
                    IconButton(
                        onClick = onToggleDarkMode,
                        modifier = Modifier.testTag("theme_toggle_button")
                    ) {
                        Icon(
                            imageVector = if (isDarkMode) Icons.Default.LightMode else Icons.Default.DarkMode,
                            contentDescription = "Toggle Theme",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    // Cashier Profile & Lock
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .clickable { onLockTerminal() }
                            .padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = cashierName.take(1),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                        Text(
                            text = cashierName.split(" ").firstOrNull() ?: cashierName,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = "Lock Terminal",
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ConnectionStatusChip(
    isOnline: Boolean,
    isSyncing: Boolean,
    unsyncedCount: Int,
    onToggle: () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "sync_spin")
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200),
            repeatMode = RepeatMode.Restart
        ),
        label = "rotation"
    )

    val chipBg = when {
        isSyncing -> MaterialTheme.colorScheme.primaryContainer
        !isOnline -> AmberOfflineContainer
        else -> GreenSuccessContainer
    }

    val chipText = when {
        isSyncing -> MaterialTheme.colorScheme.onPrimaryContainer
        !isOnline -> AmberOfflineText
        else -> GreenSuccessText
    }

    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(chipBg)
            .border(1.dp, chipText.copy(alpha = 0.25f), RoundedCornerShape(20.dp))
            .clickable { onToggle() }
            .padding(horizontal = 10.dp, vertical = 6.dp)
            .testTag("connection_chip"),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        if (isSyncing) {
            Icon(
                imageVector = Icons.Default.Refresh,
                contentDescription = "Syncing",
                modifier = Modifier
                    .size(16.dp)
                    .rotate(rotation),
                tint = chipText
            )
            Text(
                text = "Syncing...",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = chipText
            )
        } else if (!isOnline) {
            Icon(
                imageVector = Icons.Default.CloudOff,
                contentDescription = "Offline Mode",
                modifier = Modifier.size(16.dp),
                tint = AmberOffline
            )
            Text(
                text = "Offline",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = AmberOfflineText
            )
        } else {
            Icon(
                imageVector = Icons.Default.CloudDone,
                contentDescription = "Online",
                modifier = Modifier.size(16.dp),
                tint = GreenSuccess
            )
            Text(
                text = "Online",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = GreenSuccessText
            )
        }

        // Unsynced count pill
        if (unsyncedCount > 0) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(10.dp))
                    .background(AmberOffline)
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Text(
                    text = "$unsyncedCount unsynced",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }
    }
}

@Composable
fun PrinterStatusChip(
    connected: Boolean,
    onClick: () -> Unit
) {
    val bg = if (connected) MaterialTheme.colorScheme.surfaceVariant else AmberOfflineContainer
    val iconTint = if (connected) MaterialTheme.colorScheme.primary else AmberOffline
    val textColor = if (connected) MaterialTheme.colorScheme.onSurfaceVariant else AmberOfflineText

    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(bg)
            .clickable { onClick() }
            .padding(horizontal = 10.dp, vertical = 6.dp)
            .testTag("printer_chip"),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Icon(
            imageVector = if (connected) Icons.Default.Print else Icons.Default.PrintDisabled,
            contentDescription = "Printer status",
            modifier = Modifier.size(16.dp),
            tint = iconTint
        )
        Text(
            text = if (connected) "BT Printer (58mm)" else "Printer Offline",
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = textColor
        )
    }
}

@Composable
fun NavTabButton(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    isSelected: Boolean,
    badgeCount: Int = 0,
    testTag: String,
    onClick: () -> Unit
) {
    val bg = if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent
    val contentColor = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant

    BadgedBox(
        badge = {
            if (badgeCount > 0) {
                Badge(
                    containerColor = AmberOffline,
                    contentColor = Color.White
                ) {
                    Text(text = "$badgeCount", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    ) {
        Row(
            modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .background(bg)
                .clickable { onClick() }
                .padding(horizontal = 12.dp, vertical = 8.dp)
                .testTag(testTag),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                modifier = Modifier.size(18.dp),
                tint = contentColor
            )
            Text(
                text = title,
                fontSize = 13.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = contentColor
            )
        }
    }
}
