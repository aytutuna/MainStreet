import AVFoundation
import UIKit

// Live radio streams for the page's Radio panel, and the check for other music. The page sends {cmd: "radio", url, vol},
// {cmd: "radio", vol}, {cmd: "radio", stop: true} and {cmd: "radio", check: true}; shop.js lists the answers. The audio
// session stays ambient, so the streams follow the silent switch and mix with whatever else plays.
final class RadioBridge: NSObject, AVPlayerItemMetadataOutputPushDelegate {
    private var player: AVPlayer?
    private var url = ""
    private var watching: [NSKeyValueObservation] = []
    private let emit: ([String: Any]) -> Void

    init(emit: @escaping ([String: Any]) -> Void) {
        self.emit = emit
        super.init()
        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(check), name: AVAudioSession.silenceSecondaryAudioHintNotification, object: nil)
        center.addObserver(self, selector: #selector(check), name: UIApplication.didBecomeActiveNotification, object: nil)
        // streams only play while the game is in front
        center.addObserver(self, selector: #selector(stop), name: UIApplication.didEnterBackgroundNotification, object: nil)
    }

    func command(_ msg: [String: Any]) {
        if msg["stop"] as? Bool == true {
            stop()
        } else if msg["check"] as? Bool == true {
            check()
        } else if let text = msg["url"] as? String, let address = URL(string: text) {
            play(address, volume: Float(msg["vol"] as? Double ?? 1))
        } else if let volume = msg["vol"] as? Double {
            player?.volume = Float(volume)
        }
    }

    private func play(_ address: URL, volume: Float) {
        stop()
        url = address.absoluteString
        let item = AVPlayerItem(url: address)
        let titles = AVPlayerItemMetadataOutput(identifiers: nil)
        titles.setDelegate(self, queue: .main)
        item.add(titles)
        let next = AVPlayer(playerItem: item)
        next.volume = volume
        watching = [
            item.observe(\.status) { [weak self] item, _ in
                if item.status == .failed { self?.event("error") }
            },
            next.observe(\.timeControlStatus) { [weak self] player, _ in
                switch player.timeControlStatus {
                case .waitingToPlayAtSpecifiedRate: self?.event("buffering")
                case .playing: self?.event("playing")
                default: break
                }
            },
        ]
        player = next
        next.play()
    }

    @objc private func stop() {
        watching.forEach { $0.invalidate() }
        watching = []
        player?.pause()
        player = nil
    }

    // the hint is on while another app plays audio of its own
    @objc private func check() {
        emit(["t": "other", "on": AVAudioSession.sharedInstance().secondaryAudioShouldBeSilencedHint])
    }

    func metadataOutput(_ output: AVPlayerItemMetadataOutput, didOutputTimedMetadataGroups groups: [AVTimedMetadataGroup], from track: AVPlayerItemTrack?) {
        guard let item = groups.flatMap({ $0.items }).first(where: { $0.identifier == .icyMetadataStreamTitle }) else { return }
        Task { @MainActor in
            if let title = try? await item.load(.stringValue) { event("playing", title) }
        }
    }

    private func event(_ state: String, _ title: String? = nil) {
        var msg: [String: Any] = ["t": "radio", "state": state, "url": url]
        if let title = title { msg["title"] = title }
        emit(msg)
    }
}
