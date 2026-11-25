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
    // a change from iCloud arrived since the last get(); read counts the get() calls so only the latest one's wait answers
    private var read = 0

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
    // the page can take it but does not write over the cloud on it. It becomes fresh when iCloud reports a change while the
    // read is waiting, or, since iCloud says nothing when nothing differs, after a wait that is only a guess at "synced".
    // A change heard earlier never counts: the cache may be behind again by the time of a later read.
    func get() {
        store.synchronize()
        read += 1
        let mine = read
        send(fresh: false)
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) { [weak self] in
            if let self = self, self.read == mine { self.send(fresh: true) }
        }
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
            if keys.contains(self.key) {
                self.read += 1
                self.send(fresh: true)
            }
        }
    }
}
