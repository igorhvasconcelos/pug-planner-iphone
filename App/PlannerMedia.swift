import UIKit
import Vision
import ImageIO

enum PlannerMedia {
    static func process(_ data: Data, mode: String) throws -> String {
        let maxPixels: Int
        switch mode {
        case "pug": maxPixels = 768
        case "vaccine", "food": maxPixels = 1024
        default: maxPixels = 4096
        }
        guard let src = CGImageSourceCreateWithData(data as CFData, nil),
              let cg = CGImageSourceCreateThumbnailAtIndex(src,0,[
                kCGImageSourceCreateThumbnailFromImageAlways:true,
                kCGImageSourceCreateThumbnailWithTransform:true,
                kCGImageSourceThumbnailMaxPixelSize:maxPixels
              ] as CFDictionary) else { throw CocoaError(.fileReadCorruptFile) }
        if mode == "vaccine" || mode == "pug" {
            let image = UIImage(cgImage: cg)
            for quality: CGFloat in [0.8, 0.6, 0.4, 0.25, 0.1] {
                if let jpeg = image.jpegData(compressionQuality: quality), jpeg.count <= 230 * 1024 {
                    return jpeg.base64EncodedString()
                }
            }
            throw CocoaError(.fileWriteUnknown)
        }
        if mode == "food" {
            let request = VNClassifyImageRequest()
            try VNImageRequestHandler(cgImage: cg).perform([request])
            let labels = (request.results ?? []).prefix(35).map(\.identifier).joined(separator: "\n")
            let text = (try? recognizeText(cg)) ?? ""
            let result = try JSONSerialization.data(withJSONObject: ["labels": labels, "text": text])
            return String(decoding: result, as: UTF8.self)
        }
        return try recognizeText(cg)
    }

    private static func recognizeText(_ cg: CGImage) throws -> String {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        request.automaticallyDetectsLanguage = true
        try VNImageRequestHandler(cgImage:cg).perform([request])
        let lines = request.results?.compactMap { $0.topCandidates(1).first?.string } ?? []
        guard !lines.isEmpty else { throw NSError(domain:"PugPlanner",code:1,userInfo:[NSLocalizedDescriptionKey:"Não foi encontrado texto legível. Experimenta uma fotografia mais nítida."]) }
        return String(lines.joined(separator:"\n").prefix(16000))
    }
}
