// Fotografija igrača bez pozadine (Apple Vision, macOS 14+): license-cutout <ulaz.jpg> <izlaz.png>
// Prozirna pozadina, obrezano na osobu. Poziva je scripts/license-cutouts.mjs.
import Foundation
import Vision
import CoreImage
import AppKit

let args = CommandLine.arguments
guard args.count == 3 else { fputs("usage: cutout in out\n", stderr); exit(2) }
let input = URL(fileURLWithPath: args[1]), output = URL(fileURLWithPath: args[2])
guard let ci = CIImage(contentsOf: input, options: [.applyOrientationProperty: true]) else { fputs("bad image\n", stderr); exit(1) }
let handler = VNImageRequestHandler(ciImage: ci)
let req = VNGenerateForegroundInstanceMaskRequest()
do { try handler.perform([req]) } catch { fputs("vision: \(error)\n", stderr); exit(1) }
guard let obs = req.results?.first, !obs.allInstances.isEmpty else { fputs("no subject\n", stderr); exit(3) }
let buf = try obs.generateMaskedImage(ofInstances: obs.allInstances, from: handler, croppedToInstancesExtent: true)
let outCI = CIImage(cvPixelBuffer: buf)
let ctx = CIContext()
guard let cg = ctx.createCGImage(outCI, from: outCI.extent) else { exit(1) }
let rep = NSBitmapImageRep(cgImage: cg)
guard let png = rep.representation(using: .png, properties: [:]) else { exit(1) }
try png.write(to: output)
print("\(cg.width)x\(cg.height)")
