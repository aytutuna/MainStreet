package com.aytutuna.mainstreet

import android.view.HapticFeedbackConstants
import android.webkit.JavascriptInterface
import org.json.JSONObject

// The game talks to iOS through window.webkit.messageHandlers.<name>.postMessage; the shim keeps that call shape.
class Bridge(private val activity: MainActivity) {
    @JavascriptInterface
    fun buzz(kind: String) {
        val effect = when (kind) {
            "medium" -> HapticFeedbackConstants.CONTEXT_CLICK
            "success" -> HapticFeedbackConstants.CONFIRM
            else -> HapticFeedbackConstants.KEYBOARD_TAP
        }
        activity.runOnUiThread { activity.webView.performHapticFeedback(effect) }
    }

    @JavascriptInterface
    fun notify(json: String) {
        val msg = JSONObject(json)
        when (msg.optString("cmd")) {
            "ask" -> activity.runOnUiThread { activity.askNotifications() }
            "set" -> Reminders.set(activity.applicationContext, msg.optJSONArray("list") ?: return)
        }
    }

    companion object {
        const val NAME = "nativeBridge"

        // navigator.vibrate would win in the game's buzz(), so it is removed to send haptics through the bridge
        val SHIM = """
            (function () {
              var b = window.$NAME;
              function handler(send) {
                return { postMessage: function (m) { send(typeof m === 'string' ? m : JSON.stringify(m)); } };
              }
              window.webkit = { messageHandlers: { buzz: handler(b.buzz), notify: handler(b.notify) } };
              Object.defineProperty(Navigator.prototype, 'vibrate', { value: undefined });
            })();
        """.trimIndent()
    }
}
