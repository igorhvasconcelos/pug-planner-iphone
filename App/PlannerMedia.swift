import UIKit
import Vision
import ImageIO

enum PlannerMedia {
    static func recognize(_ data: Data) throws -> String {
        guard let src = CGImageSourceCreateWithData(data as CFData, nil),
              let cg = CGImageSourceCreateThumbnailAtIndex(src,0,[
                kCGImageSourceCreateThumbnailFromImageAlways:true,
                kCGImageSourceCreateThumbnailWithTransform:true,
                kCGImageSourceThumbnailMaxPixelSize:4096
              ] as CFDictionary) else { throw CocoaError(.fileReadCorruptFile) }
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
