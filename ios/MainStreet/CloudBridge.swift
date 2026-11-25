import Foundation

// The save the page shares between devices, in iCloud's key-value store, one key per device ("save.<dev>"). A device only ever
// writes its own key, so a write cannot land over another device's newer copy, however stale the local cache is.
// {cmd: "cloudPut", json, at, dev, stamp, ...} writes this device's key and is always answered {t: "cloudPut", ok: true, stamp}.
// {cmd: "cloudGet", dev} answers with one {t: "cloud", json, at, dev, stamp, refused: false, put: "", more} for every other
// device's key (more is true on all but the last), or one with json null when there is none; the page judges them. A change
// another device made comes the same way, one key at a time. {cmd: "cloudState", dev} answers {t: "cloudState", state}: "pending"
// until iCloud has delivered a change or another device's key is held, then "available".
// The whole store holds 1 MB, so keys of devices that have not written for 90 days are removed with each write.
// The key "save" of earlier builds is read once as one more copy and never written.
final class CloudBridge: NSObject {
    private let prefix = "save."
    private let store = NSUbiquitousKeyValueStore.default
    private let emit: ([String: Any]) -> Void
    private var dev = ""
    private var synced = false
    private var legacyRead = false

    init(emit: @escaping ([String: Any]) -> Void) {
        self.emit = emit
        super.init()
        NotificationCenter.default.addObserver(self, selector: #selector(changed(_:)), name: NSUbiquitousKeyValueStore.didChangeExternallyNotification, object: store)
        store.synchronize()
    }

    func put(_ msg: [String: Any]) {
        guard let json = msg["json"] as? String, let id = msg["dev"] as? String, !id.isEmpty else { return }
        dev = id
        let stamp = msg["stamp"] as? String ?? ""
        let at = msg["at"] as? Double ?? 0
        store.set(["json": json, "at": at, "dev": id, "stamp": stamp] as [String: Any], forKey: prefix + id)
        for key in store.dictionaryRepresentation.keys where key.hasPrefix(prefix) && key != prefix + id {
            if let old = store.dictionary(forKey: key), (old["at"] as? Double ?? 0) < at - 90 * 86400000 { store.removeObject(forKey: key) }
        }
        store.synchronize()
        emit(["t": "cloudPut", "ok": true, "stamp": stamp])
    }

    func get(dev id: String?) {
        if let id = id, !id.isEmpty { dev = id }
        store.synchronize()
        var copies = others().compactMap { store.dictionary(forKey: $0) }
        if !legacyRead {
            legacyRead = true
            if let old = store.dictionary(forKey: "save"), old["dev"] as? String != dev { copies.append(old) }
        }
        if copies.isEmpty {
            send(nil, more: false)
            return
        }
        for (i, copy) in copies.enumerated() { send(copy, more: i < copies.count - 1) }
    }

    func state(dev id: String?) {
        if let id = id, !id.isEmpty { dev = id }
        emit(["t": "cloudState", "state": synced || !others().isEmpty ? "available" : "pending"])
    }

    private func others() -> [String] {
        store.dictionaryRepresentation.keys.filter { $0.hasPrefix(prefix) && $0 != prefix + dev }
    }

    private func send(_ copy: [String: Any]?, more: Bool) {
        emit(["t": "cloud", "json": copy?["json"] ?? NSNull(), "at": copy?["at"] ?? 0, "dev": copy?["dev"] ?? "", "stamp": copy?["stamp"] ?? "", "refused": false, "put": "", "more": more])
    }

    // an initial sync after a reinstall or a change from another device ends up here
    @objc private func changed(_ note: Notification) {
        let keys = (note.userInfo?[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String] ?? []).filter { $0.hasPrefix(prefix) && $0 != prefix + dev }
        DispatchQueue.main.async {
            self.synced = true
            // the copies come first: the state ends the page's wait for a new install, so it must not arrive with no copy yet
            let copies = keys.compactMap { self.store.dictionary(forKey: $0) }
            for (i, copy) in copies.enumerated() { self.send(copy, more: i < copies.count - 1) }
            self.state(dev: nil)
        }
    }
}
