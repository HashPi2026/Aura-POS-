package com.example.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: String,
    val name: String,
    val category: String,
    val price: Double,
    val barcode: String,
    val stock: Int,
    val unit: String,
    val taxRate: Double = 0.18,
    val colorHex: Long = 0xFF006874
)

@Entity(tableName = "sales")
data class SaleEntity(
    @PrimaryKey val id: String,
    val receiptNumber: String,
    val timestamp: Long,
    val cashierName: String,
    val counterName: String,
    val itemsJson: String,
    val itemCount: Int,
    val subtotal: Double,
    val cgst: Double,
    val sgst: Double,
    val totalGst: Double,
    val roundOff: Double,
    val totalAmount: Double,
    val paymentMethod: String, // CASH, UPI, CARD
    val amountTendered: Double = 0.0,
    val changeDue: Double = 0.0,
    val upiRef: String = "",
    val syncStatus: String = "SAVED_OFFLINE", // SAVED_OFFLINE, SYNCING, SYNCED, FAILED
    val syncAttempts: Int = 0,
    val lastSyncError: String? = null,
    val syncedAt: Long? = null
)

@Entity(tableName = "draft_cart")
data class DraftCartEntity(
    @PrimaryKey val productId: String,
    val quantity: Int
)
