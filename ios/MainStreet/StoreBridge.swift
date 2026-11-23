import RevenueCat
import UIKit
import WebKit

// The page sends {cmd: "products", ids}, {cmd: "buy", id}, {cmd: "restore"}, {cmd: "adReady"} and {cmd: "ad", kind} to the
// "store" handler and gets its answers through window.nativeStore(event); shop.js lists the events. Purchases go through
// RevenueCat, ads through AdsBridge. The web view is held weakly, since it holds this handler.
final class StoreBridge: NSObject, WKScriptMessageHandler {
    weak var web: WKWebView?
    private var found: [String: StoreProduct] = [:]
    private lazy var ads = AdsBridge(presenter: presenter, emit: { [weak self] in self?.emit($0) })
    private let presenter: () -> UIViewController?

    init(presenter: @escaping () -> UIViewController?) {
        self.presenter = presenter
        super.init()
        Purchases.configure(withAPIKey: "appl_JggXVTqKaiECcMheJWpRuGVcZgJ")
    }

    func startAds() {
        ads.start()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let msg = message.body as? [String: Any] else { return }
        switch msg["cmd"] as? String {
        case "products":
            products(msg["ids"] as? [String] ?? [])
        case "buy":
            if let id = msg["id"] as? String { buy(id) }
        case "restore":
            Task { @MainActor in await owned(restored: true) }
        case "adReady":
            ads.report()
        case "ad":
            ads.show(msg["kind"] as? String ?? "")
        default:
            break
        }
    }

    private func emit(_ event: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: event), let json = String(data: data, encoding: .utf8) else { return }
        DispatchQueue.main.async { [weak self] in
            self?.web?.evaluateJavaScript("window.nativeStore && window.nativeStore(\(json))", completionHandler: nil)
        }
    }

    private func products(_ ids: [String]) {
        Task { @MainActor in
            let list = await Purchases.shared.products(ids)
            for p in list { found[p.productIdentifier] = p }
            emit(["t": "products", "list": list.map { ["id": $0.productIdentifier, "price": $0.localizedPriceString] }])
            await owned(restored: false)
        }
    }

    private func owned(restored: Bool) async {
        let info = restored ? try? await Purchases.shared.restorePurchases() : try? await Purchases.shared.customerInfo()
        emit(["t": "owned", "ids": Array(info?.allPurchasedProductIdentifiers ?? []), "restore": restored])
    }

    private func buy(_ id: String) {
        guard let product = found[id] else { return failed(id, "error") }
        Task { @MainActor in
            do {
                let result = try await Purchases.shared.purchase(product: product)
                if result.userCancelled {
                    failed(id, "cancel")
                } else {
                    emit(["t": "bought", "id": id, "tx": result.transaction?.transactionIdentifier ?? "\(id)-\(Date().timeIntervalSince1970)"])
                }
            } catch {
                failed(id, (error as NSError).code == ErrorCode.purchaseCancelledError.rawValue ? "cancel" : "error")
            }
        }
    }

    private func failed(_ id: String, _ why: String) {
        emit(["t": "failed", "id": id, "why": why])
    }
}
