package com.aytutuna.mainstreet

import android.media.AudioManager
import android.media.AudioPlaybackConfiguration
import android.os.Handler
import android.os.Looper
import org.json.JSONObject

// Tells the page whether another app is playing music, so the game keeps its own quiet meanwhile. The page sends
// {cmd: 'music', check: true}; shop.js lists the answer.
class MusicBridge(private val activity: MainActivity) {
    private val audio = activity.getSystemService(AudioManager::class.java)
    private var other = false
    private val handler = Handler(Looper.getMainLooper())

    // Apps cannot see each other's players, but the system reports when any playback starts or stops. While the page is
    // idle for other music (ui.js rest()) the only audio left is that music, so the change that ends it is trusted here;
    // while the game plays, its own web view audio would look like another app, so only an explicit ask looks. A second
    // media stream beside the web view's own is another app starting, and the page is asked to look.
    private val callback = object : AudioManager.AudioPlaybackCallback() {
        override fun onPlaybackConfigChanged(configs: MutableList<AudioPlaybackConfiguration>) {
            if (other) check(false)
            else if (configs.count { music(it) } >= 2) {
                handler.removeCallbacks(recheck)
                handler.postDelayed(recheck, 500)
            }
        }
    }

    private val recheck = Runnable {
        if (!other) activity.emit(JSONObject().put("t", "other").put("recheck", true))
    }

    init {
        audio.registerAudioPlaybackCallback(callback, handler)
    }

    fun command(msg: JSONObject) {
        if (msg.optBoolean("check")) check(true)
    }

    // the page waits for an answer to a question of its own, so those are always sent
    fun check(asked: Boolean = true) {
        val on = audio.activePlaybackConfigurations.any { music(it) }
        if (asked || on != other) activity.emit(JSONObject().put("t", "other").put("on", on))
        other = on
    }

    // the web view's output plays as media too and cannot be told from another app's, so the page holds its audio
    // context while it asks (ui.js askOther)
    private fun music(c: AudioPlaybackConfiguration): Boolean {
        val usage = c.audioAttributes.usage
        return usage == android.media.AudioAttributes.USAGE_MEDIA || usage == android.media.AudioAttributes.USAGE_UNKNOWN
    }

    fun release() {
        audio.unregisterAudioPlaybackCallback(callback)
        handler.removeCallbacksAndMessages(null)
    }
}
