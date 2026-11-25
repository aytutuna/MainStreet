import Foundation

// The save the page shares between devices: {cmd: "cloudPut", json, at, dev} writes it to iCloud's key-value store and
// {cmd: "cloudGet"} / {cmd: "cloudState"} ask for it. Answers and changes made by another device go back as
// {t: "cloud", json, at, dev} and {t: "cloudState", state}. The state is a best guess from the iCloud identity: with no
// iCloud account (the usual Simulator case) it reads signedOut, even though the store may still sync with iCloud Drive off.
final class CloudBridge: NSObject {
    private let key = "save"
    private let store = NSUbiquitousKeyValueStore.default
    private let emit: ([String: Any]) -> Void
    // set once iCloud has delivered a change, or after a wait for the first sync of a new install
    private var synced = false

    init(emit: @escaping ([String: Any]) -> Void) {
        self.emit = emit
        super.init()
        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(changed(_:)), name: NSUbiquitousKeyValueStore.didChangeExternallyNotification, object: store)
        center.addObserver(self, selector: #selector(account), name: NSNotification.Name.NSUbiquityIdentityDidChange, object: nil)
        store.synchronize()
        if store.dictionary(forKey: key) != nil {
            synced = true
        } else {
            DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
                guard let self = self, !self.synced else { return }
                self.synced = true
                self.state()
            }
        }
    }

    func put(_ msg: [String: Any]) {
        guard let json = msg["json"] as? String else { return }
        store.set(["json": json, "at": msg["at"] as? Double ?? 0, "dev": msg["dev"] as? String ?? ""] as [String: Any], forKey: key)
        store.synchronize()
    }

    // The local copy answers at once, marked fresh: false because iCloud may not have delivered the other devices' writes yet;
    // the page can take it but does not write over the cloud on it. The same copy is sent again as fresh once iCloud has had a
    // few seconds, and a change from another device is always sent as fresh.
    func get() {
        store.synchronize()
        send(fresh: false)
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in self?.send(fresh: true) }
    }

    private func send(fresh: Bool) {
        let saved = store.dictionary(forKey: key)
        emit(["t": "cloud", "json": saved?["json"] ?? NSNull(), "at": saved?["at"] ?? 0, "dev": saved?["dev"] ?? "", "fresh": fresh])
    }

    func state() {
        let value = FileManager.default.ubiquityIdentityToken == nil ? "signedOut" : synced ? "available" : "pending"
        emit(["t": "cloudState", "state": value])
    }

    @objc private func account() {
        DispatchQueue.main.async { self.state() }
    }

    // an initial sync after a reinstall, a change from another device, or a server change all end up here
    @objc private func changed(_ note: Notification) {
        let keys = note.userInfo?[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String] ?? []
        DispatchQueue.main.async {
            self.synced = true
            self.state()
            if keys.contains(self.key) { self.send(fresh: true) }
        }
    }
}
