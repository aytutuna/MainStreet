package com.aytutuna.mainstreet

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject
import java.io.ByteArrayInputStream

class MainActivity : ComponentActivity() {
    lateinit var webView: WebView
        private set

    lateinit var store: StoreBridge
        private set
    lateinit var ads: AdsBridge
        private set
    lateinit var radio: RadioBridge
        private set
    lateinit var cloud: CloudBridge
        private set
    private val held = ArrayList<JSONObject>()

    private lateinit var notice: LinearLayout
    private var loaded = false
    private var webviewPackage = WEBVIEW_PACKAGE

    private val permission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { notified(it) }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge(SystemBarStyle.dark(Color.TRANSPARENT), SystemBarStyle.dark(Color.TRANSPARENT))
        super.onCreate(savedInstanceState)

        val loader = WebViewAssetLoader.Builder()
            .setDomain(HOST)
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            setBackgroundColor(getColor(R.color.launch))
            overScrollMode = WebView.OVER_SCROLL_NEVER
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.blockNetworkLoads = true
            settings.textZoom = 100
            addJavascriptInterface(Bridge(this@MainActivity), Bridge.NAME)
            webViewClient = client(loader)
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(webView, Bridge.SHIM, setOf("https://$HOST"))
        }

        // Past a phone-sized width the game stays centred on the launch colour
        val maxWidth = (MAX_WIDTH_DP * resources.displayMetrics.density).toInt()
        val frame = FrameLayout(this).apply {
            setBackgroundColor(getColor(R.color.launch))
            addView(webView, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT, Gravity.CENTER_HORIZONTAL))
            addOnLayoutChangeListener { v, l, _, r, _, _, _, _, _ ->
                val width = minOf(r - l, maxWidth)
                if (webView.layoutParams.width != width) {
                    webView.layoutParams = (webView.layoutParams as FrameLayout.LayoutParams).apply { this.width = width }
                }
            }
        }
        frame.addView(updateNotice())
        setContentView(frame)
        store = StoreBridge(this)
        ads = AdsBridge(this)
        radio = RadioBridge(this)
        cloud = CloudBridge(this)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript("typeof closeTop === 'function' && closeTop()") { if (it != "true") finish() }
            }
        })
    }

    private fun client(loader: WebViewAssetLoader) = object : WebViewClient() {
        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
            loader.shouldInterceptRequest(request.url)
                ?: WebResourceResponse("text/plain", "utf-8", 404, "Not Found", emptyMap(), ByteArrayInputStream(ByteArray(0)))

        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            if (request.url.host == HOST) return false
            try {
                startActivity(Intent(Intent.ACTION_VIEW, request.url))
            } catch (_: ActivityNotFoundException) {
            }
            return true
        }

        // The renderer can die in the background; a fresh activity brings the page back
        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            val now = SystemClock.elapsedRealtime()
            crashes.removeAll { now - it > 60_000 }
            crashes.addLast(now)
            if (crashes.size > 2) finish() else recreate()
            return true
        }
    }

    // the page's single entry point for the store and the ads, see shop.js
    fun emit(msg: JSONObject) {
        runOnUiThread {
            if (!isDestroyed) {
                webView.evaluateJavascript("window.nativeStore ? (window.nativeStore($msg), 1) : 0") {
                    if (it != "1" && msg.optString("t") != "time" && (msg.optString("t") == "cloudPut" || !msg.optString("t").startsWith("cloud")) && held.size < 50) held.add(msg)
                }
            }
        }
    }

    // events the page was not there to take (it was reloading); replayed when it asks for the products again
    fun replay() {
        val list = ArrayList(held)
        held.clear()
        list.forEach { emit(it) }
    }

    fun askNotifications() {
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            permission.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            notified(true)
        }
    }

    private fun notified(granted: Boolean) =
        emit(JSONObject().put("t", "notify").put("state", if (granted) "granted" else "denied"))

    // ES modules with import maps need Chromium 89
    private fun startIfCurrent() {
        val pkg = WebViewCompat.getCurrentWebViewPackage(this)
        webviewPackage = pkg?.packageName ?: WEBVIEW_PACKAGE
        val major = pkg?.versionName?.substringBefore('.')?.toIntOrNull() ?: 0
        val current = major >= MIN_WEBVIEW
        notice.visibility = if (current) View.GONE else View.VISIBLE
        webView.visibility = if (current) View.VISIBLE else View.GONE
        if (current && !loaded) {
            loaded = true
            webView.loadUrl("https://$HOST/index.html")
        }
    }

    private fun updateNotice() = LinearLayout(this).apply {
        notice = this
        orientation = LinearLayout.VERTICAL
        gravity = Gravity.CENTER
        setPadding(48, 48, 48, 48)
        addView(TextView(context).apply {
            setText(R.string.webview_old)
            setTextColor(Color.WHITE)
            textSize = 18f
            gravity = Gravity.CENTER
        })
        addView(Button(context).apply {
            setText(R.string.update)
            setOnClickListener {
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$webviewPackage")))
                } catch (_: ActivityNotFoundException) {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=$webviewPackage")))
                }
            }
        })
    }

    override fun onResume() {
        super.onResume()
        radio.check()
        startIfCurrent()
        ads.resume()
        webView.onResume()
        Reminders.clear(this)
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    // streams only play while the game is in front
    override fun onStop() {
        radio.stop()
        super.onStop()
    }

    override fun onDestroy() {
        store.stop()
        radio.release()
        ads.stop()
        webView.destroy()
        super.onDestroy()
    }

    private companion object {
        // the saved game lives under this origin; changing it would start every player over
        const val HOST = "appassets.androidplatform.net"
        const val MAX_WIDTH_DP = 480
        const val MIN_WEBVIEW = 89
        const val WEBVIEW_PACKAGE = "com.google.android.webview"
        val crashes = ArrayDeque<Long>()
    }
}
