package com.aytutuna.mainstreet

import android.media.AudioManager
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import org.json.JSONObject

// Live radio streams, played here since the web view may not open network connections, and the check for other music.
// The page sends {cmd: 'radio', url, vol}, {cmd: 'radio', vol}, {cmd: 'radio', stop: true} and {cmd: 'radio', check: true};
// shop.js lists the answers.
class RadioBridge(private val activity: MainActivity) {
    private val audio = activity.getSystemService(AudioManager::class.java)
    private var player: ExoPlayer? = null
    private var url = ""

    fun command(msg: JSONObject) {
        when {
            msg.optBoolean("stop") -> stop()
            msg.optBoolean("check") -> check()
            msg.has("url") -> play(msg.getString("url"), msg.optDouble("vol", 1.0).toFloat())
            else -> player?.volume = msg.optDouble("vol", 1.0).toFloat()
        }
    }

    private fun play(address: String, volume: Float) {
        stop()
        url = address
        player = ExoPlayer.Builder(activity).build().apply {
            // the player pauses itself when another app takes the audio focus
            setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_GAME).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(), true)
            this.volume = volume
            addListener(object : Player.Listener {
                override fun onPlaybackStateChanged(state: Int) {
                    if (state == Player.STATE_BUFFERING) event("buffering") else if (state == Player.STATE_READY) event("playing")
                }

                override fun onMediaMetadataChanged(data: MediaMetadata) {
                    if (playbackState == Player.STATE_READY) event("playing", data.title?.toString())
                }

                override fun onPlayWhenReadyChanged(playWhenReady: Boolean, reason: Int) {
                    if (!playWhenReady && reason == Player.PLAY_WHEN_READY_CHANGE_REASON_AUDIO_FOCUS_LOSS) other(true)
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

    // The web view's own audio counts as music too, so the page quiets it before asking
    fun check() = other(audio.isMusicActive)

    private fun other(on: Boolean) {
        activity.emit(JSONObject().put("t", "other").put("on", on))
    }

    private fun event(state: String, title: String? = null) {
        val msg = JSONObject().put("t", "radio").put("state", state).put("url", url)
        if (title != null) msg.put("title", title)
        activity.emit(msg)
    }
}
