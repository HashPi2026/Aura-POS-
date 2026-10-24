package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Backspace
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.PointOfSale
import com.example.ui.components.KwikioAppIconBadge
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.TealPrimary

@Composable
fun LoginPinScreen(
    storeName: String,
    counterName: String,
    cashierName: String,
    onUnlock: (String) -> Boolean,
    onOpenBusinessSetup: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var enteredPin by remember { mutableStateOf("") }
    var showError by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center
    ) {
        Surface(
            modifier = Modifier
                .widthIn(max = 440.dp)
                .padding(24.dp),
            shape = RoundedCornerShape(20.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 4.dp,
            shadowElevation = 8.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Official Kwikio Brand Icon
                KwikioAppIconBadge(size = 64.dp)

                Spacer(modifier = Modifier.height(14.dp))

                Text(
                    text = storeName,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )

                Text(
                    text = "$counterName • $cashierName",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(20.dp))

                Text(
                    text = "Enter Cashier PIN",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(14.dp))

                // 4 PIN Dots
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    for (i in 0 until 4) {
                        val isFilled = i < enteredPin.length
                        Box(
                            modifier = Modifier
                                .size(18.dp)
                                .clip(CircleShape)
                                .background(
                                    if (isFilled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant
                                )
                                .border(
                                    1.dp,
                                    if (isFilled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                    CircleShape
                                )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                AnimatedVisibility(visible = showError) {
                    Text(
                        text = "Incorrect PIN. Try 1234",
                        color = MaterialTheme.colorScheme.error,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Numeric Keypad Grid
                val keyRows = listOf(
                    listOf("1", "2", "3"),
                    listOf("4", "5", "6"),
                    listOf("7", "8", "9"),
                    listOf("C", "0", "DEL")
                )

                for (row in keyRows) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 5.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        for (key in row) {
                            KeypadButton(
                                text = key,
                                modifier = Modifier.weight(1f),
                                onClick = {
                                    showError = false
                                    when (key) {
                                        "C" -> enteredPin = ""
                                        "DEL" -> if (enteredPin.isNotEmpty()) enteredPin = enteredPin.dropLast(1)
                                        else -> {
                                            if (enteredPin.length < 4) {
                                                val newPin = enteredPin + key
                                                enteredPin = newPin
                                                if (newPin.length == 4) {
                                                    val success = onUnlock(newPin)
                                                    if (!success) {
                                                        showError = true
                                                        enteredPin = ""
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Demo hint
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                ) {
                    Text(
                        text = "Demo PIN: 1111 (Owner) • 1234 (Cashier)",
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Business Owner & Cloud Setup Action
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { onOpenBusinessSetup() }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                        .testTag("btn_open_business_setup_from_pin"),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Business,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Business Owner & Cloud Setup",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}

@Composable
fun KeypadButton(
    text: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        modifier = modifier
            .height(58.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .testTag("pin_key_$text"),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.25f))
    ) {
        Box(contentAlignment = Alignment.Center) {
            if (text == "DEL") {
                Icon(
                    imageVector = Icons.Default.Backspace,
                    contentDescription = "Delete",
                    modifier = Modifier.size(20.dp),
                    tint = MaterialTheme.colorScheme.onSurface
                )
            } else {
                Text(
                    text = text,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }
    }
}
