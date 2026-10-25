import AVFoundation
import Foundation

// Uso:
//   swift scripts/comprimir-video.swift <entrada> <salida.mp4> [ancho] [bitrateKbps]
// Convierte a H.264 SIN audio, con ancho y bitrate controlados (ideal para la web).
// Ejemplo: swift scripts/comprimir-video.swift in.mov out.mp4 960 1400

guard CommandLine.arguments.count >= 3 else {
  print("Uso: swift comprimir-video.swift <entrada> <salida> [ancho] [bitrateKbps]")
  exit(1)
}

let entrada = URL(fileURLWithPath: CommandLine.arguments[1])
let salida = URL(fileURLWithPath: CommandLine.arguments[2])
let anchoObjetivo = CommandLine.arguments.count > 3 ? Int(CommandLine.arguments[3]) ?? 960 : 960
let bitrateKbps = CommandLine.arguments.count > 4 ? Int(CommandLine.arguments[4]) ?? 1400 : 1400

let asset = AVURLAsset(url: entrada)

guard let pista = asset.tracks(withMediaType: .video).first else {
  print("ERROR: sin pista de video")
  exit(2)
}

// Tamaño ya orientado (algunos videos traen la rotación en los metadatos)
let rectOrientado = CGRect(origin: .zero, size: pista.naturalSize).applying(pista.preferredTransform)
let base = CGSize(width: abs(rectOrientado.width), height: abs(rectOrientado.height))
guard base.width > 0, base.height > 0 else {
  print("ERROR: dimensiones inválidas")
  exit(3)
}

let escala = CGFloat(anchoObjetivo) / base.width
let ancho = Int((base.width * escala).rounded()) / 2 * 2
let alto = Int((base.height * escala).rounded()) / 2 * 2
let duracion = asset.duration
print("origen: \(Int(base.width))x\(Int(base.height))  salida: \(ancho)x\(alto) @ \(bitrateKbps)kbps")

// ---------- Composición de video (orientación + escala) ----------
let compo = AVMutableVideoComposition()
compo.renderSize = CGSize(width: ancho, height: alto)
compo.frameDuration = CMTime(value: 1, timescale: 30)

let instruccion = AVMutableVideoCompositionInstruction()
instruccion.timeRange = CMTimeRange(start: .zero, duration: duracion)

let capa = AVMutableVideoCompositionLayerInstruction(assetTrack: pista)
let escalaCG = CGAffineTransform(scaleX: escala, y: escala)
// Si el video trae rotación, la aplicamos primero y luego escalamos.
let transform = pista.preferredTransform.concatenating(escalaCG)
capa.setTransform(transform, at: .zero)
if !pista.preferredTransform.isIdentity {
  print("aviso: el video trae rotación embebida")
}

instruccion.layerInstructions = [capa]
compo.instructions = [instruccion]

// ---------- Lector ----------
let lector = try! AVAssetReader(asset: asset)
let salidaCompuesta = AVAssetReaderVideoCompositionOutput(videoTracks: [pista], videoSettings: nil)
salidaCompuesta.videoComposition = compo
salidaCompuesta.alwaysCopiesSampleData = false
guard lector.canAdd(salidaCompuesta) else {
  print("ERROR: no se pudo agregar la salida al lector")
  exit(4)
}
lector.add(salidaCompuesta)

// ---------- Escritor ----------
try? FileManager.default.removeItem(at: salida)
let escritor = try! AVAssetWriter(outputURL: salida, fileType: .mp4)

let configVideo: [String: Any] = [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: ancho,
  AVVideoHeightKey: alto,
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: bitrateKbps * 1000,
    AVVideoExpectedSourceFrameRateKey: 30,
    AVVideoMaxKeyFrameIntervalKey: 60,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
  ]
]

let entradaEscritor = AVAssetWriterInput(mediaType: .video, outputSettings: configVideo)
entradaEscritor.expectsMediaDataInRealTime = false

let adaptador = AVAssetWriterInputPixelBufferAdaptor(
  assetWriterInput: entradaEscritor,
  sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange,
    kCVPixelBufferWidthKey as String: ancho,
    kCVPixelBufferHeightKey as String: alto
  ]
)

guard escritor.canAdd(entradaEscritor) else {
  print("ERROR: no se pudo agregar la entrada al escritor")
  exit(5)
}
escritor.add(entradaEscritor)

guard escritor.startWriting() else {
  print("ERROR: \(escritor.error?.localizedDescription ?? "sin detalle")")
  exit(6)
}
escritor.startSession(atSourceTime: .zero)

guard lector.startReading() else {
  print("ERROR: \(lector.error?.localizedDescription ?? "no arrancó el lector")")
  exit(7)
}

var finalizado = false
entradaEscritor.requestMediaDataWhenReady(on: DispatchQueue.global(qos: .userInitiated)) {
  while entradaEscritor.isReadyForMoreMediaData {
    if let muestra = salidaCompuesta.copyNextSampleBuffer(),
       let fuente = CMSampleBufferGetImageBuffer(muestra) {
      let tiempo = CMSampleBufferGetPresentationTimeStamp(muestra)
      if !adaptador.append(fuente, withPresentationTime: tiempo) {
        entradaEscritor.markAsFinished()
        escritor.finishWriting { finalizado = true }
        return
      }
    } else {
      entradaEscritor.markAsFinished()
      escritor.finishWriting { finalizado = true }
      return
    }
  }
}

// Espera a que termine (máx. 180 s)
let limite = Date().addingTimeInterval(180)
while !finalizado && Date() < limite {
  Thread.sleep(forTimeInterval: 0.2)
}

if escritor.status == .completed {
  let attrs = try? FileManager.default.attributesOfItem(atPath: salida.path)
  let bytes = (attrs?[.size] as? NSNumber)?.doubleValue ?? 0
  print(String(format: "OK %.2f MB -> %@", bytes / 1048576.0, salida.path))
} else {
  print("ERROR: \(escritor.error?.localizedDescription ?? "falló la escritura")")
  exit(8)
}
