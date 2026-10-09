package expo.modules.smswatch

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/** Runs the JS task "OopsScamSmsCheck" (rules and classifier only, no LLM: FR-SM-03). */
class SmsCheckTaskService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        val text = intent?.getStringExtra(ScamAlerts.EXTRA_TEXT) ?: return null
        val data = Arguments.createMap().apply { putString("text", text) }
        return HeadlessJsTaskConfig(TASK_NAME, data, TIMEOUT_MS, true)
    }

    companion object {
        const val TASK_NAME = "OopsScamSmsCheck"
        private const val TIMEOUT_MS = 5000L
    }
}
