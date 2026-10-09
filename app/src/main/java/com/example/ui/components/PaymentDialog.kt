package com.example.ui.components

import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.LocalAtm
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.ui.theme.GreenSuccess
import com.example.ui.theme.GreenSuccessContainer
import com.example.ui.theme.GreenSuccessText
import com.example.ui.viewmodel.CartTotals
import com.example.util.FormatUtils

@Composable
fun PaymentDialog(
    totals: CartTotals,
    selectedMethod: String,
    onSelectMethod: (String) -> Unit,
    amountTendered: Double,
    onAmountTenderedChange: (Double) -> Unit,
    onCompleteSale: () -> Unit,
    onDismiss: () -> Unit
) {
    var upiVerified by remember { mutableStateOf(false) }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .widthIn(max = 680.dp)
                .padding(16.dp),
            shape = RoundedCornerShape(18.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 6.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Payment",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Total ${totals.totalItems} items (incl. 18% GST)",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = FormatUtils.formatInr(totals.totalAmount),
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.Monospace,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        IconButton(
                            onClick = onDismiss,
                            modifier = Modifier.testTag("close_payment_dialog")
                        ) {
                            Icon(Icons.Default.Close, contentDescription = "Close")
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Payment Method Selector Tabs
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    PaymentMethodTab(
                        title = "Cash",
                        subtitle = "Tender & change",
                        icon = Icons.Default.LocalAtm,
                        isSelected = selectedMethod == "CASH",
                        testTag = "pay_method_cash",
                        onClick = { onSelectMethod("CASH") },
                        modifier = Modifier.weight(1f)
                    )

                    PaymentMethodTab(
                        title = "UPI QR",
                        subtitle = "GPay, PhonePe, Paytm",
                        icon = Icons.Default.QrCode2,
                        isSelected = selectedMethod == "UPI",
                        testTag = "pay_method_upi",
                        onClick = { onSelectMethod("UPI") },
                        modifier = Modifier.weight(1f)
                    )

                    PaymentMethodTab(
                        title = "Card",
                        subtitle = "Tap, Chip, Swipe",
                        icon = Icons.Default.CreditCard,
                        isSelected = selectedMethod == "CARD",
                        testTag = "pay_method_card",
                        onClick = { onSelectMethod("CARD") },
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Payment Tab Content
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                        .padding(16.dp)
                ) {
                    when (selectedMethod) {
                        "CASH" -> CashPaymentSection(
                            totalAmount = totals.totalAmount,
                            amountTendered = amountTendered,
                            onAmountChange = onAmountTenderedChange
                        )
                        "UPI" -> UpiPaymentSection(
                            totalAmount = totals.totalAmount,
                            isVerified = upiVerified,
                            onSimulateVerify = { upiVerified = true }
                        )
                        "CARD" -> CardPaymentSection(
                            totalAmount = totals.totalAmount
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Bottom CTA: "Complete sale" (Active voice, high contrast)
                val canComplete = when (selectedMethod) {
                    "CASH" -> amountTendered >= totals.totalAmount
                    else -> true
                }

                Button(
                    onClick = onCompleteSale,
                    enabled = canComplete,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp)
                        .testTag("complete_sale_button"),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary
                    )
                ) {
                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Complete sale (${FormatUtils.formatInr(totals.totalAmount)})",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
fun PaymentMethodTab(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    isSelected: Boolean,
    testTag: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val bg = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant
    val textColor = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
    val subColor = if (isSelected) MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f) else MaterialTheme.colorScheme.onSurfaceVariant

    Row(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(bg)
            .clickable { onClick() }
            .padding(horizontal = 14.dp, vertical = 12.dp)
            .testTag(testTag),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = title,
            modifier = Modifier.size(24.dp),
            tint = textColor
        )
        Column {
            Text(
                text = title,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = textColor
            )
            Text(
                text = subtitle,
                fontSize = 11.sp,
                color = subColor
            )
        }
    }
}

@Composable
fun CashPaymentSection(
    totalAmount: Double,
    amountTendered: Double,
    onAmountChange: (Double) -> Unit
) {
    val changeDue = (amountTendered - totalAmount).coerceAtLeast(0.0)

    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Amount Tendered",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = FormatUtils.formatInr(amountTendered),
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            Surface(
                shape = RoundedCornerShape(10.dp),
                color = if (amountTendered >= totalAmount) GreenSuccessContainer else MaterialTheme.colorScheme.surfaceVariant
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                    horizontalAlignment = Alignment.End
                ) {
                    Text(
                        text = "Change Due",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (amountTendered >= totalAmount) GreenSuccessText else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = FormatUtils.formatInr(changeDue),
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = if (amountTendered >= totalAmount) GreenSuccess else MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        Text(
            text = "Quick Tender Denominations",
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Quick Denominations row
        val denominations = listOf(
            "Exact" to totalAmount,
            "+₹100" to (amountTendered + 100),
            "+₹200" to (amountTendered + 200),
            "+₹500" to (amountTendered + 500),
            "₹500" to 500.0,
            "₹2000" to 2000.0
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            for ((label, value) in denominations) {
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { onAmountChange(value) }
                        .testTag("cash_btn_$label"),
                    color = MaterialTheme.colorScheme.surface,
                    tonalElevation = 2.dp,
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.4f))
                ) {
                    Box(
                        modifier = Modifier.padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = label,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun UpiPaymentSection(
    totalAmount: Double,
    isVerified: Boolean,
    onSimulateVerify: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(20.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // High-contrast clean QR Code Canvas
        Box(
            modifier = Modifier
                .size(150.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Color.White)
                .border(2.dp, Color(0xFF0F172A), RoundedCornerShape(12.dp))
                .padding(10.dp),
            contentAlignment = Alignment.Center
        ) {
            QrCodeGraphic(modifier = Modifier.size(130.dp))
        }

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = "Dynamic UPI QR",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = "UPI ID: auramart.indiranagar@hdfcbank",
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "Scan & pay with any UPI App: GPay, PhonePe, Paytm, BHIM, CRED",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(4.dp))

            if (isVerified) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = GreenSuccessContainer
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Default.Check, contentDescription = null, tint = GreenSuccess, modifier = Modifier.size(16.dp))
                        Text(
                            text = "Payment received via UPI (Ref: UPI${(100000..999999).random()})",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = GreenSuccessText
                        )
                    }
                }
            } else {
                OutlinedButton(
                    onClick = onSimulateVerify,
                    modifier = Modifier.testTag("simulate_upi_button")
                ) {
                    Text("Simulate payment received", fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
fun CardPaymentSection(totalAmount: Double) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(70.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.CreditCard,
                contentDescription = "Card Terminal",
                tint = MaterialTheme.colorScheme.onPrimaryContainer,
                modifier = Modifier.size(36.dp)
            )
        }

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "POS Card Terminal Ready",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = "Insert, Swipe, or Tap contactless card on attached EDC machine",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Accepted: Visa, Mastercard, RuPay, Maestro",
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}

@Composable
fun QrCodeGraphic(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val s = size.width
        val module = s / 9f

        // Draw 3 corner finder patterns
        fun drawFinder(x: Float, y: Float) {
            drawRoundRect(
                color = Color.Black,
                topLeft = Offset(x, y),
                size = Size(module * 3, module * 3),
                cornerRadius = CornerRadius(4f, 4f)
            )
            drawRoundRect(
                color = Color.White,
                topLeft = Offset(x + module * 0.5f, y + module * 0.5f),
                size = Size(module * 2, module * 2),
                cornerRadius = CornerRadius(2f, 2f)
            )
            drawRoundRect(
                color = Color.Black,
                topLeft = Offset(x + module, y + module),
                size = Size(module, module),
                cornerRadius = CornerRadius(2f, 2f)
            )
        }

        drawFinder(0f, 0f)
        drawFinder(s - module * 3, 0f)
        drawFinder(0f, s - module * 3)

        // Draw data pattern blocks
        val points = listOf(
            Offset(4 * module, 1 * module),
            Offset(4 * module, 2 * module),
            Offset(5 * module, 3 * module),
            Offset(7 * module, 4 * module),
            Offset(4 * module, 4 * module),
            Offset(1 * module, 4 * module),
            Offset(2 * module, 5 * module),
            Offset(4 * module, 6 * module),
            Offset(6 * module, 6 * module),
            Offset(7 * module, 7 * module),
            Offset(5 * module, 7 * module),
            Offset(8 * module, 8 * module),
            Offset(4 * module, 8 * module),
            Offset(6 * module, 2 * module)
        )

        for (pt in points) {
            drawRect(
                color = Color(0xFF0F172A),
                topLeft = pt,
                size = Size(module * 0.9f, module * 0.9f)
            )
        }
    }
}
