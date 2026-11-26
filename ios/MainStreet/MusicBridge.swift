import AVFoundation
import UIKit

// Tells the page whether another app is playing audio, so the game keeps its music quiet meanwhile. The page sends
// {cmd: "music", check: true}; shop.js lists the answer. The audio session stays ambient, so the game follows the silent
// switch and mixes with whatever else plays.
final class MusicBridge: NSObject {
    private let emit: ([String: Any]) -> Void

    init(emit: @escaping ([String: Any]) -> Void) {
        self.emit = emit
        super.init()
        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(check), name: AVAudioSession.silenceSecondaryAudioHintNotification, object: nil)
        center.addObserver(self, selector: #selector(check), name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    func command(_ msg: [String: Any]) {
        if msg["check"] as? Bool == true { check() }
    }

    // the hint is on while another app plays audio of its own
    @objc private func check() {
        emit(["t": "other", "on": AVAudioSession.sharedInstance().secondaryAudioShouldBeSilencedHint])
    }
}
