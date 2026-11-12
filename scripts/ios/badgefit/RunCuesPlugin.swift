import Foundation
import Capacitor
import AVFoundation

/**
 * Hayden in your pocket (frontend/src/lib/police/pocket.js): his voice with the screen locked or
 * another app in front, over the member's music, which dips while he talks and comes back after.
 *
 *   keep({ on })        a silent audio session that mixes with other audio, so the app stays awake
 *                       during a run, a walk or a gym session (needs the `audio` background mode)
 *   schedule({ cues })  [{ in: seconds from now, text }]: said by the phone itself at their times
 *   clear()             forgets the scheduled lines (the app is on screen and speaks for itself)
 *   say({ text })       one line now, through the same session
 */
@objc(RunCuesPlugin)
public class RunCuesPlugin: CAPPlugin, CAPBridgedPlugin, AVSpeechSynthesizerDelegate {
    public let identifier = "RunCuesPlugin"
    public let jsName = "RunCues"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "keep", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "say", returnType: CAPPluginReturnPromise),
    ]

    private let speech = AVSpeechSynthesizer()
    private var keeper: AVAudioPlayer?
    private var watch: Timer?
    private var timers: [Timer] = []
    private var on = false

    public override func load() {
        speech.delegate = self
    }

    /// One second of silence as a WAV file in memory (8 kHz, 16-bit, mono).
    private static func silence() -> Data {
        let samples = 8000
        let dataSize = UInt32(samples * 2)
        var d = Data()
        func u32(_ v: UInt32) { var x = v.littleEndian; d.append(Data(bytes: &x, count: 4)) }
        func u16(_ v: UInt16) { var x = v.littleEndian; d.append(Data(bytes: &x, count: 2)) }
        d.append("RIFF".data(using: .ascii)!); u32(36 + dataSize)
        d.append("WAVE".data(using: .ascii)!)
        d.append("fmt ".data(using: .ascii)!); u32(16); u16(1); u16(1); u32(8000); u32(16000); u16(2); u16(16)
        d.append("data".data(using: .ascii)!); u32(dataSize)
        d.append(Data(count: Int(dataSize)))
        return d
    }

    /// The session Hayden talks through: plays with the screen locked and the silent switch on,
    /// beside other audio. `duck`: other audio turned down (while a line is being said).
    private func session(duck: Bool) {
        let s = AVAudioSession.sharedInstance()
        let options: AVAudioSession.CategoryOptions = duck ? [.mixWithOthers, .duckOthers] : [.mixWithOthers]
        try? s.setCategory(.playback, mode: duck ? .voicePrompt : .default, options: options)
        try? s.setActive(true)
    }

    private func startKeeper() {
        if AVAudioSession.sharedInstance().category != .playAndRecord { session(duck: speech.isSpeaking) }
        if keeper == nil {
            keeper = try? AVAudioPlayer(data: RunCuesPlugin.silence())
            keeper?.numberOfLoops = -1
            keeper?.volume = 0
        }
        if keeper?.isPlaying != true { keeper?.play() }
    }

    @objc func keep(_ call: CAPPluginCall) {
        let want = call.getBool("on") ?? false
        DispatchQueue.main.async {
            self.on = want
            self.watch?.invalidate(); self.watch = nil
            if want {
                self.startKeeper()
                // Another part of the app may change the audio session (a rest tone): put it back.
                self.watch = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { _ in
                    guard self.on else { return }
                    let c = AVAudioSession.sharedInstance().category
                    // Listening to the member (the microphone) has its own category: left alone.
                    if (c != .playback && c != .playAndRecord) || self.keeper?.isPlaying != true { self.startKeeper() }
                }
            } else {
                self.dropCues()
                self.speech.stopSpeaking(at: .immediate)
                self.keeper?.stop(); self.keeper = nil
                try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
            }
            call.resolve()
        }
    }

    private func dropCues() {
        timers.forEach { $0.invalidate() }
        timers = []
    }

    @objc func schedule(_ call: CAPPluginCall) {
        let cues = call.getArray("cues", JSObject.self) ?? []
        DispatchQueue.main.async {
            self.dropCues()
            for cue in cues.prefix(80) {
                guard let text = cue["text"] as? String, !text.isEmpty else { continue }
                let after = (cue["in"] as? NSNumber)?.doubleValue ?? 0
                guard after > 0 else { continue }
                let t = Timer(timeInterval: after, repeats: false) { _ in self.speak(text) }
                RunLoop.main.add(t, forMode: .common)
                self.timers.append(t)
            }
            call.resolve(["scheduled": self.timers.count])
        }
    }

    @objc func clear(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.dropCues()
            call.resolve()
        }
    }

    @objc func say(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.isEmpty else {
            call.reject("nothing to say")
            return
        }
        DispatchQueue.main.async {
            self.speak(text)
            call.resolve()
        }
    }

    private func speak(_ text: String) {
        session(duck: true)
        let u = AVSpeechUtterance(string: text)
        u.voice = RunCuesPlugin.voice()
        u.rate = AVSpeechUtteranceDefaultSpeechRate * 0.97
        u.pitchMultiplier = 0.92
        speech.speak(u)
    }

    /// A male English voice when the phone has one (Hayden), else the phone's English voice.
    private static func voice() -> AVSpeechSynthesisVoice? {
        let english = AVSpeechSynthesisVoice.speechVoices().filter { $0.language.hasPrefix("en") }
        let male = english.filter { $0.gender == .male }
        let best = male.sorted { $0.quality.rawValue > $1.quality.rawValue }.first
        return best ?? AVSpeechSynthesisVoice(language: "en-AU") ?? AVSpeechSynthesisVoice(language: "en-US")
    }

    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) { ended() }
    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) { ended() }

    /// Music back up once nothing is left to say; the silent session stays while a session is on.
    private func ended() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            guard !self.speech.isSpeaking else { return }
            if self.on { self.session(duck: false) } else {
                try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
            }
        }
    }
}
