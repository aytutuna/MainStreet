import AdSupport
import AppTrackingTransparency
import GoogleMobileAds
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
    private let presenter: () -> UIViewController?
    private let emit: ([String: Any]) -> Void

    init(presenter: @escaping () -> UIViewController?, emit: @escaping ([String: Any]) -> Void) {
        self.presenter = presenter
        self.emit = emit
    }

    func start() {
        guard !stopped else { return }
        ConsentInformation.shared.requestConsentInfoUpdate(with: RequestParameters()) { [weak self] _ in
            guard let self = self, !self.stopped else { return }
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
        reward = nil
        ConsentInformation.shared.requestConsentInfoUpdate(with: RequestParameters()) { [weak self] _ in self?.privacy() }
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
        ConsentForm.presentPrivacyOptionsForm(from: vc) { [weak self] _ in self?.begin() }
    }

    private func begin() {
        guard !started, !stopped, ConsentInformation.shared.canRequestAds else { return }
        started = true
        let go = { [weak self] in
            guard self?.stopped == false else { return }
            // the game's audio session (ambient, mixing) stays as it is, so the radio carries on after an ad
            MobileAds.shared.audioVideoManager.isAudioSessionApplicationManaged = true
            MobileAds.shared.start { [weak self] _ in
                self?.loadReward()
            }
        }
        if ATTrackingManager.trackingAuthorizationStatus == .notDetermined {
            ATTrackingManager.requestTrackingAuthorization { _ in DispatchQueue.main.async(execute: go) }
        } else {
            go()
        }
    }

    private func loadReward() {
        guard !stopped else { return }
        RewardedAd.load(with: rewardUnit, request: Request()) { [weak self] ad, _ in
            DispatchQueue.main.async {
                guard self?.stopped == false else { return }
                self?.reward = ad
                if ad != nil {
                    self?.send("reward", "ready")
                } else {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 60) { self?.loadReward() }
                }
            }
        }
    }

    func report() {
        send("reward", reward != nil ? "ready" : "none")
    }

    func show(_ kind: String) {
        guard kind == "reward" else { return }
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
