package com.aytutuna.mainstreet

import com.revenuecat.purchases.CustomerInfo
import com.revenuecat.purchases.PurchaseParams
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration
import com.revenuecat.purchases.PurchasesError
import com.revenuecat.purchases.interfaces.GetStoreProductsCallback
import com.revenuecat.purchases.interfaces.PurchaseCallback
import com.revenuecat.purchases.interfaces.UpdatedCustomerInfoListener
import com.revenuecat.purchases.interfaces.ReceiveCustomerInfoCallback
import com.revenuecat.purchases.models.StoreProduct
import com.revenuecat.purchases.models.StoreTransaction
import org.json.JSONArray
import org.json.JSONObject

// Purchases through RevenueCat. The events it sends the page are listed at the top of shop.js.
class StoreBridge(private val activity: MainActivity) {
    private val found = HashMap<String, StoreProduct>()

    init {
        if (!Purchases.isConfigured) {
            Purchases.configure(PurchasesConfiguration.Builder(activity.applicationContext, BuildConfig.RC_KEY).build())
        }
        // a purchase finished while the page was gone shows up here; the page credits it if it has not yet
        Purchases.sharedInstance.updatedCustomerInfoListener = UpdatedCustomerInfoListener { send(it, false) }
    }

    fun stop() {
        Purchases.sharedInstance.updatedCustomerInfoListener = null
    }

    fun products(ids: JSONArray?) {
        val list = List(ids?.length() ?: 0) { ids!!.getString(it) }
        Purchases.sharedInstance.getProducts(list, object : GetStoreProductsCallback {
            override fun onReceived(storeProducts: List<StoreProduct>) {
                storeProducts.forEach { found[it.id] = it }
                val out = JSONArray()
                storeProducts.forEach { out.put(JSONObject().put("id", it.id).put("price", it.price.formatted)) }
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
                val listed = customerInfo.nonSubscriptionTransactions.filter { it.productIdentifier == id }.maxByOrNull { it.purchaseDate }
                val tx = listed?.transactionIdentifier ?: storeTransaction.orderId ?: storeTransaction.purchaseToken
                val at = listed?.purchaseDate?.time ?: storeTransaction.purchaseTime
                activity.emit(JSONObject().put("t", "bought").put("id", id).put("tx", tx).put("at", at))
            }

            override fun onError(error: PurchasesError, userCancelled: Boolean) {
                failed(id, if (userCancelled) "cancel" else "error")
            }
        })
    }

    fun restore() = ask(true)

    private fun owned() = ask(false)

    private fun ask(restored: Boolean) {
        val done = object : ReceiveCustomerInfoCallback {
            override fun onReceived(customerInfo: CustomerInfo) = send(customerInfo, restored)

            override fun onError(error: PurchasesError) {
                if (restored) activity.emit(JSONObject().put("t", "owned").put("ids", JSONArray()).put("restore", true))
            }
        }
        if (restored) Purchases.sharedInstance.restorePurchases(done) else Purchases.sharedInstance.getCustomerInfo(done)
    }

    private fun send(info: CustomerInfo, restored: Boolean) {
        val ids = JSONArray()
        info.allPurchasedProductIds.forEach { ids.put(it) }
        val tx = JSONArray()
        info.nonSubscriptionTransactions.forEach {
            tx.put(JSONObject().put("id", it.productIdentifier).put("tx", it.transactionIdentifier).put("at", it.purchaseDate.time))
        }
        activity.emit(JSONObject().put("t", "owned").put("ids", ids).put("tx", tx).put("restore", restored))
    }

    private fun failed(id: String, why: String) {
        activity.emit(JSONObject().put("t", "failed").put("id", id).put("why", why))
    }
}
