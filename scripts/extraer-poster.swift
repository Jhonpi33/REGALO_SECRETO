import AVFoundation
import AppKit

// Uso:  swift scripts/extraer-poster.swift <video> <salida.jpg>
guard CommandLine.arguments.count >= 3 else {
  print("Uso: swift extraer-poster.swift <video> <salida.jpg>")
  exit(1)
}

let entrada = URL(fileURLWithPath: CommandLine.arguments[1])
let salida = URL(fileURLWithPath: CommandLine.arguments[2])

let asset = AVURLAsset(url: entrada)
let duracion = CMTimeGetSeconds(asset.duration)
let pistas = asset.tracks(withMediaType: .video)
let tam = pistas.first?.naturalSize ?? .zero
print(String(format: "duracion=%.1fs  tamano=%.0fx%.0f", duracion, tam.width, tam.height))

do {
  let generador = AVAssetImageGenerator(asset: asset)
  generador.appliesPreferredTrackTransform = true
  generador.requestedTimeToleranceBefore = .zero
  generador.requestedTimeToleranceAfter = .zero

  let instante = CMTime(seconds: min(1.0, max(0.0, duracion / 2)), preferredTimescale: 600)
  let cg = try generador.copyCGImage(at: instante, actualTime: nil)

  let rep = NSBitmapImageRep(cgImage: cg)
  guard let datos = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.82]) else {
    print("ERROR: no se pudo codificar el JPEG")
    exit(3)
  }
  try datos.write(to: salida)
  print("poster -> \(salida.path)")
} catch {
  print("ERROR: \(error.localizedDescription)")
  exit(2)
}
