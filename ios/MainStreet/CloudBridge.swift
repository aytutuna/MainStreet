import Foundation

// The save the page shares between devices: {cmd: "cloudPut", json, at, dev, stamp, base, force} writes it to iCloud's
// key-value store and {cmd: "cloudGet"} / {cmd: "cloudState"} ask for it. The copy is kept with the stamp its writer gave it,
// and a put is written only while the store still holds the stamp the page called its base (or when force is set, to erase);
// otherwise the copy held is sent back with refused: true for the page to judge. Answers and changes made by another device
// go back as {t: "cloud", json, at, dev, stamp, refused, put}, writes as {t: "cloudPut", ok, stamp}, and the state as
// {t: "cloudState", state}. A read answers from the local store at once; whatever iCloud brings later comes as a change.
// The store cannot refuse a write, and its local copy can be older than iCloud's, so a put that passes the base check may still
// land over a newer copy; the page judges every copy that comes back (it knows what it wrote on what), and waits before the
// first put after a return. A put is always written: the store keeps it locally until an account can sync it, and the identity
// token is not asked, since it is nil with iCloud Drive off too, where the store still syncs.
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
        let stamp = msg["stamp"] as? String ?? ""
        let base = msg["base"] as? String ?? ""
        if let held = store.dictionary(forKey: key), msg["force"] as? Bool != true, (held["stamp"] as? String ?? "") != base {
            send(refused: true, put: stamp)
            return
        }
        store.set(["json": json, "at": msg["at"] as? Double ?? 0, "dev": msg["dev"] as? String ?? "", "stamp": stamp] as [String: Any], forKey: key)
        store.synchronize()
        emit(["t": "cloudPut", "ok": true, "stamp": stamp])
    }

    func get() {
        store.synchronize()
        send()
    }

    private func send(refused: Bool = false, put: String = "") {
        let saved = store.dictionary(forKey: key)
        emit(["t": "cloud", "json": saved?["json"] ?? NSNull(), "at": saved?["at"] ?? 0, "dev": saved?["dev"] ?? "", "stamp": saved?["stamp"] ?? "", "refused": refused, "put": put])
    }

    func state() {
        emit(["t": "cloudState", "state": synced ? "available" : "pending"])
    }

    // an initial sync after a reinstall, a change from another device, or a server change all end up here
    @objc private func changed(_ note: Notification) {
        let keys = note.userInfo?[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String] ?? []
        DispatchQueue.main.async {
            self.synced = true
            self.state()
            if keys.contains(self.key) { self.send() }
        }
    }
}
