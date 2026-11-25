package com.aytutuna.mainstreet

import com.google.android.gms.games.PlayGames
import com.google.android.gms.games.PlayGamesSdk
import com.google.android.gms.games.SnapshotsClient
import com.google.android.gms.games.snapshot.Snapshot
import com.google.android.gms.games.snapshot.SnapshotMetadataChange
import org.json.JSONObject

// The save the page shares between devices, kept as one Play Games saved game: {cmd: "cloudPut", json, at, dev} writes it,
// {cmd: "cloudGet"} / {cmd: "cloudState"} ask for it. Answers go back as {t: "cloud", json, at, dev} and {t: "cloudState", state}.
// Play Games signs the player in by itself at launch; a player who is not in is asked once per launch, and declining keeps the
// game on the local save. Nothing tells this device that another one wrote, so the page asks again when it comes back.
// The state stays "pending" until a read has got through, so the page does not start a fresh game over a save it could not see.
// A read that cannot open the snapshot gets no answer at all (a null copy would read as "no save"); the page asks again every few seconds and writes nothing until a read has answered.
class CloudBridge(private val activity: MainActivity) {
    private val signIn by lazy { PlayGames.getGamesSignInClient(activity) }
    private val snapshots by lazy { PlayGames.getSnapshotsClient(activity) }
    private var declined = false
    private var signing = false
    private val waiters = ArrayList<(Boolean?) -> Unit>()
    private var read = false
    private var writing = false
    private var waiting: JSONObject? = null

    init {
        try {
            PlayGamesSdk.initialize(activity.applicationContext)
        } catch (e: Exception) {
            // an app id that is not set up yet: the calls below then fail and the page keeps the local save
        }
    }

    // true when signed in, false when not, null when Play Games cannot be reached at all
    private fun signedIn(then: (Boolean?) -> Unit) {
        try {
            signIn.isAuthenticated.addOnCompleteListener { check ->
                when {
                    !check.isSuccessful -> then(null)
                    check.result.isAuthenticated -> then(true)
                    declined -> then(false)
                    else -> {
                        waiters.add(then)
                        if (!signing) {
                            signing = true
                            signIn.signIn().addOnCompleteListener {
                                val ok = it.isSuccessful && it.result.isAuthenticated
                                signing = false
                                declined = !ok
                                val list = ArrayList(waiters)
                                waiters.clear()
                                list.forEach { w -> w(ok) }
                            }
                        }
                    }
                }
            }
        } catch (e: Exception) {
            then(null)
        }
    }

    fun state() = signedIn {
        activity.emit(JSONObject().put("t", "cloudState").put("state", when (it) { true -> if (read) "available" else "pending"; false -> "signedOut"; null -> "unavailable" }))
    }

    fun get() = signedIn { ok ->
        if (ok != true) {
            none()
            return@signedIn
        }
        open({}) { snap ->
            val saved = try {
                JSONObject(String(snap.snapshotContents.readFully()))
            } catch (e: Exception) {
                null
            }
            snapshots.discardAndClose(snap)
            if (!read) {
                read = true
                activity.emit(JSONObject().put("t", "cloudState").put("state", "available"))
            }
            activity.emit(JSONObject().put("t", "cloud").put("json", saved?.optString("json") ?: JSONObject.NULL)
                .put("at", saved?.optLong("at") ?: 0).put("dev", saved?.optString("dev") ?: ""))
        }
    }

    fun put(msg: JSONObject) {
        if (writing) {
            waiting = msg
            return
        }
        writing = true
        signedIn { ok ->
            if (ok != true) return@signedIn done()
            open({ done(false) }) { snap ->
                val body = JSONObject().put("json", msg.optString("json")).put("at", msg.optLong("at")).put("dev", msg.optString("dev"))
                snap.snapshotContents.writeBytes(body.toString().toByteArray())
                snapshots.commitAndClose(snap, SnapshotMetadataChange.Builder().setDescription(activity.getString(R.string.notification_title)).build())
                    .addOnCompleteListener { done(it.isSuccessful) }
            }
        }
    }

    // a write that was tried and did not land is reported so the page sends the save again
    private fun done(ok: Boolean = true) {
        if (!ok) activity.emit(JSONObject().put("t", "cloudPut").put("ok", false))
        writing = false
        waiting?.let {
            waiting = null
            put(it)
        }
    }

    private fun none() = activity.emit(JSONObject().put("t", "cloud").put("json", JSONObject.NULL).put("at", 0).put("dev", ""))

    private fun open(fail: () -> Unit, use: (Snapshot) -> Unit) {
        snapshots.open("save", true, SnapshotsClient.RESOLUTION_POLICY_MOST_RECENTLY_MODIFIED).addOnCompleteListener { t ->
            val snap = if (t.isSuccessful) t.result.data else null
            if (snap == null) fail() else use(snap)
        }
    }
}
