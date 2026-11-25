package com.aytutuna.mainstreet

import android.media.AudioManager
import android.media.AudioPlaybackConfiguration
import android.os.Handler
import android.os.Looper
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import org.json.JSONObject

// Live radio streams, played here since the web view may not open network connections, and the check for other music.
// The page sends {cmd: 'radio', url, vol}, {cmd: 'radio', vol}, {cmd: 'radio', stop: true} and {cmd: 'radio', check: true};
// shop.js lists the answers.
@OptIn(UnstableApi::class)
class RadioBridge(private val activity: MainActivity) {
    private val audio = activity.getSystemService(AudioManager::class.java)
    private var player: ExoPlayer? = null
    private var url = ""
    private var other = false
    private val handler = Handler(Looper.getMainLooper())

    // Apps cannot see each other's players, but the system reports when any playback starts or stops. While the page is
    // idle for other music (ui.js rest()) the only audio left is that music, so the change that ends it is trusted here;
    // while the game plays, its own web view audio would look like another app, so only an explicit ask looks.
    private val callback = object : AudioManager.AudioPlaybackCallback() {
        override fun onPlaybackConfigChanged(configs: MutableList<AudioPlaybackConfiguration>) {
            if (other) check(false)
        }
    }

    init {
        audio.registerAudioPlaybackCallback(callback, handler)
    }

    fun command(msg: JSONObject) {
        when {
            msg.optBoolean("stop") -> stop()
            msg.optBoolean("check") -> check(true)
            msg.has("url") -> play(msg.getString("url"), msg.optDouble("vol", 1.0).toFloat())
            else -> player?.volume = msg.optDouble("vol", 1.0).toFloat()
        }
    }

    private fun play(address: String, volume: Float) {
        stop()
        url = address
        // start a station on half a second of sound instead of the default two and a half
        val load = DefaultLoadControl.Builder().setBufferDurationsMs(15000, 50000, 500, 2000).build()
        player = ExoPlayer.Builder(activity).setLoadControl(load).build().apply {
            // no audio focus: the radio mixes with other sound and never pauses the player's own music
            setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_GAME).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(), false)
            setHandleAudioBecomingNoisy(true)
            this.volume = volume
            addListener(object : Player.Listener {
                override fun onPlaybackStateChanged(state: Int) {
                    when (state) {
                        Player.STATE_BUFFERING -> event("buffering")
                        Player.STATE_READY -> event("playing")
                        Player.STATE_ENDED -> event("error")
                    }
                }

                override fun onMediaMetadataChanged(data: MediaMetadata) {
                    if (playbackState == Player.STATE_READY) event("playing", data.title?.toString())
                }

                override fun onPlayWhenReadyChanged(playWhenReady: Boolean, reason: Int) {
                    if (!playWhenReady && reason == Player.PLAY_WHEN_READY_CHANGE_REASON_AUDIO_BECOMING_NOISY) event("paused")
                }

                override fun onPlayerError(error: PlaybackException) = event("error")
            })
            setMediaItem(MediaItem.fromUri(address))
            prepare()
            play()
        }
    }

    fun stop() {
        player?.release()
        player = null
    }

    // the page waits for an answer to a question of its own, so those are always sent
    fun check(asked: Boolean = true) {
        val on = audio.activePlaybackConfigurations.any { music(it) }
        if (asked || on != other) activity.emit(JSONObject().put("t", "other").put("on", on))
        other = on
    }

    // the web view's output plays as media too and cannot be told from another app's, so the page holds its audio
    // context while it asks (ui.js askOther); the radio's own player is USAGE_GAME and does not count
    private fun music(c: AudioPlaybackConfiguration): Boolean {
        val usage = c.audioAttributes.usage
        return usage == android.media.AudioAttributes.USAGE_MEDIA || usage == android.media.AudioAttributes.USAGE_UNKNOWN
    }

    fun release() {
        stop()
        audio.unregisterAudioPlaybackCallback(callback)
        handler.removeCallbacksAndMessages(null)
    }

    private fun event(state: String, title: String? = null) {
        val msg = JSONObject().put("t", "radio").put("state", state).put("url", url)
        if (title != null) msg.put("title", title)
        activity.emit(msg)
    }
}
