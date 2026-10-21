package com.example.data.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.Constraints
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.ExistingWorkPolicy
import androidx.work.BackoffPolicy
import com.example.data.local.AppDatabase
import java.util.concurrent.TimeUnit

/**
 * Background worker service for Android that automatically drains and synchronizes
 * local Room offline sales whenever a stable network connection is detected by Android OS.
 */
class SyncSalesWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val database = AppDatabase.getInstance(applicationContext)
        val salesDao = database.saleDao()

        val unsyncedSales = salesDao.getUnsyncedSalesList()
        if (unsyncedSales.isEmpty()) {
            return Result.success()
        }

        var hasFailure = false

        for (sale in unsyncedSales) {
            salesDao.updateSyncStatus(sale.id, "SYNCING")
            val syncResult = MockServer.syncSale(sale)

            if (syncResult.isSuccess) {
                salesDao.updateSyncSuccess(sale.id, System.currentTimeMillis())
            } else {
                val errorMsg = syncResult.exceptionOrNull()?.message ?: "Sync connection failed"
                salesDao.updateSyncFailure(sale.id, errorMsg)
                hasFailure = true
                break // Stop batch so order sequence is maintained
            }
        }

        return if (hasFailure) {
            Result.retry() // Triggers WorkManager exponential backoff
        } else {
            Result.success()
        }
    }

    companion object {
        private const val WORK_NAME = "AuraSyncSalesWork"

        /**
         * Enqueues an automatic background sync job with NetworkType.CONNECTED constraint.
         */
        fun enqueue(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val syncRequest = OneTimeWorkRequestBuilder<SyncSalesWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    10,
                    TimeUnit.SECONDS
                )
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                WORK_NAME,
                ExistingWorkPolicy.KEEP,
                syncRequest
            )
        }
    }
}
