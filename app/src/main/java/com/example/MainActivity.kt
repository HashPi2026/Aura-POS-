package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ui.components.HeaderBar
import com.example.ui.components.PaymentDialog
import com.example.ui.components.ReceiptConfirmationDialog
import com.example.ui.screens.CheckoutScreen
import com.example.ui.screens.LoginPinScreen
import com.example.ui.screens.SalesHistoryScreen
import com.example.ui.screens.SettingsScreen
import com.example.ui.screens.SyncQueueScreen
import com.example.ui.theme.AmberOfflineContainer
import com.example.ui.theme.AmberOfflineText
import com.example.ui.theme.AuraPosTheme
import com.example.ui.theme.GreenSuccessContainer
import com.example.ui.theme.GreenSuccessText
import com.example.ui.viewmodel.PosViewModel
import com.example.ui.viewmodel.ScreenTab

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val viewModel: PosViewModel = viewModel()
            val isDarkMode by viewModel.isDarkMode.collectAsStateWithLifecycle()

            AuraPosTheme(darkTheme = isDarkMode) {
                PosApp(viewModel = viewModel)
            }
        }
    }
}

@Composable
fun PosApp(viewModel: PosViewModel) {
    val isLocked by viewModel.isLocked.collectAsStateWithLifecycle()
    val activeTab by viewModel.activeTab.collectAsStateWithLifecycle()
    val isOnline by viewModel.isOnline.collectAsStateWithLifecycle()
    val isSyncing by viewModel.isSyncing.collectAsStateWithLifecycle()
    val unsyncedCount by viewModel.unsyncedCount.collectAsStateWithLifecycle()
    val printerConnected by viewModel.printerConnected.collectAsStateWithLifecycle()
    val printStatus by viewModel.printStatus.collectAsStateWithLifecycle()
    val isDarkMode by viewModel.isDarkMode.collectAsStateWithLifecycle()
    val bannerMessage by viewModel.bannerMessage.collectAsStateWithLifecycle()

    val products by viewModel.allProducts.collectAsStateWithLifecycle()
    val cartItems by viewModel.cartItems.collectAsStateWithLifecycle()
    val lastRemovedItem by viewModel.lastRemovedItem.collectAsStateWithLifecycle()
    val searchQuery by viewModel.searchQuery.collectAsStateWithLifecycle()
    val selectedCategory by viewModel.selectedCategory.collectAsStateWithLifecycle()

    val sales by viewModel.allSales.collectAsStateWithLifecycle()
    val simulateServerFailure by viewModel.simulateServerFailure.collectAsStateWithLifecycle()

    val showPaymentDialog by viewModel.showPaymentDialog.collectAsStateWithLifecycle()
    val selectedPaymentMethod by viewModel.selectedPaymentMethod.collectAsStateWithLifecycle()
    val amountTendered by viewModel.amountTendered.collectAsStateWithLifecycle()

    val showReceiptDialog by viewModel.showReceiptDialog.collectAsStateWithLifecycle()
    val completedSale by viewModel.completedSale.collectAsStateWithLifecycle()

    val cartTotals = viewModel.calculateTotals()

    // Back handler for tablet sub-screens
    BackHandler(enabled = !isLocked && (activeTab != ScreenTab.CHECKOUT || showPaymentDialog || showReceiptDialog)) {
        when {
            showReceiptDialog -> viewModel.closeReceiptDialog()
            showPaymentDialog -> viewModel.closePaymentDialog()
            activeTab != ScreenTab.CHECKOUT -> viewModel.setActiveTab(ScreenTab.CHECKOUT)
        }
    }

    if (isLocked) {
        LoginPinScreen(
            storeName = viewModel.storeName,
            counterName = viewModel.counterName,
            cashierName = viewModel.currentCashier,
            onUnlock = { pin -> viewModel.unlockWithPin(pin) }
        )
    } else {
        Scaffold(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding(),
            topBar = {
                HeaderBar(
                    activeTab = activeTab,
                    onTabSelected = { viewModel.setActiveTab(it) },
                    isOnline = isOnline,
                    isSyncing = isSyncing,
                    unsyncedCount = unsyncedCount,
                    onToggleOnline = { viewModel.toggleOnlineStatus() },
                    printerConnected = printerConnected,
                    onTogglePrinter = { viewModel.togglePrinterConnection() },
                    isDarkMode = isDarkMode,
                    onToggleDarkMode = { viewModel.toggleDarkMode() },
                    cashierName = viewModel.currentCashier,
                    counterName = viewModel.counterName,
                    onLockTerminal = { viewModel.lockTerminal() }
                )
            }
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .background(MaterialTheme.colorScheme.background)
            ) {
                // Tab Content
                when (activeTab) {
                    ScreenTab.CHECKOUT -> {
                        CheckoutScreen(
                            products = products,
                            cartItems = cartItems,
                            cartTotals = cartTotals,
                            searchQuery = searchQuery,
                            onSearchQueryChange = { viewModel.setSearchQuery(it) },
                            selectedCategory = selectedCategory,
                            onCategorySelect = { viewModel.setSelectedCategory(it) },
                            onAddToCart = { viewModel.addItemToCart(it) },
                            onDecrementItem = { viewModel.decrementItemQuantity(it) },
                            onRemoveItem = { viewModel.removeItemFromCart(it) },
                            onClearCart = { viewModel.clearCart() },
                            onChargeClick = { viewModel.openPaymentDialog() },
                            lastRemovedItem = lastRemovedItem,
                            onUndoRemove = { viewModel.undoRemoveItem() }
                        )
                    }

                    ScreenTab.SYNC_QUEUE -> {
                        SyncQueueScreen(
                            sales = sales,
                            isOnline = isOnline,
                            isSyncing = isSyncing,
                            unsyncedCount = unsyncedCount,
                            simulateServerFailure = simulateServerFailure,
                            onToggleServerFailure = { viewModel.toggleServerFailureSimulation() },
                            onSyncNow = { viewModel.triggerBackgroundSync() },
                            onRetrySale = { id -> viewModel.retrySingleSale(id) },
                            onViewReceipt = { sale -> viewModel.viewPastSaleReceipt(sale) }
                        )
                    }

                    ScreenTab.SALES_HISTORY -> {
                        SalesHistoryScreen(
                            sales = sales,
                            onViewReceipt = { sale -> viewModel.viewPastSaleReceipt(sale) }
                        )
                    }

                    ScreenTab.SETTINGS -> {
                        SettingsScreen(
                            storeName = viewModel.storeName,
                            storeAddress = viewModel.storeAddress,
                            storeGstin = viewModel.storeGstin,
                            counterName = viewModel.counterName,
                            cashierName = viewModel.currentCashier,
                            printerConnected = printerConnected,
                            printerModel = viewModel.printerModel,
                            onTogglePrinter = { viewModel.togglePrinterConnection() },
                            onTestPrint = { viewModel.printCurrentReceipt() },
                            isOnline = isOnline,
                            onToggleOnline = { viewModel.toggleOnlineStatus() },
                            simulateServerFailure = simulateServerFailure,
                            onToggleServerFailure = { viewModel.toggleServerFailureSimulation() },
                            isDarkMode = isDarkMode,
                            onToggleDarkMode = { viewModel.toggleDarkMode() },
                            onLockTerminal = { viewModel.lockTerminal() }
                        )
                    }
                }

                // Notification Banner (e.g. "Saved on this device. Will sync when online." / "Synced N sales in X ms.")
                AnimatedVisibility(
                    visible = bannerMessage != null,
                    enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                    exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 20.dp)
                ) {
                    bannerMessage?.let { msg ->
                        val isOfflineReassurance = msg.contains("Saved on this device", ignoreCase = true)
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = if (isOfflineReassurance) AmberOfflineContainer else GreenSuccessContainer,
                            tonalElevation = 6.dp,
                            shadowElevation = 6.dp,
                            modifier = Modifier
                                .padding(horizontal = 24.dp)
                                .testTag("notification_banner")
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Info,
                                    contentDescription = null,
                                    tint = if (isOfflineReassurance) AmberOfflineText else GreenSuccessText
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = msg,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isOfflineReassurance) AmberOfflineText else GreenSuccessText
                                )
                            }
                        }
                    }
                }
            }
        }

        // Payment Modal Dialog
        if (showPaymentDialog) {
            PaymentDialog(
                totals = cartTotals,
                selectedMethod = selectedPaymentMethod,
                onSelectMethod = { viewModel.setPaymentMethod(it) },
                amountTendered = amountTendered,
                onAmountTenderedChange = { viewModel.setAmountTendered(it) },
                onCompleteSale = { viewModel.completeSale() },
                onDismiss = { viewModel.closePaymentDialog() }
            )
        }

        // Receipt Confirmation Dialog
        if (showReceiptDialog && completedSale != null) {
            ReceiptConfirmationDialog(
                sale = completedSale!!,
                printStatus = printStatus,
                printerConnected = printerConnected,
                onPrint = { viewModel.printCurrentReceipt() },
                onNewSale = { viewModel.closeReceiptDialog() },
                onDismiss = { viewModel.closeReceiptDialog() }
            )
        }
    }
}
