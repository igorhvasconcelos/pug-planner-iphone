import AVFoundation
import CryptoKit

/// Prepare the voice before scheduling so delivery also works with a locked screen.
enum SpokenTone {
    private static let ring = "reminder_ring.wav"
    static func name(for title:String, locale:String) async throws -> String {
        let fm = FileManager.default
        let folder = try fm.url(for:.libraryDirectory,in:.userDomainMask,appropriateFor:nil,create:true).appendingPathComponent("Sounds")
        try fm.createDirectory(at:folder,withIntermediateDirectories:true)
        let digest = SHA256.hash(data:Data((locale+"\n"+title).utf8)).prefix(16).map { String(format:"%02x",$0) }.joined()
        let name = "pug-"+digest+".caf", destination = folder.appendingPathComponent(name)
        if fm.fileExists(atPath:destination.path) { return name }
        let temp = fm.temporaryDirectory.appendingPathComponent(UUID().uuidString+".caf")
        let stage = folder.appendingPathComponent(UUID().uuidString+".caf")
        defer { try? fm.removeItem(at:temp); try? fm.removeItem(at:stage) }
        let utterance = AVSpeechUtterance(string:title)
        guard let voice = AVSpeechSynthesisVoice(language:locale) else { throw CocoaError(.fileReadUnknown) }
        utterance.voice = voice
        let synth = AVSpeechSynthesizer()
        try await withCheckedThrowingContinuation { (continuation:CheckedContinuation<Void,Error>) in
            var file: AVAudioFile?
            var completed = false
            synth.write(utterance) { buffer in
                guard !completed else { return }
                do {
                    guard let pcm = buffer as? AVAudioPCMBuffer else { throw CocoaError(.fileWriteUnknown) }
                    if pcm.frameLength == 0 {
                        completed = true
                        file = nil
                        continuation.resume()
                        return
                    }
                    if file == nil { file = try AVAudioFile(forWriting:temp,settings:pcm.format.settings,commonFormat:pcm.format.commonFormat,interleaved:pcm.format.isInterleaved) }
                    try file?.write(from:pcm)
                } catch { completed = true; file = nil; continuation.resume(throwing:error) }
            }
        }
        withExtendedLifetime(synth) {}
        guard let ringURL = Bundle.main.url(forResource:"reminder_ring",withExtension:"wav") else { return ring }
        try combine([ringURL,temp],at:stage)
        try fm.moveItem(at:stage,to:destination)
        return name
    }
    private static func combine(_ sources:[URL],at target:URL) throws {
        // Mono linear PCM is directly playable by the system alarm presentation.
        let hz = 22050.0
        let format = AVAudioFormat(standardFormatWithSampleRate:hz,channels:1)!
        let settings:[String:Any] = [AVFormatIDKey:kAudioFormatLinearPCM,AVSampleRateKey:hz,AVNumberOfChannelsKey:1,AVLinearPCMBitDepthKey:16,AVLinearPCMIsFloatKey:false]
        let output = try AVAudioFile(forWriting:target,settings:settings,commonFormat:.pcmFormatFloat32,interleaved:false)
        var available = Int(hz*29)
        for source in sources {
            let file = try AVAudioFile(forReading:source,commonFormat:.pcmFormatFloat32,interleaved:false)
            let rate = file.processingFormat.sampleRate
            let frames = min(file.length,AVAudioFramePosition(rate*29))
            guard frames > 0, let input = AVAudioPCMBuffer(pcmFormat:file.processingFormat,frameCapacity:AVAudioFrameCount(frames)) else { throw CocoaError(.fileReadCorruptFile) }
            try file.read(into:input,frameCount:input.frameCapacity)
            let count = min(available,Int(Double(input.frameLength)*hz/rate))
            guard count > 0, let buffer = AVAudioPCMBuffer(pcmFormat:format,frameCapacity:AVAudioFrameCount(count)), let samples = input.floatChannelData?[0], let result = buffer.floatChannelData?[0] else { throw CocoaError(.fileReadCorruptFile) }
            for i in 0..<count { result[i] = samples[min(Int(Double(i)*rate/hz),Int(input.frameLength)-1)] }
            buffer.frameLength = AVAudioFrameCount(count)
            try output.write(from:buffer)
            available -= count
        }
    }
}
