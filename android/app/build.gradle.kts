import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
}

// The game lives at the repository root; the APK gets the same files the iPhone bundle does.
val copyGame by tasks.registering(Sync::class) {
    val root = rootProject.projectDir.parentFile
    into(layout.buildDirectory.dir("game"))
    from(root) {
        include("index.html", "style.css", "data.js", "sim.js", "store.js", "plan.js", "land.js", "ui.js")
        include("vendor/**", "assets/**")
    }
}

val signing = Properties().apply {
    (findProperty("mainstreetSigning") as String?)?.let { file(it).inputStream().use(::load) }
}

fun signingValue(key: String, env: String) = signing.getProperty(key) ?: System.getenv(env)

android {
    namespace = "com.aytutuna.mainstreet"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.aytutuna.mainstreet"
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"
    }

    sourceSets["main"].assets.directories.add(copyGame.map { it.destinationDir.path }.get())

    signingConfigs {
        val store = signingValue("storeFile", "MAINSTREET_KEYSTORE")
        if (store != null) {
            create("release") {
                storeFile = file(store)
                storePassword = signingValue("storePassword", "MAINSTREET_KEYSTORE_PASSWORD")
                keyAlias = signingValue("keyAlias", "MAINSTREET_KEY_ALIAS")
                keyPassword = signingValue("keyPassword", "MAINSTREET_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfigs.findByName("release")?.let { signingConfig = it }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

tasks.named("preBuild") { dependsOn(copyGame) }

dependencies {
    implementation(libs.core.ktx)
    implementation(libs.activity.ktx)
    implementation(libs.webkit)
}
