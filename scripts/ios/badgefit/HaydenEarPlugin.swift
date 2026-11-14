import Foundation
import Capacitor
import Speech
import AVFoundation

/**
 * Hayden's ears in the iPhone app (frontend/src/lib/police/listen.js): Apple's own speech
 * recognition, the one dictation uses. The web page's speech recognition is not dependable inside
 * the app (often missing, and it lost the microphone to the silent session that keeps Hayden's
 * voice going), so the app listens here instead.
 *
 *   available()                          { available } when the phone can recognise English now
 *   listen({ lang, silenceMs, noSpeechMs, maxMs })
 *                                        one turn: resolves { text } after a pause in the speech,
 *                                        no speech at all, or the cap; { error } when it cannot
 *                                        ('not-allowed' for a microphone or speech permission said no)
 *   stop()                               ends the turn now with what was heard
 *   cancel()                             ends the turn, nothing kept
 * While listening it sends `heard` events ({ text }) with the words so far.
 */
@objc(HaydenEarPlugin)
public class HaydenEarPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HaydenEarPlugin"
    public let jsName = "HaydenEar"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise),
    ]

    private let engine = AVAudioEngine()
    private var recognizer: SFSpeechRecognizer?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var pending: CAPPluginCall?
    private var heard = ""
    private var silenceTimer: Timer?
    private var noSpeechTimer: Timer?
    private var capTimer: Timer?
    private var silenceMs: Double = 1800

    @objc func available(_ call: CAPPluginCall) {
        let lang = call.getString("lang") ?? "en-AU"
        let r = SFSpeechRecognizer(locale: Locale(identifier: lang)) ?? SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
        call.resolve(["available": r?.isAvailable ?? false])
    }

    @objc func listen(_ call: CAPPluginCall) {
        let lang = call.getString("lang") ?? "en-AU"
        silenceMs = call.getDouble("silenceMs") ?? 1800
        let noSpeechMs = call.getDouble("noSpeechMs") ?? 20000
        let maxMs = call.getDouble("maxMs") ?? 20000
        DispatchQueue.main.async {
            // One turn at a time: a new one ends the one before.
            self.finish(keep: false)
            self.pending = call
            self.permissions { ok in
                guard ok else { self.fail("not-allowed"); return }
                self.begin(lang: lang, noSpeechMs: noSpeechMs, maxMs: maxMs)
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { self.finish(keep: true); call.resolve() }
    }

    @objc func cancel(_ call: CAPPluginCall) {
        DispatchQueue.main.async { self.finish(keep: false); call.resolve() }
    }

    /// Speech recognition and the microphone, asked for once (the answers are remembered).
    private func permissions(_ done: @escaping (Bool) -> Void) {
        SFSpeechRecognizer.requestAuthorization { status in
            guard status == .authorized else { DispatchQueue.main.async { done(false) }; return }
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                DispatchQueue.main.async { done(granted) }
            }
        }
    }

    private func begin(lang: String, noSpeechMs: Double, maxMs: Double) {
        guard pending != nil else { return }
        let r = SFSpeechRecognizer(locale: Locale(identifier: lang)) ?? SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
        guard let rec = r, rec.isAvailable else { fail("unavailable"); return }
        recognizer = rec
        heard = ""
        let s = AVAudioSession.sharedInstance()
        do {
            // Record and play together, beside the member's music (turned down while he listens).
            try s.setCategory(.playAndRecord, mode: .default, options: [.mixWithOthers, .duckOthers, .defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP])
            try s.setActive(true)
        } catch { fail("audio"); return }
        let req = SFSpeechAudioBufferRecognitionRequest()
        req.shouldReportPartialResults = true
        req.taskHint = .dictation
        request = req
        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        guard format.sampleRate > 0 else { fail("audio"); return }
        input.removeTap(onBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            self?.request?.append(buffer)
        }
        engine.prepare()
        do { try engine.start() } catch { fail("audio"); return }
        task = rec.recognitionTask(with: req) { [weak self] result, error in
            DispatchQueue.main.async {
                guard let self = self, self.pending != nil else { return }
                if let result = result {
                    self.heard = result.bestTranscription.formattedString
                    self.notifyListeners("heard", data: ["text": self.heard])
                    self.noSpeechTimer?.invalidate(); self.noSpeechTimer = nil
                    // A pause after speech ends the turn.
                    self.silenceTimer?.invalidate()
                    self.silenceTimer = Timer.scheduledTimer(withTimeInterval: self.silenceMs / 1000, repeats: false) { _ in self.finish(keep: true) }
                    if result.isFinal { self.finish(keep: true) }
                } else if error != nil {
                    self.finish(keep: true)
                }
            }
        }
        noSpeechTimer = Timer.scheduledTimer(withTimeInterval: noSpeechMs / 1000, repeats: false) { [weak self] _ in self?.finish(keep: true) }
        capTimer = Timer.scheduledTimer(withTimeInterval: maxMs / 1000, repeats: false) { [weak self] _ in self?.finish(keep: true) }
    }

    private func fail(_ code: String) {
        let call = pending
        teardown()
        call?.resolve(["error": code])
    }

    /// Ends the turn: answers with what was heard (`keep`) or nothing, and lets the microphone go.
    private func finish(keep: Bool) {
        guard let call = pending else { teardown(); return }
        let text = keep ? heard.trimmingCharacters(in: .whitespacesAndNewlines) : ""
        teardown()
        call.resolve(["text": text])
    }

    private func teardown() {
        pending = nil
        silenceTimer?.invalidate(); silenceTimer = nil
        noSpeechTimer?.invalidate(); noSpeechTimer = nil
        capTimer?.invalidate(); capTimer = nil
        if engine.isRunning { engine.stop() }
        engine.inputNode.removeTap(onBus: 0)
        request?.endAudio(); request = nil
        task?.cancel(); task = nil
        // Back to playing only, beside other audio: Hayden's voice and the run cues carry on
        // (RunCuesPlugin keeps its silent session going from here).
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])
    }
}
