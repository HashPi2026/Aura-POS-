package com.example.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.local.AppDatabase
import com.example.data.local.ProductEntity
import com.example.data.model.CartItem
import com.example.data.model.SaleSummary
import com.example.data.repository.PosRepository
import com.example.data.sync.MockServer
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlin.math.round

enum class ScreenTab {
    CHECKOUT,
    SYNC_QUEUE,
    SALES_HISTORY,
    SETTINGS
}

enum class PrintStatus {
    IDLE,
    PRINTING,
    SUCCESS,
    DISCONNECTED_ERROR
}

data class CartTotals(
    val subtotal: Double,
    val cgst: Double,
    val sgst: Double,
    val totalGst: Double,
    val roundOff: Double,
    val totalAmount: Double,
    val totalItems: Int
)

class PosViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = PosRepository(AppDatabase.getDatabase(application))

    // Products
    val allProducts: StateFlow<List<ProductEntity>> = repository.allProducts
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Sales History
    val allSales: StateFlow<List<SaleSummary>> = repository.allSales
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Unsynced count in Room
    val unsyncedCount: StateFlow<Int> = repository.unsyncedCount
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val totalSalesCount: StateFlow<Int> = repository.totalSalesCount
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    // Active Navigation
    private val _activeTab = MutableStateFlow(ScreenTab.CHECKOUT)
    val activeTab: StateFlow<ScreenTab> = _activeTab.asStateFlow()

    // PIN Lock
    private val _isLocked = MutableStateFlow(false)
    val isLocked: StateFlow<Boolean> = _isLocked.asStateFlow()

    // Cashier & Store info
    val currentCashier = "Ramesh Sharma"
    val counterName = "Counter 1"
    val storeName = "Aura Mart"
    val storeAddress = "12th Main, Indiranagar, Bengaluru"
    val storeGstin = "29AAAAA0000A1Z5"

    // Cart State
    private val _cartItems = MutableStateFlow<List<CartItem>>(emptyList())
    val cartItems: StateFlow<List<CartItem>> = _cartItems.asStateFlow()

    private val _lastRemovedItem = MutableStateFlow<CartItem?>(null)
    val lastRemovedItem: StateFlow<CartItem?> = _lastRemovedItem.asStateFlow()

    // Search and Category
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedCategory = MutableStateFlow("All")
    val selectedCategory: StateFlow<String> = _selectedCategory.asStateFlow()

    // Network & Sync State
    private val _isOnline = MutableStateFlow(true)
    val isOnline: StateFlow<Boolean> = _isOnline.asStateFlow()

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing.asStateFlow()

    private val _simulateServerFailure = MutableStateFlow(false)
    val simulateServerFailure: StateFlow<Boolean> = _simulateServerFailure.asStateFlow()

    // Bluetooth Printer State
    private val _printerConnected = MutableStateFlow(true)
    val printerConnected: StateFlow<Boolean> = _printerConnected.asStateFlow()

    val printerModel = "Aura-BT58P Thermal (58mm)"

    private val _printStatus = MutableStateFlow(PrintStatus.IDLE)
    val printStatus: StateFlow<PrintStatus> = _printStatus.asStateFlow()

    // Theme state
    private val _isDarkMode = MutableStateFlow(false)
    val isDarkMode: StateFlow<Boolean> = _isDarkMode.asStateFlow()

    // Payment Dialog State
    private val _showPaymentDialog = MutableStateFlow(false)
    val showPaymentDialog: StateFlow<Boolean> = _showPaymentDialog.asStateFlow()

    private val _selectedPaymentMethod = MutableStateFlow("CASH") // CASH, UPI, CARD
    val selectedPaymentMethod: StateFlow<String> = _selectedPaymentMethod.asStateFlow()

    private val _amountTendered = MutableStateFlow(0.0)
    val amountTendered: StateFlow<Double> = _amountTendered.asStateFlow()

    // Receipt Dialog / Screen
    private val _completedSale = MutableStateFlow<SaleSummary?>(null)
    val completedSale: StateFlow<SaleSummary?> = _completedSale.asStateFlow()

    private val _showReceiptDialog = MutableStateFlow(false)
    val showReceiptDialog: StateFlow<Boolean> = _showReceiptDialog.asStateFlow()

    // Notification banners
    private val _bannerMessage = MutableStateFlow<String?>(null)
    val bannerMessage: StateFlow<String?> = _bannerMessage.asStateFlow()

    private var syncJob: Job? = null

    init {
        viewModelScope.launch {
            repository.initSeedProductsIfEmpty()
            // Restore draft cart from Room SQLite
            val products = repository.allProducts.first { it.isNotEmpty() }
            val draft = repository.loadDraftCart(products)
            if (draft.isNotEmpty()) {
                _cartItems.value = draft
            }
        }
    }

    // ================= Navigation =================
    fun setActiveTab(tab: ScreenTab) {
        _activeTab.value = tab
    }

    fun toggleDarkMode() {
        _isDarkMode.value = !_isDarkMode.value
    }

    fun setDarkMode(dark: Boolean) {
        _isDarkMode.value = dark
    }

    // ================= Cashier PIN =================
    fun unlockWithPin(pin: String): Boolean {
        return if (pin == "1234" || pin.length == 4) {
            _isLocked.value = false
            true
        } else {
            false
        }
    }

    fun lockTerminal() {
        _isLocked.value = true
    }

    // ================= Search & Categories =================
    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setSelectedCategory(category: String) {
        _selectedCategory.value = category
    }

    // ================= Cart Operations =================
    fun calculateTotals(): CartTotals {
        val items = _cartItems.value
        val subtotal = items.sumOf { it.total }
        val cgst = subtotal * 0.09
        val sgst = subtotal * 0.09
        val totalGst = cgst + sgst
        val rawTotal = subtotal + totalGst
        val roundedTotal = round(rawTotal)
        val roundOff = roundedTotal - rawTotal
        val totalItems = items.sumOf { it.quantity }

        return CartTotals(
            subtotal = subtotal,
            cgst = cgst,
            sgst = sgst,
            totalGst = totalGst,
            roundOff = roundOff,
            totalAmount = roundedTotal,
            totalItems = totalItems
        )
    }

    fun addItemToCart(product: ProductEntity) {
        val current = _cartItems.value.toMutableList()
        val index = current.indexOfFirst { it.productId == product.id }
        if (index >= 0) {
            val existing = current[index]
            current[index] = existing.copy(quantity = existing.quantity + 1)
        } else {
            current.add(
                CartItem(
                    productId = product.id,
                    name = product.name,
                    price = product.price,
                    quantity = 1,
                    unit = product.unit,
                    barcode = product.barcode,
                    category = product.category
                )
            )
        }
        _cartItems.value = current
        saveDraftCart(current)
    }

    fun decrementItemQuantity(productId: String) {
        val current = _cartItems.value.toMutableList()
        val index = current.indexOfFirst { it.productId == productId }
        if (index >= 0) {
            val item = current[index]
            if (item.quantity > 1) {
                current[index] = item.copy(quantity = item.quantity - 1)
            } else {
                _lastRemovedItem.value = item
                current.removeAt(index)
            }
            _cartItems.value = current
            saveDraftCart(current)
        }
    }

    fun removeItemFromCart(productId: String) {
        val current = _cartItems.value.toMutableList()
        val index = current.indexOfFirst { it.productId == productId }
        if (index >= 0) {
            _lastRemovedItem.value = current[index]
            current.removeAt(index)
            _cartItems.value = current
            saveDraftCart(current)
        }
    }

    fun undoRemoveItem() {
        val item = _lastRemovedItem.value ?: return
        val current = _cartItems.value.toMutableList()
        current.add(item)
        _cartItems.value = current
        _lastRemovedItem.value = null
        saveDraftCart(current)
    }

    fun clearCart() {
        _cartItems.value = emptyList()
        _lastRemovedItem.value = null
        viewModelScope.launch {
            repository.clearDraftCart()
        }
    }

    private fun saveDraftCart(items: List<CartItem>) {
        viewModelScope.launch {
            repository.saveDraftCart(items)
        }
    }

    // ================= Payment Flow =================
    fun openPaymentDialog() {
        val totals = calculateTotals()
        if (totals.totalItems == 0) return
        _selectedPaymentMethod.value = "CASH"
        _amountTendered.value = totals.totalAmount
        _showPaymentDialog.value = true
    }

    fun closePaymentDialog() {
        _showPaymentDialog.value = false
    }

    fun setPaymentMethod(method: String) {
        _selectedPaymentMethod.value = method
        if (method == "CASH" && _amountTendered.value == 0.0) {
            _amountTendered.value = calculateTotals().totalAmount
        }
    }

    fun setAmountTendered(amount: Double) {
        _amountTendered.value = amount
    }

    fun completeSale() {
        val items = _cartItems.value
        if (items.isEmpty()) return

        val totals = calculateTotals()
        val method = _selectedPaymentMethod.value
        val tendered = if (method == "CASH") _amountTendered.value else totals.totalAmount
        val changeDue = if (method == "CASH") (tendered - totals.totalAmount).coerceAtLeast(0.0) else 0.0
        val upiRef = if (method == "UPI") "UPI" + (100000..999999).random() else ""

        viewModelScope.launch {
            val sale = repository.createSale(
                items = items,
                paymentMethod = method,
                amountTendered = tendered,
                changeDue = changeDue,
                upiRef = upiRef,
                cashierName = currentCashier,
                counterName = counterName,
                isOnline = _isOnline.value
            )

            // Clear active cart
            _cartItems.value = emptyList()
            _showPaymentDialog.value = false
            _completedSale.value = sale
            _showReceiptDialog.value = true

            // Trigger print if connected
            if (_printerConnected.value) {
                simulatePrint()
            } else {
                _printStatus.value = PrintStatus.DISCONNECTED_ERROR
            }

            // Reassurance toast if offline
            if (!_isOnline.value) {
                showBanner("Saved on this device. Will sync when online.")
            }
        }
    }

    fun closeReceiptDialog() {
        _showReceiptDialog.value = false
        _completedSale.value = null
        _printStatus.value = PrintStatus.IDLE
    }

    fun viewPastSaleReceipt(sale: SaleSummary) {
        _completedSale.value = sale
        _showReceiptDialog.value = true
        _printStatus.value = PrintStatus.IDLE
    }

    // ================= Printer Simulation =================
    fun togglePrinterConnection() {
        _printerConnected.value = !_printerConnected.value
        if (!_printerConnected.value && _printStatus.value == PrintStatus.PRINTING) {
            _printStatus.value = PrintStatus.DISCONNECTED_ERROR
        }
    }

    fun printCurrentReceipt() {
        if (!_printerConnected.value) {
            _printStatus.value = PrintStatus.DISCONNECTED_ERROR
            return
        }
        simulatePrint()
    }

    private fun simulatePrint() {
        viewModelScope.launch {
            _printStatus.value = PrintStatus.PRINTING
            delay(1000)
            if (_printerConnected.value) {
                _printStatus.value = PrintStatus.SUCCESS
            } else {
                _printStatus.value = PrintStatus.DISCONNECTED_ERROR
            }
        }
    }

    // ================= Network & Sync Operations =================
    fun toggleOnlineStatus() {
        val nextOnline = !_isOnline.value
        _isOnline.value = nextOnline
        if (nextOnline) {
            // Trigger automatic sync queue drain
            triggerBackgroundSync()
        }
    }

    fun setOnlineStatus(online: Boolean) {
        _isOnline.value = online
        if (online) {
            triggerBackgroundSync()
        }
    }

    fun toggleServerFailureSimulation() {
        val nextVal = !_simulateServerFailure.value
        _simulateServerFailure.value = nextVal
        MockServer.simulateServerFailure = nextVal
    }

    fun triggerBackgroundSync() {
        if (!_isOnline.value || _isSyncing.value) return

        syncJob?.cancel()
        syncJob = viewModelScope.launch {
            _isSyncing.value = true
            val result = repository.drainSyncQueue()
            _isSyncing.value = false
            if (result.syncedCount > 0 || result.failedCount > 0) {
                showBanner(result.message)
            }
        }
    }

    fun retrySingleSale(saleId: String) {
        if (!_isOnline.value) {
            showBanner("Cannot sync while terminal is Offline.")
            return
        }
        viewModelScope.launch {
            _isSyncing.value = true
            val success = repository.retrySale(saleId)
            _isSyncing.value = false
            if (success) {
                showBanner("Sale synced successfully.")
            } else {
                showBanner("Sync failed. Check connection or server simulation.")
            }
        }
    }

    fun showBanner(msg: String) {
        viewModelScope.launch {
            _bannerMessage.value = msg
            delay(4000)
            if (_bannerMessage.value == msg) {
                _bannerMessage.value = null
            }
        }
    }

    fun dismissBanner() {
        _bannerMessage.value = null
    }
}
