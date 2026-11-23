package com.aytutuna.mainstreet

import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform
import org.json.JSONObject

// Rewarded and interstitial ads, loaded ahead and only once the consent step allows requests.
class AdsBridge(private val activity: MainActivity) {
    private var reward: RewardedAd? = null
    private var inter: InterstitialAd? = null
    private var started = false

    fun start() {
        val consent = UserMessagingPlatform.getConsentInformation(activity)
        consent.requestConsentInfoUpdate(activity, ConsentRequestParameters.Builder().build(), {
            UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) { init() }
        }, { init() })
        // a choice made on an earlier launch already allows requests
        init()
    }

    private fun init() {
        if (started || !UserMessagingPlatform.getConsentInformation(activity).canRequestAds()) return
        started = true
        MobileAds.initialize(activity) {
            loadReward()
            loadInter()
        }
    }

    private fun loadReward() {
        RewardedAd.load(activity, BuildConfig.AD_REWARD, AdRequest.Builder().build(), object : RewardedAdLoadCallback() {
            override fun onAdLoaded(ad: RewardedAd) {
                reward = ad
                state("reward", "ready")
            }

            override fun onAdFailedToLoad(error: LoadAdError) {
                reward = null
                activity.webView.postDelayed({ loadReward() }, RETRY)
            }
        })
    }

    private fun loadInter() {
        InterstitialAd.load(activity, BuildConfig.AD_INTER, AdRequest.Builder().build(), object : InterstitialAdLoadCallback() {
            override fun onAdLoaded(ad: InterstitialAd) {
                inter = ad
                state("inter", "ready")
            }

            override fun onAdFailedToLoad(error: LoadAdError) {
                inter = null
                activity.webView.postDelayed({ loadInter() }, RETRY)
            }
        })
    }

    fun report() {
        state("reward", if (reward != null) "ready" else "none")
        state("inter", if (inter != null) "ready" else "none")
    }

    fun show(kind: String) {
        val callback = object : FullScreenContentCallback() {
            override fun onAdShowedFullScreenContent() = state(kind, "open")

            override fun onAdDismissedFullScreenContent() {
                state(kind, "closed")
                again(kind)
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                state(kind, "failed")
                again(kind)
            }
        }
        if (kind == "reward") {
            val ad = reward ?: return state(kind, "failed")
            reward = null
            state(kind, "none")
            ad.fullScreenContentCallback = callback
            ad.show(activity) { state(kind, "rewarded") }
        } else {
            val ad = inter ?: return state(kind, "failed")
            inter = null
            state(kind, "none")
            ad.fullScreenContentCallback = callback
            ad.show(activity)
        }
    }

    private fun again(kind: String) = if (kind == "reward") loadReward() else loadInter()

    private fun state(kind: String, state: String) {
        activity.emit(JSONObject().put("t", "ad").put("kind", kind).put("state", state))
    }

    private companion object {
        const val RETRY = 60_000L
    }
}
