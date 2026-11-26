import RevenueCat
import StoreKit
import UIKit
import WebKit

// The page sends {cmd: "products", ids}, {cmd: "buy", id}, {cmd: "restore"}, {cmd: "adReady"}, {cmd: "ad", kind} and
// {cmd: "time", n}, {cmd: "cloudPut" | "cloudGet" | "cloudState"} and {cmd: "music", check} to the "store" handler and gets its answers through window.nativeStore(event); shop.js lists the
// events. Purchases go through RevenueCat, ads through AdsBridge, the check for other music through MusicBridge. The web view is held
// weakly, since it holds this handler.
final class StoreBridge: NSObject, WKScriptMessageHandler, PurchasesDelegate {
    weak var web: WKWebView?
    private var found: [String: StoreProduct] = [:]
    // events the page was not there to take (it was reloading); replayed when it asks for the products again
    private var held: [[String: Any]] = []
    private lazy var ads = AdsBridge(presenter: presenter, emit: { [weak self] in self?.emit($0) })
    private lazy var music = MusicBridge(emit: { [weak self] in self?.emit($0) })
    private lazy var cloud = CloudBridge(emit: { [weak self] in self?.emit($0) })
    private let presenter: () -> UIViewController?

    init(presenter: @escaping () -> UIViewController?) {
        self.presenter = presenter
        super.init()
        if !Purchases.isConfigured {
            Purchases.configure(withAPIKey: "appl_JggXVTqKaiECcMheJWpRuGVcZgJ")
        }
        Purchases.shared.delegate = self
    }

    // a purchase finished while the page was gone shows up here; the page credits it if it has not yet
    func purchases(_ purchases: Purchases, receivedUpdated customerInfo: CustomerInfo) {
        send(customerInfo, restored: false)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let msg = message.body as? [String: Any] else { return }
        switch msg["cmd"] as? String {
        case "products":
            replay()
            products(msg["ids"] as? [String] ?? [])
        case "buy":
            if let id = msg["id"] as? String { buy(id) }
        case "restore":
            Task { @MainActor in await owned(restored: true) }
        case "sync":
            Task { @MainActor in await owned(sync: true) }
        case "adStart":
            ads.start(mute: msg["mute"] as? Bool ?? false)
        case "adStop":
            ads.stop()
        case "adReady":
            ads.report()
        case "privacy":
            ads.options()
        case "adId":
            ads.adId()
        case "time":
            if let n = msg["n"] as? Int { time(n) }
        case "cloudPut":
            cloud.put(msg)
        case "cloudGet":
            cloud.get(dev: msg["dev"] as? String)
        case "cloudState":
            cloud.state(dev: msg["dev"] as? String)
        case "ad":
            ads.show(msg["kind"] as? String ?? "", mute: msg["mute"] as? Bool ?? false)
        case "music":
            music.command(msg)
        case "review":
            DispatchQueue.main.async {
                if let scene = self.web?.window?.windowScene { AppStore.requestReview(in: scene) }
            }
        default:
            break
        }
    }

    private func emit(_ event: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: event), let json = String(data: data, encoding: .utf8) else { return }
        DispatchQueue.main.async { [weak self] in
            self?.web?.evaluateJavaScript("window.nativeStore ? (window.nativeStore(\(json)), 1) : 0") { result, _ in
                if (result as? Int) != 1 && !["time", "cloud", "cloudState"].contains(event["t"] as? String ?? "") && (self?.held.count ?? 50) < 50 { self?.held.append(event) }
            }
        }
    }

    private func replay() {
        let list = held
        held = []
        list.forEach(emit)
    }

    // server time for the page: alazy.app, else the Date header of a RevenueCat answer. sent and recv are the phone's
    // clock around the request, which the page uses to place the answer
    private func time(_ n: Int) {
        Task { @MainActor in
            let sent = Date().timeIntervalSince1970 * 1000
            let ms = await serverTime()
            let recv = Date().timeIntervalSince1970 * 1000
            emit(["t": "time", "n": n, "ms": ms ?? NSNull(), "sent": sent, "recv": recv])
        }
    }

    private func serverTime() async -> Double? {
        if let url = URL(string: "https://alazy.app/mainstreet/time"),
           let (data, _) = try? await URLSession.shared.data(for: request(url, "GET")),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let now = json["now"] as? Double {
            return now
        }
        guard let url = URL(string: "https://api.revenuecat.com/"),
              let (_, response) = try? await URLSession.shared.data(for: request(url, "HEAD")),
              let header = (response as? HTTPURLResponse)?.value(forHTTPHeaderField: "Date") else { return nil }
        let format = DateFormatter()
        format.locale = Locale(identifier: "en_US_POSIX")
        format.timeZone = TimeZone(identifier: "GMT")
        format.dateFormat = "EEE, dd MMM yyyy HH:mm:ss zzz"
        return format.date(from: header).map { $0.timeIntervalSince1970 * 1000 }
    }

    private func request(_ url: URL, _ method: String) -> URLRequest {
        var r = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 5)
        r.httpMethod = method
        return r
    }

    private func products(_ ids: [String]) {
        Task { @MainActor in
            let list = await Purchases.shared.products(ids)
            for p in list { found[p.productIdentifier] = p }
            emit(["t": "products", "list": list.map { ["id": $0.productIdentifier, "price": $0.localizedPriceString, "amount": NSDecimalNumber(decimal: $0.price).doubleValue, "currency": $0.currencyCode ?? ""] as [String: Any] }])
            await owned(restored: false)
        }
    }

    private func owned(restored: Bool = false, sync: Bool = false, fresh: Bool = false) async {
        do {
            let info = restored ? try await Purchases.shared.restorePurchases()
                : sync ? try await Purchases.shared.syncPurchases()
                : try await Purchases.shared.customerInfo(fetchPolicy: fresh ? .fetchCurrent : .default)
            send(info, restored: restored, sync: sync)
        } catch {
            if restored { emit(["t": "restoreFailed"]) }
        }
    }

    private func send(_ info: CustomerInfo, restored: Bool, sync: Bool = false) {
        let tx = info.nonSubscriptions.map {
            ["id": $0.productIdentifier, "tx": $0.transactionIdentifier, "at": $0.purchaseDate.timeIntervalSince1970 * 1000] as [String: Any]
        }
        emit(["t": "owned", "ids": Array(info.allPurchasedProductIdentifiers), "tx": tx, "user": Purchases.shared.appUserID, "restore": restored, "sync": sync])
    }

    private func buy(_ id: String) {
        guard let product = found[id] else { return failed(id, "error") }
        Task { @MainActor in
            do {
                let result = try await Purchases.shared.purchase(product: product)
                if result.userCancelled {
                    failed(id, "cancel")
                } else {
                    // the id the store list uses for it, so the page counts the purchase once
                    var mine = result.customerInfo.nonSubscriptions.filter { $0.productIdentifier == id }
                    if let store = result.transaction?.transactionIdentifier {
                        mine = mine.filter { $0.storeTransactionIdentifier == store }
                    }
                    if let listed = mine.max(by: { $0.purchaseDate < $1.purchaseDate }) {
                        emit(["t": "bought", "id": id, "at": listed.purchaseDate.timeIntervalSince1970 * 1000, "tx": listed.transactionIdentifier])
                    } else {
                        // charged, but RevenueCat has no id for it yet; the page credits it from the list
                        failed(id, "late")
                        await owned(restored: false, fresh: true)
                    }
                }
            } catch {
                let code = (error as NSError).code
                if code == ErrorCode.paymentPendingError.rawValue {
                    emit(["t": "pending", "id": id])
                } else {
                    failed(id, code == ErrorCode.purchaseCancelledError.rawValue ? "cancel" : "error")
                }
            }
        }
    }

    private func failed(_ id: String, _ why: String) {
        emit(["t": "failed", "id": id, "why": why])
    }
}
