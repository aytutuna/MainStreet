package com.aytutuna.mainstreet

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.json.JSONArray
import org.json.JSONObject

// The game hands over the whole list each time; the saved copy lets the alarms be cancelled and rebuilt after a reboot.
object Reminders {
    private const val CHANNEL = "reminders"
    private const val PREFS = "reminders"
    private const val LIST = "list"
    private const val BACKUP = Int.MIN_VALUE
    private const val WINDOW = 15 * 60 * 1000L

    @Synchronized
    fun set(context: Context, list: JSONArray) {
        cancelAlarms(context)
        val now = System.currentTimeMillis()
        val kept = JSONArray()
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            if (!item.has("id") || !item.has("body") || !item.has("at")) continue
            kept.put(item)
            arm(context, item, maxOf(item.getLong("at"), now + 1000))
        }
        prefs(context).edit().putString(LIST, kept.toString()).apply()
    }

    @Synchronized
    fun clear(context: Context) {
        cancelAlarms(context)
        prefs(context).edit().remove(LIST).apply()
        context.getSystemService(NotificationManager::class.java).cancelAll()
    }

    // Alarms do not survive a reboot or an update; what came due meanwhile is shown now.
    @Synchronized
    fun restore(context: Context) {
        val now = System.currentTimeMillis()
        val left = JSONArray()
        for (item in saved(context)) {
            if (item.getLong("at") > now) {
                arm(context, item, item.getLong("at"))
                left.put(item)
            } else {
                show(context, item.getString("id").hashCode(), item.getString("body"))
            }
        }
        prefs(context).edit().putString(LIST, left.toString()).apply()
    }

    @Synchronized
    fun fired(context: Context, code: Int) {
        val left = JSONArray()
        for (item in saved(context)) if (item.getString("id").hashCode() != code) left.put(item)
        prefs(context).edit().putString(LIST, left.toString()).apply()
    }

    fun show(context: Context, id: Int, body: String) {
        val nm = context.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL, context.getString(R.string.channel_name), NotificationManager.IMPORTANCE_DEFAULT)
        )
        val open = PendingIntent.getActivity(
            context, 0, Intent(context, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE
        )
        val note = Notification.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(context.getString(R.string.notification_title))
            .setContentText(body)
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        nm.notify(id, note)
    }

    // The window alarm lands near the requested time; Doze holds it back, so a later idle-safe alarm backs it up.
    // Whichever fires first cancels the other.
    private fun arm(context: Context, item: JSONObject, at: Long) {
        val code = item.getString("id").hashCode()
        val body = item.getString("body")
        val am = context.getSystemService(AlarmManager::class.java)
        am.setWindow(AlarmManager.RTC_WAKEUP, at, WINDOW, pending(context, code, code, body, PendingIntent.FLAG_UPDATE_CURRENT)!!)
        am.setAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP, at + WINDOW,
            pending(context, code xor BACKUP, code, body, PendingIntent.FLAG_UPDATE_CURRENT)!!
        )
    }

    fun cancel(context: Context, code: Int) {
        val am = context.getSystemService(AlarmManager::class.java)
        for (c in intArrayOf(code, code xor BACKUP)) {
            pending(context, c, code, null, PendingIntent.FLAG_NO_CREATE)?.let {
                am.cancel(it)
                it.cancel()
            }
        }
    }

    private fun pending(context: Context, request: Int, id: Int, body: String?, flag: Int): PendingIntent? {
        val intent = Intent(context, ReminderReceiver::class.java).putExtra("id", id)
        if (body != null) intent.putExtra("body", body)
        return PendingIntent.getBroadcast(context, request, intent, PendingIntent.FLAG_IMMUTABLE or flag)
    }

    private fun cancelAlarms(context: Context) {
        for (item in saved(context)) cancel(context, item.getString("id").hashCode())
    }

    private fun saved(context: Context): List<JSONObject> {
        val list = JSONArray(prefs(context).getString(LIST, "[]"))
        return (0 until list.length()).map { list.getJSONObject(it) }
    }

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getIntExtra("id", 0)
        Reminders.cancel(context, id)
        Reminders.fired(context, id)
        Reminders.show(context, id, intent.getStringExtra("body") ?: return)
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> Reminders.restore(context)
        }
    }
}
