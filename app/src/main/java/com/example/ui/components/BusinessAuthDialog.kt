package com.example.ui.components

import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Pin
import androidx.compose.material.icons.filled.Store
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties

@Composable
fun BusinessAuthDialog(
    currentName: String,
    currentAddress: String,
    currentGstin: String,
    currentType: String,
    currentEmail: String,
    onSaveProfile: (name: String, address: String, gstin: String, type: String, email: String) -> Unit,
    onDismiss: () -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) } // 0: Register Business, 1: Sign In Owner

    // Form fields
    var businessName by remember { mutableStateOf(currentName) }
    var businessAddress by remember { mutableStateOf(currentAddress) }
    var businessGstin by remember { mutableStateOf(currentGstin) }
    var businessType by remember { mutableStateOf(currentType) }
    var ownerEmail by remember { mutableStateOf(currentEmail) }
    var ownerPassword by remember { mutableStateOf("") }

    val businessTypes = listOf("Cafe & Roastery", "Quick Service (QSR)", "Retail & Grocery", "Fine Dining")

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.94f)
                .padding(vertical = 24.dp)
                .clip(RoundedCornerShape(24.dp))
                .testTag("business_auth_dialog"),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 6.dp,
            shadowElevation = 12.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        KwikioAppIconBadge(size = 38.dp)
                        Column {
                            Text(
                                text = "Business & Cloud Setup",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = "Multi-Tenant Cloud Account • Kwikio POS",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.testTag("close_business_auth_dialog")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Tabs: Register New Business vs Sign In Owner
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .padding(2.dp)
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = {
                            Text(
                                text = "Register Business",
                                fontWeight = if (selectedTab == 0) FontWeight.Bold else FontWeight.Medium,
                                fontSize = 12.sp
                            )
                        }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = {
                            Text(
                                text = "Sign In Owner",
                                fontWeight = if (selectedTab == 1) FontWeight.Bold else FontWeight.Medium,
                                fontSize = 12.sp
                            )
                        }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (selectedTab == 0) {
                    // TAB 0: REGISTER NEW BUSINESS
                    Text(
                        text = "Create Your Business Profile",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Configures cloud receipts, tax reports, and multi-terminal sync.",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = businessName,
                        onValueChange = { businessName = it },
                        label = { Text("Business / Store Name") },
                        placeholder = { Text("e.g. Spice Cafe & Roastery") },
                        leadingIcon = { Icon(Icons.Default.Store, contentDescription = null, modifier = Modifier.size(18.dp)) },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_business_name")
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = "Business Category",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        businessTypes.take(2).forEach { type ->
                            val isSelected = businessType == type
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                                border = androidx.compose.foundation.BorderStroke(
                                    1.dp,
                                    if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent
                                ),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { businessType = type }
                            ) {
                                Text(
                                    text = type,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        businessTypes.drop(2).forEach { type ->
                            val isSelected = businessType == type
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                                border = androidx.compose.foundation.BorderStroke(
                                    1.dp,
                                    if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent
                                ),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { businessType = type }
                            ) {
                                Text(
                                    text = type,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = businessAddress,
                        onValueChange = { businessAddress = it },
                        label = { Text("Store Address & City") },
                        placeholder = { Text("e.g. 12th Main, Indiranagar, Bengaluru") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_business_address")
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = businessGstin,
                        onValueChange = { businessGstin = it },
                        label = { Text("GSTIN / Tax Registration Number") },
                        placeholder = { Text("29AAAAA0000A1Z5") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_business_gstin")
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = ownerEmail,
                        onValueChange = { ownerEmail = it },
                        label = { Text("Owner Email Address") },
                        placeholder = { Text("owner@business.com") },
                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, modifier = Modifier.size(18.dp)) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_business_email")
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            if (businessName.isNotBlank()) {
                                onSaveProfile(
                                    businessName.trim(),
                                    businessAddress.trim(),
                                    businessGstin.trim(),
                                    businessType,
                                    ownerEmail.trim()
                                )
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .testTag("btn_register_business"),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.CloudDone, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Create & Link Business", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                } else {
                    // TAB 1: SIGN IN OWNER
                    Text(
                        text = "Sign In with Cloud Business Account",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Logs this Android terminal into your existing Kwikio cloud account.",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    OutlinedTextField(
                        value = ownerEmail,
                        onValueChange = { ownerEmail = it },
                        label = { Text("Owner / Manager Email") },
                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, modifier = Modifier.size(18.dp)) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_login_email")
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = ownerPassword,
                        onValueChange = { ownerPassword = it },
                        label = { Text("Password") },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, modifier = Modifier.size(18.dp)) },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_login_password")
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "Demo Account: owner@kwikio.pos (Password: password123)",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            onSaveProfile(
                                businessName.ifBlank { "Spice Cafe & Roastery" },
                                businessAddress.ifBlank { "12th Main, Indiranagar, Bengaluru" },
                                businessGstin.ifBlank { "29AAAAA0000A1Z5" },
                                businessType,
                                ownerEmail.ifBlank { "owner@kwikio.pos" }
                            )
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .testTag("btn_signin_business"),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.Business, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Sign In & Sync Terminal", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
