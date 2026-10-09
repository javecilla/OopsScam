package expo.modules.smswatch

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/** Risk notifications, posted natively (no expo-notifications or Firebase, so no network permissions). */
object ScamAlerts {
    const val EXTRA_TEXT = "oopsscam_sms_text"
    private const val CHANNEL_ID = "scam_alerts"
    private const val TAG = "SmsWatch"

    private val TITLES = mapOf("scam" to "SCAM", "suspicious" to "SUSPICIOUS")

    fun post(context: Context, verdict: String, flagTl: String, text: String) {
        // FR-SM-04: only Suspicious or Scam.
        val title = TITLES[verdict] ?: return
        show(context, title, flagTl, text)
        Log.d(TAG, "notified verdict=$verdict")
    }

    fun postNeutral(context: Context, text: String) {
        show(context, "May bagong text", "I-tap para i-check sa OopsScam.", text)
        Log.d(TAG, "notified neutral")
    }

    // Permission is checked by areNotificationsEnabled() and SecurityException is caught below.
    @SuppressLint("MissingPermission")
    private fun show(context: Context, title: String, body: String, text: String) {
        val manager = NotificationManagerCompat.from(context)
        if (!manager.areNotificationsEnabled()) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Scam alerts", NotificationManager.IMPORTANCE_HIGH)
            )
        }

        // FR-SM-05: tapping opens the app with the text in the intent extras only.
        val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        launch.putExtra(EXTRA_TEXT, text)
        // Unique per notification, also across process restarts, so each tap opens its own text.
        val id = (System.currentTimeMillis() % Int.MAX_VALUE).toInt()
        val tap = PendingIntent.getActivity(
            context, id, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        // SEC-09: the lock screen shows only this public version.
        val publicVersion = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("OopsScam: possible scam text")
            .build()
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setPublicVersion(publicVersion)
            .setContentIntent(tap)
            .setAutoCancel(true)
            .build()
        try {
            manager.notify(id, notification)
        } catch (error: SecurityException) {
            Log.w(TAG, "notification permission missing")
        }
    }
}
