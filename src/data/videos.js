// Videos de fondo de la portada.
// Se reproducen en bucle, sin audio, y se alternan con un fundido.
// Si el dispositivo ahorra datos o la persona prefiere menos movimiento,
// se queda en el póster (imagen estática) — todo automático.

export const VIDEOS_FONDO = [
  { src: '/videos/video-01.mp4', poster: '/videos/poster-01.jpg' },
  { src: '/videos/video-02.mp4', poster: '/videos/poster-02.jpg' }
]

/** Póster que se muestra mientras carga (o si no se puede reproducir). */
export const POSTER_PRINCIPAL = VIDEOS_FONDO[0].poster
