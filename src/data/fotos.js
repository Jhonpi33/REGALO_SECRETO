/**
 * Galería de fotos de la pareja.
 *
 * CÓMO AGREGAR TUS FOTOS:
 * 1. Copia los archivos a la carpeta  /public/fotos/
 * 2. Escribe el nombre de cada archivo abajo (uno por línea).
 * 3. Opcional: agrega un  pie  para cada foto.
 *
 * Ejemplo:
 *   { archivo: 'playa.jpg', pie: 'Nuestro viaje a la playa' },
 *
 * Si el nombre empieza con  /  se toma como ruta completa del proyecto
 * (así se pueden usar también los pósteres de los videos).
 *
 * El diseño se ve bien con entre 3 y 12 fotos.
 * Si no hay ninguna, se muestra un placeholder bonito.
 */

export const FOTOS = [
  { archivo: 'pareja-01.jpg', pie: 'Risitas y abrazos' },
  { archivo: 'pareja-03.jpg', pie: 'El día de la pregunta 💍' },
  { archivo: 'pareja-02.jpg', pie: 'Aventura en la montaña' },
  { archivo: '/videos/poster-01.jpg', pie: 'Un momento capturado' },
  { archivo: '/videos/poster-02.jpg', pie: 'Paseo inesperado' }
]

/** Carpeta pública donde viven las fotos. */
export const CARPETA_FOTOS = '/fotos/'

/** Devuelve la URL completa de una foto de la lista. */
export function urlFoto(foto) {
  const archivo = typeof foto === 'string' ? foto : foto.archivo
  return archivo.startsWith('/') ? archivo : CARPETA_FOTOS + archivo
}
