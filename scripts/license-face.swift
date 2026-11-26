// Lice na fotografiji (Apple Vision, macOS 14+): license-face <slika.png> …
// Za svaku sliku ispiše red "putanja<TAB>x,y,w,h" (najveće lice, 0–1 od gornjeg lijevog ugla) ili "putanja<TAB>-".
// Poziva je scripts/license-cutouts.mjs.
import Foundation
import Vision
import CoreImage

for path in CommandLine.arguments.dropFirst() {
  guard let image = CIImage(contentsOf: URL(fileURLWithPath: path), options: [.applyOrientationProperty: true]) else {
    print("\(path)\t-")
    continue
  }
  let request = VNDetectFaceRectanglesRequest()
  try? VNImageRequestHandler(ciImage: image).perform([request])
  let faces = (request.results ?? []).sorted { $0.boundingBox.width * $0.boundingBox.height > $1.boundingBox.width * $1.boundingBox.height }
  if let box = faces.first?.boundingBox {
    // Vision broji y odozdo; ovdje od vrha
    print(String(format: "%@\t%.4f,%.4f,%.4f,%.4f", path, box.minX, 1 - box.maxY, box.width, box.height))
  } else {
    print("\(path)\t-")
  }
}
