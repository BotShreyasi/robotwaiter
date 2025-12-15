package com.robotwaiter.azure

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.microsoft.cognitiveservices.speech.ResultReason
import com.microsoft.cognitiveservices.speech.SpeechConfig
import com.microsoft.cognitiveservices.speech.SpeechRecognizer
import com.microsoft.cognitiveservices.speech.audio.AudioConfig
import java.util.concurrent.Executors

class AzureSTTModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val executor = Executors.newSingleThreadExecutor()
  private var recognizer: SpeechRecognizer? = null
  private var speechConfig: SpeechConfig? = null
  private var audioConfig: AudioConfig? = null

  override fun getName() = "AzureSTT"

  private fun sendEvent(type: String, text: String? = null, extra: String? = null) {
    val params = Arguments.createMap()
    params.putString("type", type)
    if (text != null) params.putString("text", text)
    if (extra != null) params.putString("extra", extra)
    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("AzureSTTEvent", params)
  }

  @ReactMethod
  fun start(key: String, region: String, language: String?, promise: Promise) {
    executor.execute {
      try {
        if (recognizer != null) {
          promise.resolve(null)
          return@execute
        }

        speechConfig = SpeechConfig.fromSubscription(key, region).apply {
          speechRecognitionLanguage = language ?: "hi-IN"
        }
        audioConfig = AudioConfig.fromDefaultMicrophoneInput()
        recognizer = SpeechRecognizer(speechConfig, audioConfig)

        recognizer?.recognizing?.addEventListener { _, e ->
          if (e.result?.reason == ResultReason.RecognizingSpeech) {
            sendEvent("partial", e.result.text ?: "")
          }
        }

        recognizer?.recognized?.addEventListener { _, e ->
          if (e.result?.reason == ResultReason.RecognizedSpeech) {
            sendEvent("final", e.result.text ?: "")
          }
        }

        recognizer?.canceled?.addEventListener { _, e ->
          val err = e.errorDetails ?: ""
          sendEvent("error", null, "Canceled: ${e.reason} $err")
        }

        recognizer?.sessionStarted?.addEventListener { _, _ ->
          sendEvent("status", "started")
        }
        recognizer?.sessionStopped?.addEventListener { _, _ ->
          sendEvent("status", "stopped")
        }

        recognizer?.startContinuousRecognitionAsync()?.get()
        promise.resolve(null)
      } catch (ex: Exception) {
        stopInternal()
        promise.reject("STT_START", ex)
      }
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    executor.execute {
      try {
        recognizer?.stopContinuousRecognitionAsync()?.get()
        stopInternal()
        promise.resolve(null)
      } catch (ex: Exception) {
        stopInternal()
        promise.reject("STT_STOP", ex)
      }
    }
  }

  private fun stopInternal() {
    try {
      recognizer?.close()
    } catch (_: Exception) {}
    try {
      audioConfig?.close()
    } catch (_: Exception) {}
    try {
      speechConfig?.close()
    } catch (_: Exception) {}
    recognizer = null
    audioConfig = null
    speechConfig = null
  }

  override fun onCatalystInstanceDestroy() {
    stopInternal()
    executor.shutdown()
    super.onCatalystInstanceDestroy()
  }
}

