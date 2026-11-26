import AdSupport
import AppTrackingTransparency
import GoogleMobileAds
import Network
import UIKit
import UserMessagingPlatform

#if DEBUG || TESTER
private let rewardUnit = "ca-app-pub-3940256099942544/1712485313"
#else
private let rewardUnit = "ca-app-pub-8985801196261971/4925455704"
#endif

// Rewarded ads, loaded ahead. Order at launch: the consent form where the region needs one, then the
// tracking prompt, then the SDK starts and the first ads load.
final class AdsBridge: NSObject, FullScreenContentDelegate {
    private var reward: RewardedAd?
    private var started = false
    private var stopped = false
    private var loading = false
    private var retry: DispatchWorkItem?
    private var loadedAt = Date.distantPast
    private var muted = false
    private var monitor: NWPathMonitor?
    private var online: Bool?
    private let presenter: () -> UIViewController?
    private let emit: ([String: Any]) -> Void

    init(presenter: @escaping () -> UIViewController?, emit: @escaping ([String: Any]) -> Void) {
        self.presenter = presenter
        self.emit = emit
        super.init()
        NotificationCenter.default.addObserver(self, selector: #selector(resume), name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    func start(mute: Bool) {
        stopped = false
        muted = mute
        MobileAds.shared.isApplicationMuted = mute
        if started && reward == nil { loadReward() }
        ConsentInformation.shared.requestConsentInfoUpdate(with: RequestParameters()) { [weak self] error in
            guard let self = self, !self.stopped else { return }
            if error != nil {
                // a consent choice from an earlier launch may still allow requests
                self.begin()
                return self.retryOnNetwork()
            }
            guard let vc = self.presenter() else { return self.begin() }
            ConsentForm.loadAndPresentIfRequired(from: vc) { [weak self] _ in
                self?.begin()
                self?.privacy()
            }
        }
    }

    // Skip ads is owned: no consent form, tracking prompt or ad requests from now on. The menu still needs to know
    // whether "Privacy choices" is required, which the SDK answers without showing anything.
    func stop() {
        stopped = true
        monitor?.cancel()
        monitor = nil
        reward = nil
        retry?.cancel()
        retry = nil
        ConsentInformation.shared.requestConsentInfoUpdate(with: RequestParameters()) { [weak self] _ in self?.privacy() }
    }

    // a consent update that failed offline is tried again when a network comes back
    private func retryOnNetwork() {
        guard monitor == nil else { return }
        let m = NWPathMonitor()
        monitor = m
        // the monitor reports the current path first; retrying on that would loop when the update fails with a network up
        online = nil
        var seen: String?
        m.pathUpdateHandler = { [weak self] path in
            let now = path.status == .satisfied
            let ifaces = path.availableInterfaces.map { $0.name }.joined(separator: ",")
            DispatchQueue.main.async {
                guard let self = self, self.monitor === m else { return }
                let was = self.online
                let before = seen
                self.online = now
                seen = ifaces
                // moving to other interfaces counts too: the old network may have had no internet
                guard now, was == false || (before != nil && before != ifaces) else { return }
                m.cancel()
                self.monitor = nil
                self.start(mute: self.muted)
            }
        }
        m.start(queue: .global())
    }

    // a rewarded ad expires about an hour after it loads, so one held longer is replaced before the player taps it
    @objc private func resume() {
        guard !stopped, reward != nil, Date().timeIntervalSince(loadedAt) >= 50 * 60 else { return }
        reward = nil
        send("reward", "none")
        loadReward()
    }

    // the menu shows "Privacy choices" only where the consent SDK says the player must be able to reopen the form
    private func privacy() {
        emit(["t": "privacy", "required": ConsentInformation.shared.privacyOptionsRequirementStatus == .required])
    }

    func adId() {
        let allowed = ATTrackingManager.trackingAuthorizationStatus == .authorized
        emit(["t": "adId", "id": allowed ? ASIdentifierManager.shared().advertisingIdentifier.uuidString : ""])
    }

    func options() {
        guard let vc = presenter() else { return }
        ConsentForm.presentPrivacyOptionsForm(from: vc) { [weak self] _ in
            guard let self = self else { return }
            let was = self.started
            self.begin()
            // a player who now accepts personalised ads is asked, as at first launch
            if was && !self.stopped && ATTrackingManager.trackingAuthorizationStatus == .notDetermined && self.personalised() {
                ATTrackingManager.requestTrackingAuthorization { _ in }
            }
        }
    }

    private func begin() {
        guard !started, !stopped, ConsentInformation.shared.canRequestAds else { return }
        started = true
        let go = { [weak self] in
            guard self?.stopped == false else { return }
            // the game's audio session (ambient, mixing) stays as it is, so the music carries on after an ad
            MobileAds.shared.audioVideoManager.isAudioSessionApplicationManaged = true
            MobileAds.shared.start { [weak self] _ in
                self?.loadReward()
            }
        }
        MobileAds.shared.requestConfiguration.maxAdContentRating = .general
        if ATTrackingManager.trackingAuthorizationStatus == .notDetermined && personalised() {
            ATTrackingManager.requestTrackingAuthorization { _ in DispatchQueue.main.async(execute: go) }
        } else {
            go()
        }
    }

    // IABTCF values the consent form leaves in UserDefaults: where GDPR applies, the tracking prompt is for players who
    // agreed to storing information (purpose 1) and to personalised ads (purpose 4)
    private func personalised() -> Bool {
        let d = UserDefaults.standard
        guard d.integer(forKey: "IABTCF_gdprApplies") == 1 else { return true }
        let p = Array(d.string(forKey: "IABTCF_PurposeConsents") ?? "")
        return p.count > 3 && p[0] == "1" && p[3] == "1"
    }

    private func loadReward() {
        guard !stopped, !loading else { return }
        // a load asked for now replaces the retry that was waiting
        retry?.cancel()
        retry = nil
        loading = true
        RewardedAd.load(with: rewardUnit, request: Request()) { [weak self] ad, _ in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.loading = false
                guard !self.stopped else { return }
                self.reward = ad
                if ad != nil {
                    self.loadedAt = Date()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 50 * 60) { [weak self] in self?.resume() }
                    self.send("reward", "ready")
                } else {
                    let work = DispatchWorkItem { [weak self] in self?.loadReward() }
                    self.retry = work
                    DispatchQueue.main.asyncAfter(deadline: .now() + 60, execute: work)
                }
            }
        }
    }

    func report() {
        resume()
        send("reward", reward != nil ? "ready" : "none")
    }

    func show(_ kind: String, mute: Bool) {
        guard kind == "reward" else { return }
        MobileAds.shared.isApplicationMuted = mute
        resume()
        guard let vc = presenter(), let ad = reward else { return send(kind, "failed") }
        reward = nil
        send(kind, "none")
        ad.fullScreenContentDelegate = self
        ad.present(from: vc) { [weak self] in self?.send("reward", "rewarded") }
    }

    private func send(_ kind: String, _ state: String) {
        emit(["t": "ad", "kind": kind, "state": state])
    }

    func adWillPresentFullScreenContent(_ ad: FullScreenPresentingAd) {
        send("reward", "open")
    }

    func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) {
        send("reward", "closed")
        if !stopped { loadReward() }
    }

    func ad(_ ad: FullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) {
        send("reward", "failed")
        if !stopped { loadReward() }
    }
}
