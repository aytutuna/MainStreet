import java.util.Properties
import javax.inject.Inject

plugins {
    alias(libs.plugins.android.application)
}

// The game lives at the repository root; the APK gets the same files the iPhone bundle does.
abstract class CopyGame @Inject constructor(private val fs: FileSystemOperations) : DefaultTask() {
    @get:InputFiles
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val files: ConfigurableFileCollection

    @get:OutputDirectory
    abstract val out: DirectoryProperty

    @TaskAction
    fun copy() {
        fs.sync {
            from(files.asFileTree)
            into(out)
        }
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
        buildConfigField("String", "RC_KEY", "\"goog_nHCOIYdmsGqpubsJiIwMEGqMvYI\"")
        buildConfigField("boolean", "TESTER", "false")
    }

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

    buildFeatures {
        buildConfig = true
    }

    // Debug and tester builds show Google's test ads and the game's test menu; the real units only go in the release build
    buildTypes {
        debug {
            buildConfigField("boolean", "TESTER", "true")
            buildConfigField("String", "AD_REWARD", "\"ca-app-pub-3940256099942544/5224354917\"")
        }
        release {
            buildConfigField("String", "AD_REWARD", "\"ca-app-pub-8985801196261971/6757412125\"")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfigs.findByName("release")?.let { signingConfig = it }
        }
        create("qa") {
            initWith(getByName("release"))
            matchingFallbacks += "release"
            buildConfigField("boolean", "TESTER", "true")
            buildConfigField("String", "AD_REWARD", "\"ca-app-pub-3940256099942544/5224354917\"")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

androidComponents {
    onVariants { variant ->
        val copy = tasks.register<CopyGame>("copyGame${variant.name.replaceFirstChar { it.uppercase() }}") {
            val game = rootProject.layout.projectDirectory.dir("..")
            files.from(game.asFileTree.matching {
                include("index.html", "style.css", "i18n.js", "data.js", "sim.js", "store.js", "plan.js", "land.js", "walls.js", "shop.js", "ui.js")
                include("vendor/**", "assets/**", "lang/**")
            })
        }
        variant.sources.assets?.addGeneratedSourceDirectory(copy, CopyGame::out)
    }
}

dependencies {
    implementation(libs.core.ktx)
    implementation(libs.activity.ktx)
    implementation(libs.webkit)
    implementation(libs.purchases)
    implementation(libs.play.ads)
    implementation(libs.ump)
    implementation(libs.media3.exoplayer)
    implementation(libs.media3.hls)
}
