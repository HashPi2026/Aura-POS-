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
                    id = "prod_1",
                    name = "Amul Taaza Toned Milk",
                    category = "Dairy",
                    price = 28.00,
                    barcode = "8901262010015",
                    stock = 48,
                    unit = "500 ml",
                    colorHex = 0xFF0284C7
                ),
                ProductEntity(
                    id = "prod_2",
                    name = "Tata Tea Gold Rich Taste",
                    category = "Beverages",
                    price = 360.00,
                    barcode = "8901052002151",
                    stock = 32,
                    unit = "500 g",
                    colorHex = 0xFFD97706
                ),
                ProductEntity(
                    id = "prod_3",
                    name = "Aashirvaad Shudh Chakki Atta",
                    category = "Groceries",
                    price = 265.00,
                    barcode = "8901725181220",
                    stock = 25,
                    unit = "5 kg",
                    colorHex = 0xFFCA8A04
                ),
                ProductEntity(
                    id = "prod_4",
                    name = "Fortune Refined Sunflower Oil",
                    category = "Groceries",
                    price = 145.00,
                    barcode = "8906007281014",
                    stock = 40,
                    unit = "1 Litre",
                    colorHex = 0xFFEAB308
                ),
                ProductEntity(
                    id = "prod_5",
                    name = "Maggi 2-Min Masala Noodles",
                    category = "Snacks",
                    price = 56.00,
                    barcode = "8901058852330",
                    stock = 65,
                    unit = "4-Pack",
                    colorHex = 0xFFDC2626
                ),
                ProductEntity(
                    id = "prod_6",
                    name = "Parle-G Glucose Biscuits",
                    category = "Snacks",
                    price = 25.00,
                    barcode = "8901719101012",
                    stock = 90,
                    unit = "250 g",
                    colorHex = 0xFFB45309
                ),
                ProductEntity(
                    id = "prod_7",
                    name = "Haldiram's Bhujia Sev",
                    category = "Snacks",
                    price = 115.00,
                    barcode = "8904004400129",
                    stock = 35,
                    unit = "400 g",
                    colorHex = 0xFFF59E0B
                ),
                ProductEntity(
                    id = "prod_8",
                    name = "Nescafé Classic Instant Coffee",
                    category = "Beverages",
                    price = 195.00,
                    barcode = "8901058000410",
                    stock = 22,
                    unit = "50 g Jar",
                    colorHex = 0xFF78350F
                ),
                ProductEntity(
                    id = "prod_9",
                    name = "Dettol Antiseptic Liquid",
                    category = "Personal Care",
                    price = 142.00,
                    barcode = "8901396112003",
                    stock = 28,
                    unit = "250 ml",
                    colorHex = 0xFF16A34A
                ),
                ProductEntity(
                    id = "prod_10",
                    name = "Colgate Strong Teeth Toothpaste",
                    category = "Personal Care",
                    price = 120.00,
                    barcode = "8901314010527",
                    stock = 45,
                    unit = "200 g",
                    colorHex = 0xFFEF4444
                ),
                ProductEntity(
                    id = "prod_11",
                    name = "Vim Dishwash Bar Lemon",
                    category = "Groceries",
                    price = 35.00,
                    barcode = "8901030012019",
                    stock = 55,
                    unit = "300 g",
                    colorHex = 0xFF84CC16
                ),
                ProductEntity(
                    id = "prod_12",
                    name = "Surf Excel Quick Wash Powder",
                    category = "Groceries",
                    price = 165.00,
                    barcode = "8901030382020",
                    stock = 30,
                    unit = "1 kg",
                    colorHex = 0xFF2563EB
                ),
                ProductEntity(
                    id = "prod_13",
                    name = "Britannia Good Day Butter",
                    category = "Snacks",
                    price = 45.00,
                    barcode = "8901063012053",
                    stock = 60,
                    unit = "200 g",
                    colorHex = 0xFFF97316
                ),
                ProductEntity(
                    id = "prod_14",
                    name = "Tropicana 100% Mixed Fruit",
                    category = "Beverages",
                    price = 130.00,
                    barcode = "8902080001018",
                    stock = 20,
                    unit = "1 Litre",
                    colorHex = 0xFFEA580C
                ),
                ProductEntity(
                    id = "prod_15",
                    name = "Amul Butter Pasteurized",
                    category = "Dairy",
                    price = 58.00,
                    barcode = "8901262020021",
                    stock = 38,
                    unit = "100 g",
                    colorHex = 0xFFFACC15
                ),
                ProductEntity(
                    id = "prod_16",
                    name = "Fresh Robusta Bananas",
                    category = "Fresh",
                    price = 60.00,
                    barcode = "8909999000011",
                    stock = 18,
                    unit = "1 Dozen",
                    colorHex = 0xFF84CC16
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
        val uniqueId = "AUR-${timestamp}-${UUID.randomUUID().toString().take(6).uppercase()}"
        val receiptSeq = (timestamp % 9000 + 1000)
        val receiptNum = "AUR-2026-$receiptSeq"

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
