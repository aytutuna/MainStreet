import UIKit
import WebKit

// Not the view controller, so the web view's content controller holds nothing that leads back to it.
private final class BuzzHandler: NSObject, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.body as? String {
        case "medium":
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case "success":
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        default:
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }
}

// Serves the bundle under app://game/ so module scripts and .glb files load with real MIME types (file:// is unreliable for them).
private final class BundleHandler: NSObject, WKURLSchemeHandler {
    private static let types = [
        "html": "text/html", "js": "text/javascript", "css": "text/css", "json": "application/json",
        "webmanifest": "application/manifest+json", "png": "image/png", "glb": "model/gltf-binary",
        "gltf": "model/gltf+json", "bin": "application/octet-stream", "wav": "audio/wav",
    ]

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let file = Bundle.main.bundleURL.appendingPathComponent(String(path.dropFirst()))
        let data = path.contains("..") ? nil : try? Data(contentsOf: file)
        let type = BundleHandler.types[file.pathExtension.lowercased()] ?? "application/octet-stream"
        let headers = ["Content-Type": type, "Content-Length": String(data?.count ?? 0)]
        let response = HTTPURLResponse(url: url, statusCode: data == nil ? 404 : 200, httpVersion: "HTTP/1.1", headerFields: headers)!
        urlSchemeTask.didReceive(response)
        if let data = data { urlSchemeTask.didReceive(data) }
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
}

final class GameViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    static let background = UIColor(red: 58.0 / 255.0, green: 58.0 / 255.0, blue: 80.0 / 255.0, alpha: 1)

    private var webView: WKWebView!

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }

    // The web view is the root view so it covers the notch and home indicator and env(safe-area-inset-*) is real.
    override func loadView() {
        let config = WKWebViewConfiguration()
        config.userContentController.add(BuzzHandler(), name: "buzz")
        config.setURLSchemeHandler(BundleHandler(), forURLScheme: "app")
        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = true
        web.backgroundColor = GameViewController.background
        web.underPageBackgroundColor = GameViewController.background
        web.scrollView.backgroundColor = GameViewController.background
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.allowsLinkPreview = false
        web.navigationDelegate = self
        web.uiDelegate = self
        webView = web
        view = web
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        loadGame()
    }

    private func loadGame() {
        webView.load(URLRequest(url: URL(string: "app://game/index.html")!))
    }

    // iOS can kill the web process in the background, which leaves a blank page
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        loadGame()
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = navigationAction.request.url, url.scheme == "http" || url.scheme == "https" {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        } else {
            decisionHandler(.allow)
        }
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        alert.addTextField { field in field.text = defaultText }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
            completionHandler(alert.textFields?.first?.text ?? "")
        })
        present(alert, animated: true)
    }
}
