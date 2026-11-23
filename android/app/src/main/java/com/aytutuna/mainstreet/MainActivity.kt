package com.aytutuna.mainstreet

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
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
import java.io.ByteArrayInputStream

class MainActivity : ComponentActivity() {
    lateinit var webView: WebView
        private set

    private val permission = registerForActivityResult(ActivityResultContracts.RequestPermission()) {}

    // Closes whatever panel is open; the answer says whether there was one
    private val closePanel = """
        (function () {
          var ids = ['boost', 'sheet', 'card'];
          for (var i = 0; i < ids.length; i++) {
            var el = document.getElementById(ids[i]);
            var x = document.getElementById(ids[i] + '-x');
            if (el && x && !el.hidden) { x.click(); return true; }
          }
          return false;
        })()
    """.trimIndent()

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
            addJavascriptInterface(Bridge(this@MainActivity), Bridge.NAME)
            webViewClient = client(loader)
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(webView, Bridge.SHIM, setOf("https://$HOST"))
        }
        setContentView(webView)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript(closePanel) { if (it != "true") finish() }
            }
        })

        webView.loadUrl("https://$HOST/index.html")
    }

    private fun client(loader: WebViewAssetLoader) = object : WebViewClient() {
        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
            loader.shouldInterceptRequest(request.url)
                ?: WebResourceResponse("text/plain", "utf-8", 404, "Not Found", emptyMap(), ByteArrayInputStream(ByteArray(0)))

        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            if (request.url.host != HOST) startActivity(Intent(Intent.ACTION_VIEW, request.url))
            return request.url.host != HOST
        }

        // The renderer can die in the background; a fresh activity brings the page back
        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            recreate()
            return true
        }
    }

    fun askNotifications() {
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            permission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        Reminders.clear(this)
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    private companion object {
        const val HOST = "appassets.androidplatform.net"
    }
}
