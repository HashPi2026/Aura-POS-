package com.example.data.repository

import com.example.data.local.AppDatabase
import com.example.data.local.DraftCartEntity
import com.example.data.local.ProductEntity
import com.example.data.local.SaleEntity
import com.example.data.model.CartItem
import com.example.data.model.SaleSummary
import com.example.data.sync.MockServer
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

data class SyncResult(
    val syncedCount: Int,
    val durationMs: Long,
    val failedCount: Int,
    val message: String
)

class PosRepository(private val database: AppDatabase) {

    private val productDao = database.productDao()
    private val saleDao = database.saleDao()
    private val draftCartDao = database.draftCartDao()

    val allProducts: Flow<List<ProductEntity>> = productDao.getAllProducts()
    val allSales: Flow<List<SaleSummary>> = saleDao.getAllSales().map { list ->
        list.map { it.toSummary() }
    }
    val unsyncedCount: Flow<Int> = saleDao.getUnsyncedCount()
    val totalSalesCount: Flow<Int> = saleDao.getSalesCount()

    suspend fun initSeedProductsIfEmpty() {
        if (productDao.getProductCount() == 0) {
            val seedList = listOf(
                ProductEntity(
                    id = "55555555-5555-5555-5555-555555550001",
                    name = "Cardamom Spiced Cappuccino",
                    category = "Coffee & Espresso",
                    price = 190.00,
                    barcode = "890001",
                    stock = 50,
                    unit = "Cup",
                    colorHex = 0xFFD97706
                ),
                ProductEntity(
                    id = "55555555-5555-5555-5555-555555550002",
                    name = "Spice Signature Masala Chai Pot",
                    category = "Chai & Beverages",
                    price = 130.00,
                    barcode = "890002",
                    stock = 60,
                    unit = "Pot (2 cups)",
                    colorHex = 0xFFB45309
                ),
                ProductEntity(
                    id = "55555555-5555-5555-5555-555555550003",
                    name = "Saffron Pistachio Cold Brew",
                    category = "Coffee & Espresso",
                    price = 240.00,
                    barcode = "890003",
                    stock = 35,
                    unit = "300 ml",
                    colorHex = 0xFFCA8A04
                ),
                ProductEntity(
                    id = "55555555-5555-5555-5555-555555550004",
                    name = "Cinnamon Dark Roast Latte",
                    category = "Coffee & Espresso",
                    price = 210.00,
                    barcode = "890004",
                    stock = 45,
                    unit = "Cup",
                    colorHex = 0xFF78350F
                ),
                ProductEntity(
                    id = "55555555-5555-5555-5555-555555550005",
                    name = "Spiced Butter Croissant",
                    category = "Bakery & Pastries",
                    price = 150.00,
                    barcode = "890005",
                    stock = 25,
                    unit = "Piece",
                    colorHex = 0xFFF59E0B
                ),
                ProductEntity(
                    id = "55555555-5555-5555-5555-555555550006",
                    name = "Peri Peri Paneer Sourdough Toast",
                    category = "Food & Savory",
                    price = 270.00,
                    barcode = "890006",
                    stock = 30,
                    unit = "Plate",
                    colorHex = 0xFFDC2626
                ),
                ProductEntity(
                    id = "55555555-5555-5555-5555-555555550007",
                    name = "Masala Chai Tres Leches Slice",
                    category = "Bakery & Pastries",
                    price = 220.00,
                    barcode = "890007",
                    stock = 20,
                    unit = "Slice",
                    colorHex = 0xFFEAB308
                ),
                ProductEntity(
                    id = "55555555-5555-5555-5555-555555550008",
                    name = "Ginger Lemon Mint Fizz",
                    category = "Chai & Beverages",
                    price = 140.00,
                    barcode = "890008",
                    stock = 40,
                    unit = "Glass",
                    colorHex = 0xFF16A34A
                ),
                ProductEntity(
                    id = "55555555-5555-5555-5555-555555550009",
                    name = "Signature Cold Coffee with Vanilla Ice Cream",
                    category = "Coffee & Espresso",
                    price = 180.00,
                    barcode = "890009",
                    stock = 50,
                    unit = "Glass",
                    colorHex = 0xFF84CC16
                ),
                ProductEntity(
                    id = "55555555-5555-5555-5555-555555550010",
                    name = "Tandoori Paneer Panini Sandwich",
                    category = "Food & Savory",
                    price = 230.00,
                    barcode = "890010",
                    stock = 25,
                    unit = "Piece",
                    colorHex = 0xFFEA580C
                )
            )
            productDao.insertAll(seedList)
        }
    }

    suspend fun saveDraftCart(items: List<CartItem>) {
        draftCartDao.clearDraft()
        if (items.isNotEmpty()) {
            draftCartDao.insertDraftItems(
                items.map { DraftCartEntity(productId = it.productId, quantity = it.quantity) }
            )
        }
    }

    suspend fun loadDraftCart(allProductsList: List<ProductEntity>): List<CartItem> {
        val drafts = draftCartDao.getDraftItemsSync()
        val productMap = allProductsList.associateBy { it.id }
        return drafts.mapNotNull { draft ->
            productMap[draft.productId]?.let { prod ->
                CartItem(
                    productId = prod.id,
                    name = prod.name,
                    price = prod.price,
                    quantity = draft.quantity,
                    unit = prod.unit,
                    barcode = prod.barcode,
                    category = prod.category
                )
            }
        }
    }

    suspend fun clearDraftCart() {
        draftCartDao.clearDraft()
    }

    /**
     * Creates a new Sale and saves it locally to Room SQLite immediately.
     */
    suspend fun createSale(
        items: List<CartItem>,
        paymentMethod: String,
        amountTendered: Double,
        changeDue: Double,
        upiRef: String,
        cashierName: String,
        counterName: String,
        isOnline: Boolean
    ): SaleSummary {
        val timestamp = System.currentTimeMillis()
        val uniqueId = "KWI-${timestamp}-${UUID.randomUUID().toString().take(6).uppercase()}"
        val year = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR)
        val existingCount = saleDao.getTotalSalesCount()
        val seqStr = String.format(java.util.Locale.US, "%04d", existingCount + 1)
        val receiptNum = "KWI-SPC-$year-$seqStr"

        val subtotal = items.sumOf { it.total }
        // 18% GST in India = 9% CGST + 9% SGST
        val cgst = (subtotal * 0.09)
        val sgst = (subtotal * 0.09)
        val totalGst = cgst + sgst
        val rawTotal = subtotal + totalGst
        val roundedTotal = kotlin.math.round(rawTotal)
        val roundOff = roundedTotal - rawTotal

        val itemsJson = serializeItems(items)

        val saleEntity = SaleEntity(
            id = uniqueId,
            receiptNumber = receiptNum,
            timestamp = timestamp,
            cashierName = cashierName,
            counterName = counterName,
            itemsJson = itemsJson,
            itemCount = items.sumOf { it.quantity },
            subtotal = subtotal,
            cgst = cgst,
            sgst = sgst,
            totalGst = totalGst,
            roundOff = roundOff,
            totalAmount = roundedTotal,
            paymentMethod = paymentMethod,
            amountTendered = if (amountTendered > 0) amountTendered else roundedTotal,
            changeDue = changeDue,
            upiRef = upiRef,
            syncStatus = "SAVED_OFFLINE",
            syncAttempts = 0,
            lastSyncError = null,
            syncedAt = null
        )

        // Always write to Room first (Offline-First source of truth)
        saleDao.insertSale(saleEntity)
        clearDraftCart()

        // If online right now, attempt immediate background sync
        if (isOnline) {
            trySyncSingleSale(saleEntity)
        }

        return saleDao.getSaleById(uniqueId)?.toSummary() ?: saleEntity.toSummary()
    }

    private suspend fun trySyncSingleSale(sale: SaleEntity): Boolean {
        saleDao.updateSyncStatus(
            id = sale.id,
            status = "SYNCING",
            attempts = sale.syncAttempts + 1,
            error = null,
            syncedAt = null
        )

        val result = MockServer.syncSale(sale)
        return if (result.isSuccess) {
            saleDao.updateSyncStatus(
                id = sale.id,
                status = "SYNCED",
                attempts = sale.syncAttempts + 1,
                error = null,
                syncedAt = System.currentTimeMillis()
            )
            true
        } else {
            val errorMsg = result.exceptionOrNull()?.message ?: "Sync Failed"
            saleDao.updateSyncStatus(
                id = sale.id,
                status = "FAILED",
                attempts = sale.syncAttempts + 1,
                error = errorMsg,
                syncedAt = null
            )
            false
        }
    }

    /**
     * Drains the queue in order, one sale at a time, marking each Synced.
     */
    suspend fun drainSyncQueue(): SyncResult {
        val startTime = System.currentTimeMillis()
        val queue = saleDao.getUnsyncedSalesList()
        if (queue.isEmpty()) {
            return SyncResult(0, 0, 0, "No pending sales to sync.")
        }

        var synced = 0
        var failed = 0

        for (sale in queue) {
            val success = trySyncSingleSale(sale)
            if (success) {
                synced++
            } else {
                failed++
                // If server failure or network error, stop draining so order is preserved
                break
            }
        }

        val duration = System.currentTimeMillis() - startTime
        val message = if (failed == 0) {
            "Synced $synced sale${if (synced > 1) "s" else ""} in ${duration}ms. Nothing lost."
        } else {
            "Synced $synced sales, $failed failed. Will retry when connection improves."
        }

        return SyncResult(synced, duration, failed, message)
    }

    suspend fun retrySale(saleId: String): Boolean {
        val sale = saleDao.getSaleById(saleId) ?: return false
        return trySyncSingleSale(sale)
    }

    private fun serializeItems(items: List<CartItem>): String {
        val array = JSONArray()
        for (item in items) {
            val obj = JSONObject().apply {
                put("productId", item.productId)
                put("name", item.name)
                put("price", item.price)
                put("quantity", item.quantity)
                put("unit", item.unit)
                put("barcode", item.barcode)
                put("category", item.category)
            }
            array.put(obj)
        }
        return array.toString()
    }

    companion object {
        fun deserializeItems(json: String): List<CartItem> {
            val list = mutableListOf<CartItem>()
            try {
                val array = JSONArray(json)
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    list.add(
                        CartItem(
                            productId = obj.optString("productId"),
                            name = obj.optString("name"),
                            price = obj.optDouble("price", 0.0),
                            quantity = obj.optInt("quantity", 1),
                            unit = obj.optString("unit", "1 unit"),
                            barcode = obj.optString("barcode", ""),
                            category = obj.optString("category", "")
                        )
                    )
                }
            } catch (_: Exception) {}
            return list
        }
    }
}

fun SaleEntity.toSummary(): SaleSummary {
    return SaleSummary(
        id = id,
        receiptNumber = receiptNumber,
        timestamp = timestamp,
        cashierName = cashierName,
        counterName = counterName,
        items = PosRepository.deserializeItems(itemsJson),
        itemCount = itemCount,
        subtotal = subtotal,
        cgst = cgst,
        sgst = sgst,
        totalGst = totalGst,
        roundOff = roundOff,
        totalAmount = totalAmount,
        paymentMethod = paymentMethod,
        amountTendered = amountTendered,
        changeDue = changeDue,
        upiRef = upiRef,
        syncStatus = syncStatus,
        syncAttempts = syncAttempts,
        lastSyncError = lastSyncError,
        syncedAt = syncedAt
    )
}
