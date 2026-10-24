package com.example.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Divider
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.cos
import kotlin.math.sin

val KwikioIvoryBg = Color(0xFFFAF9F5)
val KwikioCarbon = Color(0xFF14161A)
val KwikioCoral = Color(0xFFFF5B2E)
val KwikioMutedSubtext = Color(0xFF4A5060)

/**
 * High-precision vector rendering of the Kwikio Aperture logo mark.
 * Consists of an open circular ring with rounded caps and a vibrant coral dot.
 */
@Composable
fun KwikioLogoMark(
    modifier: Modifier = Modifier,
    ringColor: Color = KwikioCarbon,
    dotColor: Color = KwikioCoral
) {
    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        val minDim = minOf(w, h)

        val strokeWidth = minDim * 0.08f
        val radius = minDim * 0.34f
        val centerOffset = Offset(w / 2f, h / 2f)

        // Draw open ring: starts at 0 rad (3 o'clock) and sweeps clockwise 286.5 degrees
        val arcTopLeft = Offset(centerOffset.x - radius, centerOffset.y - radius)
        val arcSize = Size(radius * 2f, radius * 2f)

        drawArc(
            color = ringColor,
            startAngle = 0f,
            sweepAngle = 286.5f,
            useCenter = false,
            topLeft = arcTopLeft,
            size = arcSize,
            style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
        )

        // Draw aperture orange dot centered in the opening gap at angle ~323.25 degrees
        val dotAngleRad = Math.toRadians(323.25)
        val dotRadius = minDim * 0.08f
        val dotCenter = Offset(
            x = centerOffset.x + (radius * cos(dotAngleRad)).toFloat(),
            y = centerOffset.y + (radius * sin(dotAngleRad)).toFloat()
        )

        drawCircle(
            color = dotColor,
            radius = dotRadius,
            center = dotCenter
        )
    }
}

/**
 * Squircle App Icon Badge matching the official Kwikio App Icon concept.
 */
@Composable
fun KwikioAppIconBadge(
    modifier: Modifier = Modifier,
    size: Dp = 40.dp,
    containerColor: Color = KwikioIvoryBg,
    ringColor: Color = KwikioCarbon
) {
    Box(
        modifier = modifier
            .size(size)
            .clip(RoundedCornerShape(size * 0.26f))
            .background(containerColor)
            .testTag("kwikio_app_icon_badge"),
        contentAlignment = Alignment.Center
    ) {
        KwikioLogoMark(
            modifier = Modifier.size(size * 0.80f),
            ringColor = ringColor,
            dotColor = KwikioCoral
        )
    }
}

/**
 * Full Brand Lockup: Logo Mark + "KWIKIO" typography + hairline + "POINT OF SALE".
 */
@Composable
fun KwikioFullLogo(
    modifier: Modifier = Modifier,
    markSize: Dp = 40.dp,
    isDark: Boolean = false,
    showSubtitle: Boolean = true
) {
    val textColor = if (isDark) Color.White else KwikioCarbon
    val subtextColor = if (isDark) Color(0xFF94A3B8) else KwikioMutedSubtext
    val dividerColor = (if (isDark) Color.White else KwikioCarbon).copy(alpha = 0.25f)

    Row(
        modifier = modifier.testTag("kwikio_full_logo"),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        KwikioLogoMark(
            modifier = Modifier.size(markSize),
            ringColor = textColor,
            dotColor = KwikioCoral
        )

        Column(
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "KWIKIO",
                fontWeight = FontWeight.Bold,
                fontSize = (markSize.value * 0.42f).sp,
                letterSpacing = 2.5.sp,
                color = textColor,
                lineHeight = (markSize.value * 0.44f).sp
            )

            if (showSubtitle) {
                Spacer(modifier = Modifier.height(2.dp))
                HorizontalDivider(
                    modifier = Modifier.width(markSize * 2.2f),
                    thickness = 1.dp,
                    color = dividerColor
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "POINT OF SALE",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = (markSize.value * 0.18f).sp,
                    letterSpacing = 1.8.sp,
                    color = subtextColor,
                    lineHeight = (markSize.value * 0.20f).sp
                )
            }
        }
    }
}
