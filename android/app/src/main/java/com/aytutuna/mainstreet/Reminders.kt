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

    fun clear(context: Context) {
        cancelAlarms(context)
        prefs(context).edit().remove(LIST).apply()
        context.getSystemService(NotificationManager::class.java).cancelAll()
    }

    fun restore(context: Context) {
        val now = System.currentTimeMillis()
        for (item in saved(context)) {
            if (item.getLong("at") > now) arm(context, item, item.getLong("at"))
        }
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
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(context.getString(R.string.notification_title))
            .setContentText(body)
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        nm.notify(id, note)
    }

    private fun arm(context: Context, item: JSONObject, at: Long) {
        val id = item.getString("id")
        val intent = Intent(context, ReminderReceiver::class.java)
            .putExtra("id", id.hashCode())
            .putExtra("body", item.getString("body"))
        val pending = PendingIntent.getBroadcast(
            context, id.hashCode(), intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        context.getSystemService(AlarmManager::class.java).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
    }

    private fun cancelAlarms(context: Context) {
        val am = context.getSystemService(AlarmManager::class.java)
        for (item in saved(context)) {
            val pending = PendingIntent.getBroadcast(
                context, item.getString("id").hashCode(), Intent(context, ReminderReceiver::class.java),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE
            )
            if (pending != null) {
                am.cancel(pending)
                pending.cancel()
            }
        }
    }

    private fun saved(context: Context): List<JSONObject> {
        val list = JSONArray(prefs(context).getString(LIST, "[]"))
        return (0 until list.length()).map { list.getJSONObject(it) }
    }

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Reminders.show(context, intent.getIntExtra("id", 0), intent.getStringExtra("body") ?: return)
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Reminders.restore(context)
    }
}
