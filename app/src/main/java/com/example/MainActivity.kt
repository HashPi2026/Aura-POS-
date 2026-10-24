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
import androidx.compose.foundation.layout.BoxWithConstraints
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
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.PointOfSale
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
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
import com.example.ui.components.BusinessAuthDialog
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

    val storeName by viewModel.storeNameState.collectAsStateWithLifecycle()
    val storeAddress by viewModel.storeAddressState.collectAsStateWithLifecycle()
    val storeGstin by viewModel.storeGstinState.collectAsStateWithLifecycle()
    val businessType by viewModel.businessTypeState.collectAsStateWithLifecycle()
    val ownerEmail by viewModel.ownerEmailState.collectAsStateWithLifecycle()
    val showBusinessAuthDialog by viewModel.showBusinessAuthDialog.collectAsStateWithLifecycle()

    val cartTotals = viewModel.calculateTotals()

    // Back handler for tablet sub-screens
    BackHandler(enabled = !isLocked && (activeTab != ScreenTab.CHECKOUT || showPaymentDialog || showReceiptDialog)) {
        when {
            showReceiptDialog -> viewModel.closeReceiptDialog()
            showPaymentDialog -> viewModel.closePaymentDialog()
            activeTab != ScreenTab.CHECKOUT -> viewModel.setActiveTab(ScreenTab.CHECKOUT)
        }
    }

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val isCompact = maxWidth < 650.dp

        if (isLocked) {
            LoginPinScreen(
                storeName = storeName,
                counterName = viewModel.counterName,
                cashierName = viewModel.currentCashier,
                onUnlock = { pin -> viewModel.unlockWithPin(pin) },
                onOpenBusinessSetup = { viewModel.openBusinessAuthDialog() }
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
                        onToggleOnline = { viewModel.toggleOnline() },
                        printerConnected = printerConnected,
                        onTogglePrinter = { viewModel.togglePrinter() },
                        isDarkMode = isDarkMode,
                        onToggleDarkMode = { viewModel.toggleDarkMode() },
                        cashierName = viewModel.currentCashier,
                        counterName = viewModel.counterName,
                        storeName = storeName,
                        onLockTerminal = { viewModel.lockTerminal() },
                        isCompact = isCompact
                    )
                },
                bottomBar = {
                    NavigationBar(
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("bottom_nav_bar")
                    ) {
                        NavigationBarItem(
                            selected = activeTab == ScreenTab.CHECKOUT,
                            onClick = { viewModel.setActiveTab(ScreenTab.CHECKOUT) },
                            icon = { Icon(Icons.Default.PointOfSale, contentDescription = "Checkout") },
                            label = { Text("Checkout") },
                            modifier = Modifier.testTag("nav_checkout")
                        )

                        NavigationBarItem(
                            selected = activeTab == ScreenTab.SYNC_QUEUE,
                            onClick = { viewModel.setActiveTab(ScreenTab.SYNC_QUEUE) },
                            icon = {
                                if (unsyncedCount > 0) {
                                    BadgedBox(
                                        badge = {
                                            Badge {
                                                Text(unsyncedCount.toString())
                                            }
                                        }
                                    ) {
                                        Icon(Icons.Default.Sync, contentDescription = "Sync Queue")
                                    }
                                } else {
                                    Icon(Icons.Default.Sync, contentDescription = "Sync Queue")
                                }
                            },
                            label = { Text("Sync Queue") },
                            modifier = Modifier.testTag("nav_sync_queue")
                        )

                        NavigationBarItem(
                            selected = activeTab == ScreenTab.SALES_HISTORY,
                            onClick = { viewModel.setActiveTab(ScreenTab.SALES_HISTORY) },
                            icon = { Icon(Icons.Default.History, contentDescription = "History") },
                            label = { Text("History") },
                            modifier = Modifier.testTag("nav_history")
                        )

                        NavigationBarItem(
                            selected = activeTab == ScreenTab.SETTINGS,
                            onClick = { viewModel.setActiveTab(ScreenTab.SETTINGS) },
                            icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                            label = { Text("Settings") },
                            modifier = Modifier.testTag("nav_settings")
                        )
                    }
                }
            ) { paddingValues ->
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                ) {
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
                                onDecrementItem = { viewModel.decrementItem(it) },
                                onRemoveItem = { viewModel.removeItem(it) },
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
                                onToggleServerFailure = { viewModel.toggleSimulateServerFailure() },
                                onSyncNow = { viewModel.triggerManualSync() },
                                onRetrySale = { viewModel.retrySingleSale(it) },
                                onViewReceipt = { summary ->
                                    viewModel.openReceiptDialog(summary)
                                }
                            )
                        }

                        ScreenTab.SALES_HISTORY -> {
                            SalesHistoryScreen(
                                sales = sales,
                                onViewReceipt = { summary ->
                                    viewModel.openReceiptDialog(summary)
                                },
                                storeName = storeName,
                                counterName = viewModel.counterName,
                                cashierName = viewModel.currentCashier,
                                isCompact = isCompact,
                                onGoToCheckout = { viewModel.setActiveTab(ScreenTab.CHECKOUT) }
                            )
                        }

                        ScreenTab.SETTINGS -> {
                            SettingsScreen(
                                storeName = storeName,
                                storeAddress = storeAddress,
                                storeGstin = storeGstin,
                                counterName = viewModel.counterName,
                                cashierName = viewModel.currentCashier,
                                printerConnected = printerConnected,
                                printerModel = "Kwikio 58mm Thermal ESC/POS (BT-01)",
                                onTogglePrinter = { viewModel.togglePrinter() },
                                onTestPrint = { viewModel.testPrintReceipt() },
                                isOnline = isOnline,
                                onToggleOnline = { viewModel.toggleOnline() },
                                simulateServerFailure = simulateServerFailure,
                                onToggleServerFailure = { viewModel.toggleSimulateServerFailure() },
                                isDarkMode = isDarkMode,
                                onToggleDarkMode = { viewModel.toggleDarkMode() },
                                onLockTerminal = { viewModel.lockTerminal() },
                                onOpenBusinessSetup = { viewModel.openBusinessAuthDialog() }
                            )
                        }
                    }
                }
            }
        }

        // Dialogs
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

        if (showReceiptDialog && completedSale != null) {
            ReceiptConfirmationDialog(
                sale = completedSale!!,
                printStatus = printStatus,
                printerConnected = printerConnected,
                onPrint = { viewModel.printReceipt(completedSale!!) },
                onNewSale = { viewModel.startNewSale() },
                onDismiss = { viewModel.closeReceiptDialog() }
            )
        }

        if (showBusinessAuthDialog) {
            BusinessAuthDialog(
                currentName = storeName,
                currentAddress = storeAddress,
                currentGstin = storeGstin,
                currentType = businessType,
                currentEmail = ownerEmail,
                onSaveProfile = { name, address, gstin, type, email ->
                    viewModel.updateBusinessProfile(name, address, gstin, type, email)
                },
                onDismiss = { viewModel.closeBusinessAuthDialog() }
            )
        }

        // Banner notifications
        AnimatedVisibility(
            visible = bannerMessage != null,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 72.dp, start = 16.dp, end = 16.dp)
        ) {
            bannerMessage?.let { msg ->
                val isSuccess = msg.contains("synced", ignoreCase = true) || msg.contains("success", ignoreCase = true)
                Surface(
                    color = if (isSuccess) GreenSuccessContainer else AmberOfflineContainer,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.shadow(8.dp, RoundedCornerShape(12.dp))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = null,
                            tint = if (isSuccess) GreenSuccessText else AmberOfflineText
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = msg,
                            color = if (isSuccess) GreenSuccessText else AmberOfflineText,
                            fontWeight = FontWeight.Medium,
                            fontSize = 14.sp
                        )
                    }
                }
            }
        }
    }
}
