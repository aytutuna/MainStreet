package com.aytutuna.mainstreet

import android.os.Build
import android.view.HapticFeedbackConstants
import android.webkit.JavascriptInterface
import org.json.JSONObject

// The game talks to iOS through window.webkit.messageHandlers.<name>.postMessage; the shim keeps that call shape.
class Bridge(private val activity: MainActivity) {
    @JavascriptInterface
    fun buzz(kind: String) {
        val effect = when (kind) {
            "medium" -> HapticFeedbackConstants.CONTEXT_CLICK
            "success" -> if (Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.LONG_PRESS
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

    @JavascriptInterface
    fun store(json: String) {
        val msg = JSONObject(json)
        activity.runOnUiThread {
            when (msg.optString("cmd")) {
                "products" -> {
                    activity.replay()
                    activity.store.products(msg.optJSONArray("ids"))
                }
                "buy" -> activity.store.buy(msg.optString("id"))
                "restore" -> activity.store.restore()
                "adStart" -> activity.ads.start()
                "adStop" -> activity.ads.stop()
                "adReady" -> activity.ads.report()
                "privacy" -> activity.ads.options()
                "adId" -> activity.ads.adId()
                "time" -> activity.store.time(msg.optInt("n"))
                "ad" -> activity.ads.show(msg.optString("kind"))
                "radio" -> activity.radio.command(msg)
            }
        }
    }

    companion object {
        const val NAME = "nativeBridge"

        // navigator.vibrate would win in the game's buzz(), so it is removed to send haptics through the bridge
        val SHIM = """
            (function () {
              var b = window.$NAME;
              function text(m) { return typeof m === 'string' ? m : JSON.stringify(m); }
              window.webkit = { messageHandlers: {
                buzz: { postMessage: function (m) { b.buzz(text(m)); } },
                notify: { postMessage: function (m) { b.notify(text(m)); } },
                store: { postMessage: function (m) { b.store(text(m)); } }
              } };
              Object.defineProperty(Navigator.prototype, 'vibrate', { value: undefined });
            })();
        """.trimIndent() + if (BuildConfig.TESTER) "\nwindow.TESTER = 1;" else ""
    }
}
