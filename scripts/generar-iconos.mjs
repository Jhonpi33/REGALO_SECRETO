#!/usr/bin/env node
/**
 * Genera los íconos PNG de la PWA (sin dependencias externas).
 * Diseño: fondo degradado rosa → azul con una caja de regalo crema y cinta dorada.
 *
 * Uso:  node scripts/generar-iconos.mjs
 * Salida:  public/icons/*.png
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const SALIDA = join(RAIZ, 'public', 'icons')
const TAMANOS = [72, 96, 128, 144, 152, 192, 512]

mkdirSync(SALIDA, { recursive: true })

/* ---------------- Codificación PNG ---------------- */

const CRC_TABLA = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (let i = 0; i < buffer.length; i++) c = CRC_TABLA[(c ^ buffer[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(tipo, datos) {
  const largo = Buffer.alloc(4)
  largo.writeUInt32BE(datos.length)
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(cuerpo))
  return Buffer.concat([largo, cuerpo, crc])
}

function aPNG(ancho, alto, pixeles) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(ancho, 0)
  ihdr.writeUInt32BE(alto, 4)
  ihdr[8] = 8 // bits por canal
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  // Filas con byte de filtro 0 al inicio
  const crudo = Buffer.alloc((ancho * 4 + 1) * alto)
  for (let y = 0; y < alto; y++) {
    const inicioFila = y * (ancho * 4 + 1)
    crudo[inicioFila] = 0
    pixeles.copy(crudo, inicioFila + 1, y * ancho * 4, (y + 1) * ancho * 4)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(crudo, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/* ---------------- Dibujo ---------------- */

const ROSA = [224, 85, 155]
const AZUL = [61, 139, 253]
const MORADO = [168, 85, 247]
const CREMA = [255, 243, 214]
const DORADO = [255, 217, 138]
const BLANCO = [255, 255, 255]

const mezcla = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, t))))

/** ¿Está el punto dentro de un rectángulo redondeado? */
function enRectRedondeado(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const cx = Math.max(x0 + r, Math.min(x1 - r, x))
  const cy = Math.max(y0 + r, Math.min(y1 - r, y))
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

function dibujarIcono(tam) {
  const pixeles = Buffer.alloc(tam * tam * 4)
  const escala = tam / 512 // se dibuja en una cuadrícula de 512
  const radio = tam * 0.2 // esquinas redondeadas

  // Formas en coordenadas de 512
  const cuerpo = { x0: 130, y0: 250, x1: 382, y1: 430 }
  const tapa = { x0: 112, y0: 196, x1: 400, y1: 256 }
  const cinta = { x0: 232, x1: 280 }
  const lazoIzq = { cx: 226, cy: 168, r: 46 }
  const lazoDer = { cx: 286, cy: 168, r: 46 }
  const nudo = { cx: 256, cy: 196, r: 24 }

  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      const i = (y * tam + x) * 4
      // Punto en la cuadrícula de diseño de 512x512
      const u = x / tam
      const v = y / tam
      const px = u * 512
      const py = v * 512

      // --- Fondo: degradado rosa → morado → azul ---
      let color = mezcla(ROSA, MORADO, u * 0.9 + v * 0.3)
      color = mezcla(color, AZUL, Math.max(0, u + v - 0.9))

      // Brillo radial suave arriba a la izquierda
      const brillo = Math.max(0, 1 - Math.hypot(u - 0.3, v - 0.25) * 1.5)
      color = mezcla(color, BLANCO, brillo * 0.18)

      const dentro = enRectRedondeado(x + 0.5, y + 0.5, 0, 0, tam - 1, tam - 1, radio)

      // --- Sombra de la caja ---
      const dentroSombra = enRectRedondeado(px, py, 102, 448, 410, 482, 17)
      if (dentroSombra) color = mezcla(color, [0, 0, 0], 0.28)

      // --- Cuerpo de la caja ---
      const enCuerpo = enRectRedondeado(px, py, cuerpo.x0, cuerpo.y0, cuerpo.x1, cuerpo.y1, 22)
      if (enCuerpo) color = CREMA

      // --- Tapa ---
      const enTapa = enRectRedondeado(px, py, tapa.x0, tapa.y0, tapa.x1, tapa.y1, 18)
      if (enTapa) color = BLANCO

      // --- Cinta vertical ---
      const enCinta =
        px >= cinta.x0 &&
        px <= cinta.x1 &&
        ((py >= cuerpo.y0 && py <= cuerpo.y1) || (py >= tapa.y0 && py <= tapa.y1))
      if (enCinta) color = DORADO

      // --- Lazos y nudo ---
      if ((px - lazoIzq.cx) ** 2 + (py - lazoIzq.cy) ** 2 < lazoIzq.r ** 2) color = DORADO
      if ((px - lazoDer.cx) ** 2 + (py - lazoDer.cy) ** 2 < lazoDer.r ** 2) color = DORADO
      if ((px - nudo.cx) ** 2 + (py - nudo.cy) ** 2 < nudo.r ** 2) color = CREMA

      // Brillo en el borde superior de la tapa
      if (enTapa && py < tapa.y0 + 8) color = mezcla(color, BLANCO, 0.5)

      const alfa = dentro ? 255 : 0
      pixeles[i] = color[0]
      pixeles[i + 1] = color[1]
      pixeles[i + 2] = color[2]
      pixeles[i + 3] = alfa
    }
  }

  return aPNG(tam, tam, pixeles)
}

for (const tam of TAMANOS) {
  const archivo = join(SALIDA, `icon-${tam}x${tam}.png`)
  writeFileSync(archivo, dibujarIcono(tam))
  console.log('✅', archivo)
}
console.log('Listo: íconos generados en public/icons/')
