package com.aytutuna.mainstreet

import com.revenuecat.purchases.CacheFetchPolicy
import com.revenuecat.purchases.CustomerInfo
import com.revenuecat.purchases.PurchaseParams
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration
import com.revenuecat.purchases.PurchasesError
import com.revenuecat.purchases.PurchasesErrorCode
import com.revenuecat.purchases.interfaces.GetStoreProductsCallback
import com.revenuecat.purchases.interfaces.PurchaseCallback
import com.revenuecat.purchases.interfaces.UpdatedCustomerInfoListener
import com.revenuecat.purchases.interfaces.ReceiveCustomerInfoCallback
import com.revenuecat.purchases.interfaces.SyncPurchasesCallback
import com.revenuecat.purchases.models.StoreProduct
import com.revenuecat.purchases.models.StoreTransaction
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

// Purchases through RevenueCat. The events it sends the page are listed at the top of shop.js.
class StoreBridge(private val activity: MainActivity) {
    private val found = HashMap<String, StoreProduct>()

    // a purchase finished while the page was gone shows up here; the page credits it if it has not yet
    private val listener = UpdatedCustomerInfoListener { send(it, false) }

    init {
        if (!Purchases.isConfigured) {
            Purchases.configure(PurchasesConfiguration.Builder(activity.applicationContext, BuildConfig.RC_KEY).build())
        }
        Purchases.sharedInstance.updatedCustomerInfoListener = listener
    }

    // the listener is shared, and a new activity may already have taken it over
    fun stop() {
        if (Purchases.sharedInstance.updatedCustomerInfoListener === listener) {
            Purchases.sharedInstance.updatedCustomerInfoListener = null
        }
    }

    // server time for the page: alazy.app, else the Date header of a RevenueCat answer. sent and recv are the phone's
    // clock around the request, which the page uses to place the answer
    fun time(n: Int) {
        Thread {
            val sent = System.currentTimeMillis()
            val ms = serverTime()
            val recv = System.currentTimeMillis()
            activity.emit(JSONObject().put("t", "time").put("n", n).put("ms", ms ?: JSONObject.NULL).put("sent", sent).put("recv", recv))
        }.start()
    }

    private fun serverTime(): Long? {
        fetch("https://alazy.app/mainstreet/time", "GET") { c ->
            JSONObject(c.inputStream.bufferedReader().readText()).getLong("now")
        }?.let { return it }
        return fetch("https://api.revenuecat.com/", "HEAD") { c -> c.date.takeIf { it > 0 } }
    }

    private fun <T> fetch(url: String, method: String, read: (HttpURLConnection) -> T?): T? = try {
        val c = URL(url).openConnection() as HttpURLConnection
        c.requestMethod = method
        c.useCaches = false
        c.connectTimeout = 5000
        c.readTimeout = 5000
        try { read(c) } finally { c.disconnect() }
    } catch (e: Exception) {
        null
    }

    fun products(ids: JSONArray?) {
        val list = List(ids?.length() ?: 0) { ids!!.getString(it) }
        Purchases.sharedInstance.getProducts(list, object : GetStoreProductsCallback {
            override fun onReceived(storeProducts: List<StoreProduct>) {
                storeProducts.forEach { found[it.id] = it }
                val out = JSONArray()
                storeProducts.forEach { out.put(JSONObject().put("id", it.id).put("price", it.price.formatted).put("amount", it.price.amountMicros / 1e6).put("currency", it.price.currencyCode)) }
                activity.emit(JSONObject().put("t", "products").put("list", out))
                owned()
            }

            override fun onError(error: PurchasesError) {
                activity.emit(JSONObject().put("t", "products").put("list", JSONArray()))
                owned()
            }
        })
    }

    fun buy(id: String) {
        val product = found[id]
        if (product == null) {
            failed(id, "error")
            return
        }
        Purchases.sharedInstance.purchase(PurchaseParams.Builder(activity, product).build(), object : PurchaseCallback {
            override fun onCompleted(storeTransaction: StoreTransaction, customerInfo: CustomerInfo) {
                // the id the store list uses for it, so the page counts the purchase once
                val store = storeTransaction.orderId
                val listed = customerInfo.nonSubscriptionTransactions.filter { it.productIdentifier == id && (store == null || it.storeTransactionId == store) }
                    .maxByOrNull { it.purchaseDate }
                if (listed == null) {
                    // charged, but RevenueCat has no id for it yet; the page credits it from the list
                    failed(id, "late")
                    ask(false, true)
                    return
                }
                activity.emit(JSONObject().put("t", "bought").put("id", id).put("tx", listed.transactionIdentifier).put("at", listed.purchaseDate.time))
            }

            override fun onError(error: PurchasesError, userCancelled: Boolean) {
                when {
                    userCancelled -> failed(id, "cancel")
                    error.code == PurchasesErrorCode.PaymentPendingError -> activity.emit(JSONObject().put("t", "pending").put("id", id))
                    else -> failed(id, "error")
                }
            }
        })
    }

    fun restore() = ask(true)

    fun sync() = ask(false, sync = true)

    private fun owned() = ask(false)

    private fun ask(restored: Boolean, fresh: Boolean = false, sync: Boolean = false) {
        val done = object : ReceiveCustomerInfoCallback {
            override fun onReceived(customerInfo: CustomerInfo) = send(customerInfo, restored, sync)

            override fun onError(error: PurchasesError) {
                if (restored) activity.emit(JSONObject().put("t", "restoreFailed"))
            }
        }
        if (restored) Purchases.sharedInstance.restorePurchases(done) else if (sync) Purchases.sharedInstance.syncPurchases(object : SyncPurchasesCallback {
            override fun onSuccess(customerInfo: CustomerInfo) = send(customerInfo, false, true)

            override fun onError(error: PurchasesError) {}
        }) else Purchases.sharedInstance.getCustomerInfo(if (fresh) CacheFetchPolicy.FETCH_CURRENT else CacheFetchPolicy.default(), done)
    }

    private fun send(info: CustomerInfo, restored: Boolean, sync: Boolean = false) {
        val ids = JSONArray()
        info.allPurchasedProductIds.forEach { ids.put(it) }
        val tx = JSONArray()
        info.nonSubscriptionTransactions.forEach {
            tx.put(JSONObject().put("id", it.productIdentifier).put("tx", it.transactionIdentifier).put("at", it.purchaseDate.time))
        }
        activity.emit(JSONObject().put("t", "owned").put("ids", ids).put("tx", tx).put("user", Purchases.sharedInstance.appUserID).put("restore", restored).put("sync", sync))
    }

    private fun failed(id: String, why: String) {
        activity.emit(JSONObject().put("t", "failed").put("id", id).put("why", why))
    }
}
