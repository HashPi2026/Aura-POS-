package com.example.util

import java.text.DecimalFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object FormatUtils {

    /**
     * Formats amount according to the Indian Rupee numbering system:
     * e.g. ₹45.00, ₹1,250.00, ₹1,24,500.00
     */
    fun formatInr(amount: Double, showSymbol: Boolean = true): String {
        val symbol = if (showSymbol) "₹" else ""
        val rounded = String.format(Locale.US, "%.2f", amount)
        val parts = rounded.split(".")
        val integerPart = parts[0]
        val decimalPart = parts[1]

        if (integerPart.length <= 3) {
            return "$symbol$integerPart.$decimalPart"
        }

        val lastThree = integerPart.takeLast(3)
        val rest = integerPart.dropLast(3)

        // Split remaining digits into pairs of two from right to left
        val sb = StringBuilder()
        var i = rest.length
        while (i > 0) {
            val start = (i - 2).coerceAtLeast(0)
            val chunk = rest.substring(start, i)
            if (sb.isNotEmpty()) {
                sb.insert(0, ",")
            }
            sb.insert(0, chunk)
            i -= 2
        }

        return "$symbol$sb,$lastThree.$decimalPart"
    }

    fun formatInrInteger(amount: Double): String {
        return formatInr(amount).replace(".00", "")
    }

    fun formatDateTime(epochMillis: Long): String {
        val sdf = SimpleDateFormat("dd MMM yyyy, hh:mm a", Locale.ENGLISH)
        return sdf.format(Date(epochMillis))
    }

    fun formatReceiptDateTime(epochMillis: Long): String {
        val sdf = SimpleDateFormat("dd-MMM-yyyy HH:mm:ss", Locale.ENGLISH)
        return sdf.format(Date(epochMillis))
    }

    fun formatTimeOnly(epochMillis: Long): String {
        val sdf = SimpleDateFormat("hh:mm:ss a", Locale.ENGLISH)
        return sdf.format(Date(epochMillis))
    }
}
