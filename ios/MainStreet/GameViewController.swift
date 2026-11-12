import UIKit
import WebKit

// Not the view controller, so the web view's content controller holds nothing that leads back to it.
private final class BuzzHandler: NSObject, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
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
        let dir = Bundle.main.bundleURL
        webView.loadFileURL(dir.appendingPathComponent("index.html"), allowingReadAccessTo: dir)
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
