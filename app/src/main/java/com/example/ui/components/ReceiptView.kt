package com.example.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.PrintDisabled
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.data.model.SaleSummary
import com.example.ui.theme.AmberOffline
import com.example.ui.theme.AmberOfflineContainer
import com.example.ui.theme.AmberOfflineText
import com.example.ui.theme.GreenSuccess
import com.example.ui.theme.GreenSuccessContainer
import com.example.ui.theme.GreenSuccessText
import com.example.ui.theme.ReceiptDottedLine
import com.example.ui.theme.ReceiptInk
import com.example.ui.theme.ReceiptPaperBg
import com.example.ui.viewmodel.PrintStatus
import com.example.util.FormatUtils

@Composable
fun ReceiptConfirmationDialog(
    sale: SaleSummary,
    printStatus: PrintStatus,
    printerConnected: Boolean,
    onPrint: () -> Unit,
    onNewSale: () -> Unit,
    onDismiss: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .widthIn(max = 540.dp)
                .padding(16.dp),
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 8.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Top Header with Sale Success Icon
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(GreenSuccessContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = "Sale Successful",
                                tint = GreenSuccess,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                        Column {
                            Text(
                                text = "Sale Completed",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = sale.receiptNumber,
                                fontSize = 12.sp,
                                fontFamily = FontFamily.Monospace,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    // Sync Status Pill
                    if (sale.syncStatus == "SYNCED") {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = GreenSuccessContainer
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(Icons.Default.CloudDone, contentDescription = null, modifier = Modifier.size(14.dp), tint = GreenSuccess)
                                Text("Synced", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = GreenSuccessText)
                            }
                        }
                    } else {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = AmberOfflineContainer
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(Icons.Default.CloudOff, contentDescription = null, modifier = Modifier.size(14.dp), tint = AmberOffline)
                                Text("Saved on device", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = AmberOfflineText)
                            }
                        }
                    }
                }

                // Offline reassurance notice
                if (sale.syncStatus != "SYNCED") {
                    Spacer(modifier = Modifier.height(12.dp))
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        color = AmberOfflineContainer
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.CloudOff, contentDescription = null, tint = AmberOffline, modifier = Modifier.size(16.dp))
                            Text(
                                text = "Saved on this device. Will sync when online.",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = AmberOfflineText
                            )
                        }
                    }
                }

                // Printer Disconnected Warning
                if (printStatus == PrintStatus.DISCONNECTED_ERROR || !printerConnected) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.errorContainer
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.PrintDisabled, contentDescription = null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(16.dp))
                            Text(
                                text = "Printer disconnected. Sale is safely saved on device.",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onErrorContainer
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Scrollable Thermal Paper Receipt Preview
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(300.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(ReceiptPaperBg)
                        .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(8.dp))
                        .padding(14.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    ThermalReceiptContent(sale = sale)
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Bottom Action Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Print Button
                    OutlinedButton(
                        onClick = onPrint,
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                            .testTag("print_receipt_button"),
                        shape = RoundedCornerShape(10.dp),
                        enabled = printStatus != PrintStatus.PRINTING
                    ) {
                        if (printStatus == PrintStatus.PRINTING) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Printing...", fontSize = 14.sp)
                        } else {
                            Icon(Icons.Default.Print, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (printStatus == PrintStatus.DISCONNECTED_ERROR) "Retry print" else "Print receipt",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }

                    // New Sale Button (Primary Action)
                    Button(
                        onClick = onNewSale,
                        modifier = Modifier
                            .weight(1.2f)
                            .height(48.dp)
                            .testTag("new_sale_button"),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("New sale", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun ThermalReceiptContent(sale: SaleSummary) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Header
        Text(
            text = "AURA MART RETAIL",
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            color = ReceiptInk,
            textAlign = TextAlign.Center
        )
        Text(
            text = "12th Main, Indiranagar, Bengaluru",
            fontFamily = FontFamily.Monospace,
            fontSize = 10.sp,
            color = ReceiptInk,
            textAlign = TextAlign.Center
        )
        Text(
            text = "GSTIN: 29AAAAA0000A1Z5",
            fontFamily = FontFamily.Monospace,
            fontSize = 10.sp,
            color = ReceiptInk,
            textAlign = TextAlign.Center
        )
        Text(
            text = "Phone: +91 80 2520 8900",
            fontFamily = FontFamily.Monospace,
            fontSize = 10.sp,
            color = ReceiptInk,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(4.dp))
        ReceiptDottedDivider()
        Spacer(modifier = Modifier.height(4.dp))

        // Metadata
        ReceiptRow(label = "Bill No:", value = sale.receiptNumber)
        ReceiptRow(label = "Date:", value = FormatUtils.formatReceiptDateTime(sale.timestamp))
        ReceiptRow(label = "Cashier:", value = "${sale.cashierName} (${sale.counterName})")
        ReceiptRow(label = "Payment:", value = sale.paymentMethod + if (sale.upiRef.isNotEmpty()) " (${sale.upiRef})" else "")

        Spacer(modifier = Modifier.height(4.dp))
        ReceiptDottedDivider()
        Spacer(modifier = Modifier.height(4.dp))

        // Table Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("ITEM", fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 10.sp, color = ReceiptInk, modifier = Modifier.weight(2f))
            Text("QTY", fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 10.sp, color = ReceiptInk, modifier = Modifier.weight(0.7f), textAlign = TextAlign.Center)
            Text("RATE", fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 10.sp, color = ReceiptInk, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
            Text("TOTAL", fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 10.sp, color = ReceiptInk, modifier = Modifier.weight(1.2f), textAlign = TextAlign.End)
        }

        Spacer(modifier = Modifier.height(2.dp))
        ReceiptDottedDivider()
        Spacer(modifier = Modifier.height(4.dp))

        // Items
        for (item in sale.items) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 1.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = item.name,
                    fontFamily = FontFamily.Monospace,
                    fontSize = 10.sp,
                    color = ReceiptInk,
                    modifier = Modifier.weight(2f),
                    maxLines = 1
                )
                Text(
                    text = "${item.quantity}",
                    fontFamily = FontFamily.Monospace,
                    fontSize = 10.sp,
                    color = ReceiptInk,
                    modifier = Modifier.weight(0.7f),
                    textAlign = TextAlign.Center
                )
                Text(
                    text = FormatUtils.formatInr(item.price, false),
                    fontFamily = FontFamily.Monospace,
                    fontSize = 10.sp,
                    color = ReceiptInk,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.End
                )
                Text(
                    text = FormatUtils.formatInr(item.total, false),
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 10.sp,
                    color = ReceiptInk,
                    modifier = Modifier.weight(1.2f),
                    textAlign = TextAlign.End
                )
            }
        }

        Spacer(modifier = Modifier.height(4.dp))
        ReceiptDottedDivider()
        Spacer(modifier = Modifier.height(4.dp))

        // Totals
        ReceiptRow(label = "Items Count:", value = "${sale.itemCount}")
        ReceiptRow(label = "Subtotal:", value = FormatUtils.formatInr(sale.subtotal))
        ReceiptRow(label = "CGST @ 9%:", value = FormatUtils.formatInr(sale.cgst))
        ReceiptRow(label = "SGST @ 9%:", value = FormatUtils.formatInr(sale.sgst))
        ReceiptRow(label = "Total 18% GST:", value = FormatUtils.formatInr(sale.totalGst))
        if (sale.roundOff != 0.0) {
            ReceiptRow(label = "Round Off:", value = (if (sale.roundOff > 0) "+" else "") + FormatUtils.formatInr(sale.roundOff))
        }

        Spacer(modifier = Modifier.height(4.dp))
        ReceiptDottedDivider()
        Spacer(modifier = Modifier.height(4.dp))

        // Grand Total
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "TOTAL PAYABLE:",
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                color = ReceiptInk
            )
            Text(
                text = FormatUtils.formatInr(sale.totalAmount),
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = ReceiptInk
            )
        }

        if (sale.paymentMethod == "CASH" && sale.amountTendered > 0) {
            Spacer(modifier = Modifier.height(2.dp))
            ReceiptRow(label = "Cash Tendered:", value = FormatUtils.formatInr(sale.amountTendered))
            ReceiptRow(label = "Change Due:", value = FormatUtils.formatInr(sale.changeDue))
        }

        Spacer(modifier = Modifier.height(6.dp))
        ReceiptDottedDivider()
        Spacer(modifier = Modifier.height(6.dp))

        Text(
            text = "*** THANK YOU FOR VISITING ***",
            fontFamily = FontFamily.Monospace,
            fontSize = 10.sp,
            color = ReceiptInk,
            textAlign = TextAlign.Center
        )
        Text(
            text = "GST Tax Invoice • Aura POS India",
            fontFamily = FontFamily.Monospace,
            fontSize = 9.sp,
            color = ReceiptInk,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun ReceiptRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 1.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            fontFamily = FontFamily.Monospace,
            fontSize = 10.sp,
            color = ReceiptInk
        )
        Text(
            text = value,
            fontFamily = FontFamily.Monospace,
            fontSize = 10.sp,
            fontWeight = FontWeight.Medium,
            color = ReceiptInk
        )
    }
}

@Composable
fun ReceiptDottedDivider() {
    Text(
        text = "------------------------------------------",
        fontFamily = FontFamily.Monospace,
        fontSize = 10.sp,
        color = ReceiptDottedLine,
        maxLines = 1,
        modifier = Modifier.fillMaxWidth(),
        textAlign = TextAlign.Center
    )
}
