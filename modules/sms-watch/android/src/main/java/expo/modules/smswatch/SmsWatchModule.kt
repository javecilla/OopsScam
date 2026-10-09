package expo.modules.smswatch

import android.content.Context
import android.content.Intent
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** SMS auto-check (SRS 3.13): the on/off setting, risk notifications and the tapped message. */
class SmsWatchModule : Module() {
    private val context: Context
        get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

    override fun definition() = ModuleDefinition {
        Name("SmsWatch")
        Events("onSmsOpen")

        // The only stored value: the receiver reads it on every text (FR-SM-06).
        Function("isEnabled") { isEnabled(context) }
        Function("setEnabled") { enabled: Boolean ->
            prefs(context).edit().putBoolean(KEY_ENABLED, enabled).commit()
        }

        Function("notify") { verdict: String, flagTl: String, text: String ->
            ScamAlerts.post(context, verdict, flagTl, text)
        }

        // Message from a tapped notification on cold start; removed so it is read only once.
        Function("consumeLaunchText") {
            val intent = appContext.currentActivity?.intent ?: return@Function null
            val text = intent.getStringExtra(ScamAlerts.EXTRA_TEXT)
            intent.removeExtra(ScamAlerts.EXTRA_TEXT)
            text
        }

        // Tapped while the app is already running.
        OnNewIntent { intent: Intent ->
            val text = intent.getStringExtra(ScamAlerts.EXTRA_TEXT) ?: return@OnNewIntent
            intent.removeExtra(ScamAlerts.EXTRA_TEXT)
            sendEvent("onSmsOpen", mapOf("text" to text))
        }
    }

    companion object {
        private const val PREFS = "sms_watch"
        private const val KEY_ENABLED = "enabled"

        private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

        fun isEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_ENABLED, false)
    }
}
