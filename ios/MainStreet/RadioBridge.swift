import AVFoundation
import UIKit

// Live radio streams for the page's Radio panel, and the check for other music. The page sends {cmd: "radio", url, vol},
// {cmd: "radio", vol}, {cmd: "radio", stop: true} and {cmd: "radio", check: true}; shop.js lists the answers. The audio
// session stays ambient, so the streams follow the silent switch and mix with whatever else plays.
final class RadioBridge: NSObject, AVPlayerItemMetadataOutputPushDelegate {
    private var player: AVPlayer?
    private var url = ""
    private var watching: [NSKeyValueObservation] = []
    private var titles: AVPlayerItemMetadataOutput?
    private var held = false
    private let emit: ([String: Any]) -> Void

    init(emit: @escaping ([String: Any]) -> Void) {
        self.emit = emit
        super.init()
        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(check), name: AVAudioSession.silenceSecondaryAudioHintNotification, object: nil)
        center.addObserver(self, selector: #selector(check), name: UIApplication.didBecomeActiveNotification, object: nil)
        // streams only play while the game is in front
        center.addObserver(self, selector: #selector(stop), name: UIApplication.didEnterBackgroundNotification, object: nil)
        center.addObserver(self, selector: #selector(routeChanged), name: AVAudioSession.routeChangeNotification, object: nil)
        center.addObserver(self, selector: #selector(dropped), name: .AVPlayerItemFailedToPlayToEndTime, object: nil)
        center.addObserver(self, selector: #selector(dropped), name: .AVPlayerItemDidPlayToEndTime, object: nil)
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
        held = false
        let item = AVPlayerItem(url: address)
        let output = AVPlayerItemMetadataOutput(identifiers: nil)
        output.setDelegate(self, queue: .main)
        item.add(output)
        titles = output
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
                // it only pauses by itself when the stream gives out or the system interrupts it
                case .paused: self?.event(self?.held == true ? "paused" : "error")
                @unknown default: break
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
        titles = nil
    }

    // a stream that stops or fails after it started is dropped; the page tries the next url
    @objc private func dropped(_ note: Notification) {
        if note.object as? AVPlayerItem === player?.currentItem { event("error") }
    }

    // unplugged headphones pause the radio, as they do any player
    @objc private func routeChanged(_ note: Notification) {
        let why = (note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt).flatMap(AVAudioSession.RouteChangeReason.init)
        if why == .oldDeviceUnavailable, player != nil {
            held = true
            player?.pause()
        }
    }

    // the hint is on while another app plays audio of its own
    @objc private func check() {
        emit(["t": "other", "on": AVAudioSession.sharedInstance().secondaryAudioShouldBeSilencedHint])
    }

    func metadataOutput(_ output: AVPlayerItemMetadataOutput, didOutputTimedMetadataGroups groups: [AVTimedMetadataGroup], from track: AVPlayerItemTrack?) {
        guard output === titles, let item = groups.flatMap({ $0.items }).first(where: { $0.identifier == .icyMetadataStreamTitle }) else { return }
        let from = url
        Task { @MainActor in
            if let title = try? await item.load(.stringValue), from == url { event("playing", title) }
        }
    }

    private func event(_ state: String, _ title: String? = nil) {
        var msg: [String: Any] = ["t": "radio", "state": state, "url": url]
        if let title = title { msg["title"] = title }
        emit(msg)
    }
}
