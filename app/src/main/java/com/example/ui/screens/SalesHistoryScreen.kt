package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.LocalAtm
import androidx.compose.material.icons.filled.PointOfSale
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.SaleSummary
import com.example.ui.theme.AmberOffline
import com.example.ui.theme.AmberOfflineContainer
import com.example.ui.theme.AmberOfflineText
import com.example.ui.theme.GreenSuccess
import com.example.ui.theme.GreenSuccessContainer
import com.example.ui.theme.GreenSuccessText
import com.example.util.FormatUtils

@Composable
fun SalesHistoryScreen(
    sales: List<SaleSummary>,
    onViewReceipt: (SaleSummary) -> Unit,
    storeName: String = "Kwikio Retail & Cafe",
    counterName: String = "Counter 1",
    cashierName: String = "Ramesh Sharma",
    isCompact: Boolean = false,
    onGoToCheckout: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val totalRevenue = remember(sales) { sales.sumOf { it.totalAmount } }
    val totalCash = remember(sales) { sales.filter { it.paymentMethod == "CASH" }.sumOf { it.totalAmount } }
    val totalUpi = remember(sales) { sales.filter { it.paymentMethod == "UPI" }.sumOf { it.totalAmount } }
    val totalCard = remember(sales) { sales.filter { it.paymentMethod == "CARD" }.sumOf { it.totalAmount } }
    val totalGst = remember(sales) { sales.sumOf { it.totalGst } }
    val totalItemsSold = remember(sales) { sales.sumOf { it.itemCount } }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 14.dp, vertical = 12.dp)
    ) {
        // Daily Summary / Z-Report Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .testTag("daily_sales_summary_card"),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                // Top Header: Title & Total Revenue
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f, fill = false)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = "Today's Sales Summary",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = MaterialTheme.colorScheme.primaryContainer
                            ) {
                                Text(
                                    text = "Z-Report",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(2.dp))

                        Text(
                            text = "$counterName • $cashierName • $storeName",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    // Prominent Total Revenue Container
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.2f))
                    ) {
                        Column(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            horizontalAlignment = Alignment.End
                        ) {
                            Text(
                                text = "Total Revenue",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Text(
                                text = FormatUtils.formatInr(totalRevenue),
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Black,
                                fontFamily = FontFamily.Monospace,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                Spacer(modifier = Modifier.height(14.dp))

                // Responsive Breakdown Metrics:
                // On mobile portrait (isCompact), use a clean 2-column grid to prevent any text wrapping.
                // On tablets / landscape, use a 5-column horizontal row.
                if (isCompact) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Row 1: Transactions & Cash
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            MetricMiniCard(
                                title = "Transactions",
                                value = "${sales.size} sales",
                                subtext = "$totalItemsSold items sold",
                                icon = Icons.Default.Receipt,
                                iconTint = MaterialTheme.colorScheme.primary,
                                iconBg = MaterialTheme.colorScheme.primaryContainer,
                                modifier = Modifier.weight(1f)
                            )
                            MetricMiniCard(
                                title = "Cash Total",
                                value = FormatUtils.formatInr(totalCash),
                                subtext = "In Register",
                                icon = Icons.Default.LocalAtm,
                                iconTint = GreenSuccess,
                                iconBg = GreenSuccessContainer,
                                modifier = Modifier.weight(1f)
                            )
                        }

                        // Row 2: UPI & Card
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            MetricMiniCard(
                                title = "UPI Total",
                                value = FormatUtils.formatInr(totalUpi),
                                subtext = "QR Digital",
                                icon = Icons.Default.QrCode2,
                                iconTint = Color(0xFF7C3AED),
                                iconBg = Color(0xFFF3E8FF),
                                modifier = Modifier.weight(1f)
                            )
                            MetricMiniCard(
                                title = "Card Total",
                                value = FormatUtils.formatInr(totalCard),
                                subtext = "POS Terminal",
                                icon = Icons.Default.CreditCard,
                                iconTint = Color(0xFF0284C7),
                                iconBg = Color(0xFFE0F2FE),
                                modifier = Modifier.weight(1f)
                            )
                        }

                        // Row 3: GST Tax Collected (Full Width Banner)
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 12.dp, vertical = 9.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(28.dp)
                                            .clip(CircleShape)
                                            .background(AmberOfflineContainer),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.History,
                                            contentDescription = null,
                                            modifier = Modifier.size(15.dp),
                                            tint = AmberOffline
                                        )
                                    }
                                    Column {
                                        Text(
                                            text = "GST Tax Collected (18%)",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                        Text(
                                            text = "9% CGST + 9% SGST",
                                            fontSize = 10.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }

                                Text(
                                    text = FormatUtils.formatInr(totalGst),
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }
                } else {
                    // Tablet / Desktop: 5 metrics across
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        MetricMiniCard(
                            title = "Transactions",
                            value = "${sales.size} sales",
                            subtext = "$totalItemsSold items",
                            icon = Icons.Default.Receipt,
                            iconTint = MaterialTheme.colorScheme.primary,
                            iconBg = MaterialTheme.colorScheme.primaryContainer,
                            modifier = Modifier.weight(1f)
                        )
                        MetricMiniCard(
                            title = "Cash Total",
                            value = FormatUtils.formatInr(totalCash),
                            subtext = "Cash Drawer",
                            icon = Icons.Default.LocalAtm,
                            iconTint = GreenSuccess,
                            iconBg = GreenSuccessContainer,
                            modifier = Modifier.weight(1f)
                        )
                        MetricMiniCard(
                            title = "UPI Total",
                            value = FormatUtils.formatInr(totalUpi),
                            subtext = "QR Pay",
                            icon = Icons.Default.QrCode2,
                            iconTint = Color(0xFF7C3AED),
                            iconBg = Color(0xFFF3E8FF),
                            modifier = Modifier.weight(1f)
                        )
                        MetricMiniCard(
                            title = "Card Total",
                            value = FormatUtils.formatInr(totalCard),
                            subtext = "EDC Swipe",
                            icon = Icons.Default.CreditCard,
                            iconTint = Color(0xFF0284C7),
                            iconBg = Color(0xFFE0F2FE),
                            modifier = Modifier.weight(1f)
                        )
                        MetricMiniCard(
                            title = "18% GST",
                            value = FormatUtils.formatInr(totalGst),
                            subtext = "CGST + SGST",
                            icon = Icons.Default.History,
                            iconTint = AmberOffline,
                            iconBg = AmberOfflineContainer,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Past Sales Section Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    text = "Completed Invoices",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Text(
                        text = "${sales.size}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        if (sales.isEmpty()) {
            // Elegant Mobile Empty State
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.ReceiptLong,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(28.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "No sales recorded yet today",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "Ring up items in Checkout to generate receipts and update your daily Z-report.",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = onGoToCheckout,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.testTag("btn_empty_go_checkout")
                    ) {
                        Icon(Icons.Default.ShoppingBag, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("New Sale (Checkout)", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        } else {
            // Completed Invoices List
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .testTag("sales_history_list"),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(sales, key = { it.id }) { sale ->
                    HistoryItemCard(
                        sale = sale,
                        onReprint = { onViewReceipt(sale) }
                    )
                }
            }
        }
    }
}

@Composable
fun MetricMiniCard(
    title: String,
    value: String,
    icon: ImageVector,
    iconTint: Color = MaterialTheme.colorScheme.primary,
    iconBg: Color = MaterialTheme.colorScheme.primaryContainer,
    subtext: String? = null,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(iconBg),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        modifier = Modifier.size(13.dp),
                        tint = iconTint
                    )
                }

                Text(
                    text = title,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = value,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1
            )

            if (subtext != null) {
                Spacer(modifier = Modifier.height(1.dp))
                Text(
                    text = subtext,
                    fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1
                )
            }
        }
    }
}

@Composable
fun HistoryItemCard(
    sale: SaleSummary,
    onReprint: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("history_sale_${sale.receiptNumber}"),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
        shadowElevation = 1.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = sale.receiptNumber,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = when (sale.paymentMethod) {
                            "CASH" -> GreenSuccessContainer
                            "UPI" -> Color(0xFFF3E8FF)
                            else -> Color(0xFFE0F2FE)
                        }
                    ) {
                        Text(
                            text = sale.paymentMethod,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = when (sale.paymentMethod) {
                                "CASH" -> GreenSuccessText
                                "UPI" -> Color(0xFF7C3AED)
                                else -> Color(0xFF0284C7)
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = "${FormatUtils.formatDateTime(sale.timestamp)} • ${sale.itemCount} items",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = FormatUtils.formatInr(sale.totalAmount),
                    fontWeight = FontWeight.Black,
                    fontSize = 15.sp,
                    fontFamily = FontFamily.Monospace,
                    color = MaterialTheme.colorScheme.onSurface
                )

                OutlinedButton(
                    onClick = onReprint,
                    modifier = Modifier.height(34.dp),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(Icons.Default.Print, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Receipt", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}
