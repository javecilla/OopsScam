package expo.modules.smswatch

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

/** New incoming texts only. Never reads the inbox, never stores or logs message text (SEC-08). */
class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        // FR-SM-06: the setting is read on every text, so turning it off stops checks at once.
        if (!SmsWatchModule.isEnabled(context)) return

        // FR-SM-02: join multi-part messages from the same sender.
        val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        val bySender = linkedMapOf<String, StringBuilder>()
        for (part in parts) {
            bySender.getOrPut(part.originatingAddress ?: "") { StringBuilder() }.append(part.messageBody ?: "")
        }
        Log.d(TAG, "received texts=${bySender.size}")

        for (text in bySender.values.map { it.toString() }.filter { it.isNotBlank() }) {
            val service = Intent(context, SmsCheckTaskService::class.java)
                .putExtra(ScamAlerts.EXTRA_TEXT, text)
            try {
                // The service holds a wake lock while the JS task runs (HeadlessJsTaskService.startTask).
                context.startService(service)
            } catch (error: Exception) {
                // Fallback: a neutral alert; the app analyzes the text when it is opened.
                Log.w(TAG, "background check unavailable: ${error.javaClass.simpleName}")
                ScamAlerts.postNeutral(context, text)
            }
        }
    }

    companion object {
        private const val TAG = "SmsWatch"
    }
}
