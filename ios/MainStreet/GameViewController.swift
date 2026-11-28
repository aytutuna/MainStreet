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
// every reminder, pending or delivered. The answer to "ask", and the current setting on every return and on "state", goes to the page as {t: "notify", state}.
private final class NotifyHandler: NSObject, WKScriptMessageHandler {
    private let center = UNUserNotificationCenter.current()
    weak var web: WKWebView?

    override init() {
        super.init()
        NotificationCenter.default.addObserver(self, selector: #selector(clear), name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    @objc private func clear() {
        center.removeAllPendingNotificationRequests()
        center.removeAllDeliveredNotifications()
        report()
    }

    private func report() {
        center.getNotificationSettings { [weak self] settings in
            let state: String
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral: state = "granted"
            case .denied: state = "denied"
            default: return
            }
            DispatchQueue.main.async {
                self?.web?.evaluateJavaScript("window.nativeStore && window.nativeStore({t: 'notify', state: '\(state)'})")
            }
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let msg = message.body as? [String: Any] else { return }
        switch msg["cmd"] as? String {
        case "state":
            report()
        case "ask":
            center.requestAuthorization(options: [.alert, .sound]) { [weak self] granted, _ in
                DispatchQueue.main.async {
                    self?.web?.evaluateJavaScript("window.nativeStore && window.nativeStore({t: 'notify', state: '\(granted ? "granted" : "denied")'})")
                }
            }
        case "set":
            center.removeAllPendingNotificationRequests()
            for item in msg["list"] as? [[String: Any]] ?? [] {
                guard let id = item["id"] as? String, let text = item["body"] as? String, let at = item["at"] as? Double else { continue }
                let content = UNMutableNotificationContent()
                content.title = NSLocalizedString("notification_title", comment: "")
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

// The origin app://game holds the saved game in local storage; changing it would start every player over.
// Serves the bundle under app://game/ so module scripts and .glb files load with real MIME types (file:// is unreliable for them).
// Media elements ask for byte ranges, so those are answered too.
private final class BundleHandler: NSObject, WKURLSchemeHandler {
    private static let types = [
        "html": "text/html", "js": "text/javascript", "css": "text/css", "json": "application/json",
        "png": "image/png", "woff2": "font/woff2", "glb": "model/gltf-binary",
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
        var data = path.contains("..") ? nil : try? Data(contentsOf: file, options: .mappedIfSafe)
        let type = BundleHandler.types[file.pathExtension.lowercased()] ?? "application/octet-stream"
        var headers = ["Content-Type": type, "Accept-Ranges": "bytes"]
        var status = data == nil ? 404 : 200
        if let all = data, let ask = urlSchemeTask.request.value(forHTTPHeaderField: "Range"), ask.hasPrefix("bytes=") {
            let ends = ask.dropFirst(6).split(separator: "-", omittingEmptySubsequences: false)
            let first = ends.count > 0 ? Int(ends[0]) : nil
            let last = ends.count > 1 ? Int(ends[1]) : nil
            // bytes=-N is the last N bytes
            let from = first ?? max(all.count - (last ?? 0), 0)
            let to = first == nil ? all.count - 1 : min(last ?? all.count - 1, all.count - 1)
            if from <= to {
                data = all.subdata(in: from..<to + 1)
                headers["Content-Range"] = "bytes \(from)-\(to)/\(all.count)"
                status = 206
            } else {
                data = nil
                headers["Content-Range"] = "bytes */\(all.count)"
                status = 416
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
    private let notify = NotifyHandler()

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
        config.userContentController.add(notify, name: "notify")
        config.userContentController.add(store, name: "store")
        let info = Bundle.main.infoDictionary
        let ver = "window.APPVER = {v: \"\(info?["CFBundleShortVersionString"] as? String ?? "")\", b: \"\(info?["CFBundleVersion"] as? String ?? "")\"};"
        config.userContentController.addUserScript(WKUserScript(source: ver, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        #if DEBUG || TESTER
        config.userContentController.addUserScript(WKUserScript(source: "window.TESTER = 1;", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        #endif
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
        notify.web = web
        webView = web
        view = web
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        loadGame()
    }

    // An iPhone app in an iPad window gets the window controls drawn over its top-left corner, which the web view's
    // safe area does not know about. The page reads --wc as a top inset.
    private var controlsInset: CGFloat = 0

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        guard #available(iOS 26.0, *), UIDevice.current.userInterfaceIdiom == .pad else { return }
        let top = view.edgeInsets(for: .safeArea(cornerAdaptation: .vertical)).top
        if top != controlsInset {
            controlsInset = top
            sendControlsInset()
        }
    }

    private func sendControlsInset() {
        webView.evaluateJavaScript("document.documentElement.style.setProperty('--wc', '\(controlsInset)px')")
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if controlsInset > 0 { sendControlsInset() }
    }

    private var reloads: [Date] = []

    private func loadGame() {
        webView.load(URLRequest(url: URL(string: "app://game/index.html")!))
    }

    // iOS can kill the web process in the background, which leaves a blank page
    // a page that keeps dying would loop forever, so after three in a minute it stops and says so
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        let now = Date()
        reloads = reloads.filter { now.timeIntervalSince($0) < 60 } + [now]
        if reloads.count <= 3 {
            loadGame()
            return
        }
        let message = NSLocalizedString("reload_failed", value: "The game stopped. Close Main Street and open it again.", comment: "")
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: NSLocalizedString("ok", comment: ""), style: .default))
        var top: UIViewController = self
        while let next = top.presentedViewController { top = next }
        top.present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = navigationAction.request.url, url.scheme == "http" || url.scheme == "https" || url.scheme == "mailto" {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        } else {
            decisionHandler(.allow)
        }
    }
}
