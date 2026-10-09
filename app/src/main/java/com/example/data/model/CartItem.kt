package com.example.data.model

data class CartItem(
    val productId: String,
    val name: String,
    val price: Double,
    val quantity: Int,
    val unit: String = "1 unit",
    val barcode: String = "",
    val category: String = ""
) {
    val total: Double get() = price * quantity
}

data class SaleSummary(
    val id: String,
    val receiptNumber: String,
    val timestamp: Long,
    val cashierName: String,
    val counterName: String,
    val items: List<CartItem>,
    val itemCount: Int,
    val subtotal: Double,
    val cgst: Double,
    val sgst: Double,
    val totalGst: Double,
    val roundOff: Double,
    val totalAmount: Double,
    val paymentMethod: String,
    val amountTendered: Double,
    val changeDue: Double,
    val upiRef: String,
    val syncStatus: String,
    val syncAttempts: Int,
    val lastSyncError: String?,
    val syncedAt: Long?
)
