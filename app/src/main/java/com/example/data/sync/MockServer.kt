package com.example.data.sync

import com.example.data.local.SaleEntity
import kotlinx.coroutines.delay
import java.util.concurrent.ConcurrentHashMap

/**
 * Mock cloud backend server for Aura POS.
 * Accepts sales after ~120ms delay, idempotent (ignores already-synced IDs),
 * and supports toggling simulated server failure for testing retries.
 */
object MockServer {
    private val processedSaleIds = ConcurrentHashMap.newKeySet<String>()

    // Simulate server 500 error / offline server response
    @Volatile
    var simulateServerFailure: Boolean = false

    suspend fun syncSale(sale: SaleEntity): Result<String> {
        // ~120 ms network delay
        delay(120)

        if (simulateServerFailure) {
            return Result.failure(Exception("HTTP 503: Cloud Sync Endpoint Unavailable (Simulated Failure)"))
        }

        // Idempotent: if already received, return success without duplicate processing
        if (processedSaleIds.contains(sale.id)) {
            return Result.success("Sale ${sale.receiptNumber} already received (Idempotent)")
        }

        processedSaleIds.add(sale.id)
        return Result.success("Sale ${sale.receiptNumber} successfully recorded in cloud backend")
    }

    fun isSaleSyncedOnServer(saleId: String): Boolean {
        return processedSaleIds.contains(saleId)
    }

    fun resetServerData() {
        processedSaleIds.clear()
    }
}
