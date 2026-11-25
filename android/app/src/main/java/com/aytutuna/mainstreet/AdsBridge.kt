package com.aytutuna.mainstreet

import android.os.Handler
import android.os.Looper
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.identifier.AdvertisingIdClient
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform
import org.json.JSONObject

// Rewarded ads, loaded ahead and only once the consent step allows requests.
class AdsBridge(private val activity: MainActivity) {
    private var reward: RewardedAd? = null
    private var started = false
    private var stopped = false
    private val retry = Handler(Looper.getMainLooper())

    // the page asks for this unless the player owns Skip ads
    fun start() {
        stopped = false
        if (started && reward == null) loadReward()
        val consent = UserMessagingPlatform.getConsentInformation(activity)
        consent.requestConsentInfoUpdate(activity, ConsentRequestParameters.Builder().build(), {
            if (stopped) return@requestConsentInfoUpdate
            UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) {
                init()
                privacy()
            }
        }, { init() })
        // a choice made on an earlier launch already allows requests
        init()
    }

    fun stop() {
        stopped = true
        retry.removeCallbacksAndMessages(null)
        reward = null
        // the menu still needs to know whether "Privacy choices" is required; this shows no form
        UserMessagingPlatform.getConsentInformation(activity)
            .requestConsentInfoUpdate(activity, ConsentRequestParameters.Builder().build(), { privacy() }, { })
    }

    private fun privacy() {
        val required = UserMessagingPlatform.getConsentInformation(activity).privacyOptionsRequirementStatus ==
            ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
        activity.emit(JSONObject().put("t", "privacy").put("required", required))
    }

    fun adId() {
        Thread {
            val id = try { AdvertisingIdClient.getAdvertisingIdInfo(activity).id } catch (e: Exception) { null }
            activity.emit(JSONObject().put("t", "adId").put("id", id ?: ""))
        }.start()
    }

    fun options() {
        UserMessagingPlatform.showPrivacyOptionsForm(activity) { init() }
    }

    private fun init() {
        if (started || stopped || !UserMessagingPlatform.getConsentInformation(activity).canRequestAds()) return
        started = true
        MobileAds.initialize(activity) {
            loadReward()
        }
    }

    private fun loadReward() {
        if (stopped) return
        RewardedAd.load(activity, BuildConfig.AD_REWARD, AdRequest.Builder().build(), object : RewardedAdLoadCallback() {
            override fun onAdLoaded(ad: RewardedAd) {
                if (stopped) return
                reward = ad
                state("reward", "ready")
            }

            override fun onAdFailedToLoad(error: LoadAdError) {
                reward = null
                if (!stopped) retry.postDelayed({ loadReward() }, RETRY)
            }
        })
    }

    fun report() {
        state("reward", if (reward != null) "ready" else "none")
    }

    fun show(kind: String) {
        if (kind != "reward") return
        val ad = reward ?: return state(kind, "failed")
        reward = null
        state(kind, "none")
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdShowedFullScreenContent() = state(kind, "open")

            override fun onAdDismissedFullScreenContent() {
                state(kind, "closed")
                again()
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                state(kind, "failed")
                again()
            }
        }
        ad.show(activity) { state(kind, "rewarded") }
    }

    private fun again() {
        if (!stopped) loadReward()
    }

    private fun state(kind: String, state: String) {
        activity.emit(JSONObject().put("t", "ad").put("kind", kind).put("state", state))
    }

    private companion object {
        const val RETRY = 60_000L
    }
}
