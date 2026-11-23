import AVFoundation
import UIKit
import UserNotifications
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

// The game sends {cmd: "ask"} or {cmd: "set", list: [{id, at (ms since 1970), body}]}. Coming to the foreground drops
// every reminder, pending or delivered.
private final class NotifyHandler: NSObject, WKScriptMessageHandler {
    private let center = UNUserNotificationCenter.current()

    override init() {
        super.init()
        NotificationCenter.default.addObserver(self, selector: #selector(clear), name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    @objc private func clear() {
        center.removeAllPendingNotificationRequests()
        center.removeAllDeliveredNotifications()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let msg = message.body as? [String: Any] else { return }
        switch msg["cmd"] as? String {
        case "ask":
            center.requestAuthorization(options: [.alert, .sound]) { _, _ in }
        case "set":
            center.removeAllPendingNotificationRequests()
            for item in msg["list"] as? [[String: Any]] ?? [] {
                guard let id = item["id"] as? String, let text = item["body"] as? String, let at = item["at"] as? Double else { continue }
                let content = UNMutableNotificationContent()
                content.title = "Main Street"
                content.body = text
                content.sound = .default
                let wait = max(1, at / 1000 - Date().timeIntervalSince1970)
                center.add(UNNotificationRequest(identifier: id, content: content, trigger: UNTimeIntervalNotificationTrigger(timeInterval: wait, repeats: false)))
            }
        default:
            break
        }
    }
}

// Serves the bundle under app://game/ so module scripts and .glb files load with real MIME types (file:// is unreliable for them).
// Media elements ask for byte ranges, so those are answered too.
private final class BundleHandler: NSObject, WKURLSchemeHandler {
    private static let types = [
        "html": "text/html", "js": "text/javascript", "css": "text/css", "json": "application/json",
        "webmanifest": "application/manifest+json", "png": "image/png", "glb": "model/gltf-binary",
        "gltf": "model/gltf+json", "bin": "application/octet-stream", "wav": "audio/wav", "m4a": "audio/mp4",
    ]

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let file = Bundle.main.bundleURL.appendingPathComponent(String(path.dropFirst()))
        var data = path.contains("..") ? nil : try? Data(contentsOf: file)
        let type = BundleHandler.types[file.pathExtension.lowercased()] ?? "application/octet-stream"
        var headers = ["Content-Type": type, "Accept-Ranges": "bytes"]
        var status = data == nil ? 404 : 200
        if let all = data, let ask = urlSchemeTask.request.value(forHTTPHeaderField: "Range"), ask.hasPrefix("bytes=") {
            let ends = ask.dropFirst(6).split(separator: "-", omittingEmptySubsequences: false)
            let from = Int(ends[0]) ?? 0
            let to = min(Int(ends.count > 1 ? ends[1] : "") ?? all.count - 1, all.count - 1)
            if from <= to {
                data = all.subdata(in: from..<to + 1)
                headers["Content-Range"] = "bytes \(from)-\(to)/\(all.count)"
                status = 206
            }
        }
        headers["Content-Length"] = String(data?.count ?? 0)
        let response = HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: headers)!
        urlSchemeTask.didReceive(response)
        if let data = data { urlSchemeTask.didReceive(data) }
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
}

final class GameViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    static let background = UIColor(red: 58.0 / 255.0, green: 58.0 / 255.0, blue: 80.0 / 255.0, alpha: 1)

    private var webView: WKWebView!
    private lazy var store = StoreBridge(presenter: { [weak self] in self })

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }

    // The web view is the root view so it covers the notch and home indicator and env(safe-area-inset-*) is real.
    override func loadView() {
        // Game sounds mix with the player's music and follow the silent switch.
        try? AVAudioSession.sharedInstance().setCategory(.ambient, options: [.mixWithOthers])
        try? AVAudioSession.sharedInstance().setActive(true)
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(BuzzHandler(), name: "buzz")
        config.userContentController.add(NotifyHandler(), name: "notify")
        config.userContentController.add(store, name: "store")
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
        store.web = web
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
