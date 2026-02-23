package com.bakirkhata

import android.os.Build
import android.telephony.SmsManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SmsSenderModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "SmsSender"
    }

    @ReactMethod
    fun sendSms(phoneNumber: String, message: String, simSlot: Int, promise: Promise) {
        try {
            val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                // For dual SIM, get SmsManager for subscriptionId
                // This returns a single SmsManager object, not a list
                SmsManager.getSmsManagerForSubscriptionId(simSlot)
            } else {
                SmsManager.getDefault()
            }

            smsManager.sendTextMessage(phoneNumber, null, message, null, null)
            promise.resolve("SMS Sent")
        } catch (e: Exception) {
            promise.reject("SMS_FAILED", e.message ?: "Unknown error")
        }
    }
}