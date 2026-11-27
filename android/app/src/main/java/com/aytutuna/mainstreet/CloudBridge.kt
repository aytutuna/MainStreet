package com.aytutuna.mainstreet

import android.content.Context
import com.google.android.gms.games.PlayGames
import com.google.android.gms.games.PlayGamesSdk
import com.google.android.gms.games.SnapshotsClient
import com.google.android.gms.games.snapshot.Snapshot
import com.google.android.gms.games.snapshot.SnapshotMetadataChange
import org.json.JSONObject

// The save the page shares between devices, kept as one Play Games saved game: {cmd: "cloudPut", json, at, dev, stamp, base,
// force} writes it, {cmd: "cloudGet"} / {cmd: "cloudState"} ask for it and {cmd: "cloudSignIn"} opens the sign-in. The copy
// carries the stamp its writer gave it. A put is written only while the saved game still holds the stamp the page called its
// base (or when force is set, to erase); otherwise nothing is written and the copy held goes back with refused: true for the
// page to judge. Answers go back as {t: "cloud", json, at, dev, stamp, refused, put}, writes as {t: "cloudPut", ok, stamp} and the
// state as {t: "cloudState", state}.
// Play Games signs the player in by itself at launch; the sign-in screen is opened by this class once per install and after
// that only from the menu's Sign in button, and a player who is not in keeps the local save. A read or write that comes while
// the sign-in screen is up waits for its result. Nothing tells this device that
// another one wrote, so the page asks again when it comes back and every few minutes.
// When Play Games cannot be reached or a saved game cannot be read the answer is the state "unavailable" and no copy, never a null copy, which the
// page would read as "no save".
class CloudBridge(private val activity: MainActivity) {
    private val games by lazy { PlayGames.getGamesSignInClient(activity) }
    private val snapshots by lazy { PlayGames.getSnapshotsClient(activity) }
    private val prefs = activity.getSharedPreferences("cloud", Context.MODE_PRIVATE)
    private var signing = false
    private val waiters = ArrayList<(Boolean?) -> Unit>()
    private var read = false
    private var lastState = ""
    private var writing = false
    private var waiting: JSONObject? = null
    private var slot = "save"

    // the page names the saved game it keeps: "chain" for chain builds, "save" for main
    fun use(msg: JSONObject) {
        val name = msg.optString("slot")
        slot = if (name.isEmpty()) "save" else name
    }

    init {
        try {
            PlayGamesSdk.initialize(activity.applicationContext)
        } catch (e: Exception) {
            // an app id that is not set up yet: the calls below then fail and the page keeps the local save
        }
    }

    // true when signed in, false when not, null when Play Games cannot be reached at all
    private fun signedIn(ask: Boolean, then: (Boolean?) -> Unit) {
        try {
            games.isAuthenticated.addOnCompleteListener { check ->
                when {
                    !check.isSuccessful -> then(null)
                    check.result.isAuthenticated -> then(true)
                    signing -> waiters.add(then)
                    !ask && prefs.getBoolean("asked", false) -> then(false)
                    else -> {
                        prefs.edit().putBoolean("asked", true).apply()
                        waiters.add(then)
                        signing = true
                        games.signIn().addOnCompleteListener {
                            val ok = it.isSuccessful && it.result.isAuthenticated
                            signing = false
                            val list = ArrayList(waiters)
                            waiters.clear()
                            list.forEach { w -> w(ok) }
                        }
                    }
                }
            }
        } catch (e: Exception) {
            then(null)
        }
    }

    private fun state(value: String) {
        lastState = value
        activity.emit(JSONObject().put("t", "cloudState").put("state", value))
    }

    fun state() = signedIn(false) {
        state(when (it) { true -> if (read) "available" else "pending"; false -> "signedOut"; null -> "unavailable" })
    }

    // the Sign in button of the menu
    fun signIn() = signedIn(true) {
        state()
        if (it == true) get()
    }

    fun get() = signedIn(false) { ok ->
        if (ok != true) {
            state(if (ok == null) "unavailable" else "signedOut")
            return@signedIn
        }
        open({ state("unavailable") }) { snap ->
            val saved = held(snap)
            snapshots.discardAndClose(snap)
            // a save that could not be read is not "no save": the page would start a new game over it
            if (saved == null) return@open state("unavailable")
            read = true
            if (lastState != "available") state("available")
            copy(if (has(saved)) saved else null, false, "")
        }
    }

    fun put(msg: JSONObject) {
        if (writing) {
            waiting = msg
            return
        }
        writing = true
        val stamp = msg.optString("stamp")
        signedIn(false) { ok ->
            if (ok != true) return@signedIn done(stamp, false)
            open({ done(stamp, false) }) { snap ->
                val saved = held(snap)
                if (saved == null) {
                    snapshots.discardAndClose(snap)
                    return@open done(stamp, false)
                }
                if (!msg.optBoolean("force") && has(saved) && saved.optString("stamp") != msg.optString("base")) {
                    snapshots.discardAndClose(snap)
                    copy(saved, true, stamp)
                    return@open done(stamp, null)
                }
                val body = JSONObject().put("json", msg.optString("json")).put("at", msg.optLong("at")).put("dev", msg.optString("dev")).put("stamp", stamp)
                snap.snapshotContents.writeBytes(body.toString().toByteArray())
                snapshots.commitAndClose(snap, SnapshotMetadataChange.Builder().setDescription(activity.getString(R.string.notification_title)).build())
                    .addOnCompleteListener { done(stamp, it.isSuccessful) }
            }
        }
    }

    // a write is reported as done or failed so the page sends the save again; null is a refusal, answered by the copy held
    private fun done(stamp: String, ok: Boolean?) {
        if (ok != null) activity.emit(JSONObject().put("t", "cloudPut").put("ok", ok).put("stamp", stamp))
        writing = false
        waiting?.let {
            waiting = null
            put(it)
        }
    }

    // what the saved game holds: an object without json when it is empty, null when it could not be read
    private fun held(snap: Snapshot): JSONObject? = try {
        val bytes = snap.snapshotContents.readFully()
        if (bytes.isEmpty()) JSONObject() else JSONObject(String(bytes))
    } catch (e: Exception) {
        null
    }

    private fun has(saved: JSONObject) = saved.optString("json").isNotEmpty()

    private fun copy(saved: JSONObject?, refused: Boolean, put: String) = activity.emit(
        JSONObject().put("t", "cloud").put("json", saved?.optString("json") ?: JSONObject.NULL).put("at", saved?.optLong("at") ?: 0)
            .put("dev", saved?.optString("dev") ?: "").put("stamp", saved?.optString("stamp") ?: "").put("refused", refused).put("put", put)
    )

    private fun open(fail: () -> Unit, use: (Snapshot) -> Unit) {
        snapshots.open(slot, true, SnapshotsClient.RESOLUTION_POLICY_MOST_RECENTLY_MODIFIED).addOnCompleteListener { t ->
            val snap = if (t.isSuccessful) t.result.data else null
            if (snap == null) fail() else use(snap)
        }
    }
}
