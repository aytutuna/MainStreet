package com.aytutuna.mainstreet

import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import org.json.JSONObject

// Live radio streams, played here since the web view may not open network connections, and the check for other music.
// The page sends {cmd: 'radio', url, vol}, {cmd: 'radio', vol}, {cmd: 'radio', stop: true} and {cmd: 'radio', check: true};
// shop.js lists the answers.
class RadioBridge(private val activity: MainActivity) {
    private val audio = activity.getSystemService(AudioManager::class.java)
    private var player: ExoPlayer? = null
    private var url = ""
    private var other = false
    private val handler = Handler(Looper.getMainLooper())

    // Apps cannot see each other's players, only ask whether any music is playing, and the game's own audio counts. The
    // page keeps its audio context idle while another app plays, so this is asked again until the answer is no.
    private val poll = Runnable { check(false) }

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
        val on = audio.isMusicActive
        handler.removeCallbacks(poll)
        if (on) handler.postDelayed(poll, POLL)
        if (asked || on != other) activity.emit(JSONObject().put("t", "other").put("on", on))
        other = on
    }

    fun release() {
        stop()
        handler.removeCallbacksAndMessages(null)
    }

    private fun event(state: String, title: String? = null) {
        val msg = JSONObject().put("t", "radio").put("state", state).put("url", url)
        if (title != null) msg.put("title", title)
        activity.emit(msg)
    }

    private companion object {
        const val POLL = 3000L
    }
}
