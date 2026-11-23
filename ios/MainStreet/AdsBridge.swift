import AppTrackingTransparency
import GoogleMobileAds
import UIKit
import UserMessagingPlatform

#if DEBUG
private let rewardUnit = "ca-app-pub-3940256099942544/1712485313"
private let interUnit = "ca-app-pub-3940256099942544/4411468910"
#else
private let rewardUnit = "ca-app-pub-8985801196261971/4925455704"
private let interUnit = "ca-app-pub-8985801196261971/5084191623"
#endif

// Rewarded and interstitial ads, loaded ahead. Order at launch: the consent form where the region needs one, then the
// tracking prompt, then the SDK starts and the first ads load.
final class AdsBridge: NSObject, FullScreenContentDelegate {
    private var reward: RewardedAd?
    private var inter: InterstitialAd?
    private var started = false
    private let presenter: () -> UIViewController?
    private let emit: ([String: Any]) -> Void

    init(presenter: @escaping () -> UIViewController?, emit: @escaping ([String: Any]) -> Void) {
        self.presenter = presenter
        self.emit = emit
    }

    func start() {
        ConsentInformation.shared.requestConsentInfoUpdate(with: RequestParameters()) { [weak self] _ in
            guard let self = self else { return }
            guard let vc = self.presenter() else { return self.begin() }
            ConsentForm.loadAndPresentIfRequired(from: vc) { [weak self] _ in
                self?.begin()
                self?.privacy()
            }
        }
    }

    // the menu shows "Privacy choices" only where the consent SDK says the player must be able to reopen the form
    private func privacy() {
        emit(["t": "privacy", "required": ConsentInformation.shared.privacyOptionsRequirementStatus == .required])
    }

    func options() {
        guard let vc = presenter() else { return }
        ConsentForm.presentPrivacyOptionsForm(from: vc) { [weak self] _ in self?.begin() }
    }

    private func begin() {
        guard !started, ConsentInformation.shared.canRequestAds else { return }
        started = true
        let go = {
            // the game's audio session (ambient, mixing) stays as it is, so the radio carries on after an ad
            MobileAds.shared.audioVideoManager.isAudioSessionApplicationManaged = true
            MobileAds.shared.start { [weak self] _ in
                self?.loadReward()
                self?.loadInter()
            }
        }
        if ATTrackingManager.trackingAuthorizationStatus == .notDetermined {
            ATTrackingManager.requestTrackingAuthorization { _ in DispatchQueue.main.async(execute: go) }
        } else {
            go()
        }
    }

    private func loadReward() {
        RewardedAd.load(with: rewardUnit, request: Request()) { [weak self] ad, _ in
            DispatchQueue.main.async {
                self?.reward = ad
                if ad != nil {
                    self?.send("reward", "ready")
                } else {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 60) { self?.loadReward() }
                }
            }
        }
    }

    private func loadInter() {
        InterstitialAd.load(with: interUnit, request: Request()) { [weak self] ad, _ in
            DispatchQueue.main.async {
                self?.inter = ad
                if ad != nil {
                    self?.send("inter", "ready")
                } else {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 60) { self?.loadInter() }
                }
            }
        }
    }

    func report() {
        send("reward", reward != nil ? "ready" : "none")
        send("inter", inter != nil ? "ready" : "none")
    }

    func show(_ kind: String) {
        guard let vc = presenter() else { return send(kind, "failed") }
        if kind == "reward" {
            guard let ad = reward else { return send(kind, "failed") }
            reward = nil
            send(kind, "none")
            ad.fullScreenContentDelegate = self
            ad.present(from: vc) { [weak self] in self?.send("reward", "rewarded") }
        } else {
            guard let ad = inter else { return send(kind, "failed") }
            inter = nil
            send(kind, "none")
            ad.fullScreenContentDelegate = self
            ad.present(from: vc)
        }
    }

    private func send(_ kind: String, _ state: String) {
        emit(["t": "ad", "kind": kind, "state": state])
    }

    private func kind(of ad: FullScreenPresentingAd) -> String {
        ad is RewardedAd ? "reward" : "inter"
    }

    func adWillPresentFullScreenContent(_ ad: FullScreenPresentingAd) {
        send(kind(of: ad), "open")
    }

    func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) {
        send(kind(of: ad), "closed")
        if ad is RewardedAd { loadReward() } else { loadInter() }
    }

    func ad(_ ad: FullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) {
        send(kind(of: ad), "failed")
        if ad is RewardedAd { loadReward() } else { loadInter() }
    }
}
