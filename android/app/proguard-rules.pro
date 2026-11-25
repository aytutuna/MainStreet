-keepclassmembers class com.aytutuna.mainstreet.Bridge {
    @android.webkit.JavascriptInterface <methods>;
}

# WorkManager (pulled in by the ads sdk) builds its Room database by reflection
-keep class * extends androidx.room.RoomDatabase { <init>(); }
