package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {
    @Query("SELECT * FROM products ORDER BY name ASC")
    fun getAllProducts(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE category = :category ORDER BY name ASC")
    fun getProductsByCategory(category: String): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE name LIKE '%' || :query || '%' OR barcode LIKE '%' || :query || '%'")
    fun searchProducts(query: String): Flow<List<ProductEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(products: List<ProductEntity>)

    @Query("SELECT COUNT(*) FROM products")
    suspend fun getProductCount(): Int
}

@Dao
interface SaleDao {
    @Query("SELECT * FROM sales ORDER BY timestamp DESC")
    fun getAllSales(): Flow<List<SaleEntity>>

    @Query("SELECT * FROM sales WHERE syncStatus != 'SYNCED' ORDER BY timestamp ASC")
    fun getUnsyncedSales(): Flow<List<SaleEntity>>

    @Query("SELECT * FROM sales WHERE syncStatus != 'SYNCED' ORDER BY timestamp ASC")
    suspend fun getUnsyncedSalesList(): List<SaleEntity>

    @Query("SELECT * FROM sales WHERE id = :id LIMIT 1")
    suspend fun getSaleById(id: String): SaleEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSale(sale: SaleEntity)

    @Query("UPDATE sales SET syncStatus = :status, syncAttempts = :attempts, lastSyncError = :error, syncedAt = :syncedAt WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: String, attempts: Int, error: String?, syncedAt: Long?)

    @Query("SELECT COUNT(*) FROM sales WHERE syncStatus != 'SYNCED'")
    fun getUnsyncedCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM sales")
    fun getSalesCount(): Flow<Int>

    @Query("DELETE FROM sales")
    suspend fun clearAllSales()
}

@Dao
interface DraftCartDao {
    @Query("SELECT * FROM draft_cart")
    fun getDraftItems(): Flow<List<DraftCartEntity>>

    @Query("SELECT * FROM draft_cart")
    suspend fun getDraftItemsSync(): List<DraftCartEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDraftItems(items: List<DraftCartEntity>)

    @Query("DELETE FROM draft_cart")
    suspend fun clearDraft()
}
