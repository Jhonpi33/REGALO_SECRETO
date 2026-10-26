# 🎁 Regalo Secreto

**Jhon & Majo — Nos descubrimos el 20 de noviembre de 2026.**

Un juego de **amigo secreto de a dos**: cada uno va dejando **pistas diarias** sobre el regalo que le gustaría recibir,
el otro intenta **adivinarlo**, una **IA** ayuda a deducirlo a partir de las pistas y el **20 de noviembre de 2026**
se descubren y se entregan los regalos.

> Aplicación web instalable en el celular (PWA), 100% en español, con tema rosa para Majo y tema azul para Jhon.

**🚀 En línea:** https://regalo-secreto-jwy9.onrender.com
(desplegada con Render Blueprint desde la rama `main` de este repositorio)

---

## ✨ Qué incluye

| Sección | Qué hace |
| --- | --- |
| 🎀 **Portada** | Video de fondo con los recuerdos de la pareja, degradado rosa ↔ azul, caja de regalo animada, cuenta regresiva en vivo y galería de fotos. |
| 🔐 **Login** | Solo 2 usuarios (no hay registro público). Fondo partido: mitad rosa / mitad azul. |
| 🗝️ **Mis pistas** | Agregar, editar y borrar pistas (texto + categoría + nivel 🧊/🌤️/🔥). Se agrupan por día, con **racha** y contador. |
| 🔍 **Pistas de mi pareja** | Solo lectura, agrupadas por día, con sello **"Nueva"**. |
| 💭 **Mis corazonadas** | Espacio **privado**: teorías, regalo elegido, enlace, presupuesto en COP y estado. |
| ✨ **IA** | "Pedir ayuda a la IA" analiza **todas** las pistas de la pareja y devuelve 3–5 ideas con `por_que`, `confianza` y `donde_conseguirlo`. Máx. 5 consultas/día. |
| 🎁 **Revelación** | Bloqueada hasta el **20/11/2026 00:00 (Bogotá)**; después se abre con confeti y todo lo privado queda a la vista. |
| 🔔 **Notificaciones** | Push diario a las 7:00 p. m., aviso de 1 semana (13/11), víspera (19/11) y el gran día (20/11) + banners dentro de la app. |
| 📲 **PWA** | Instalable en Android, iPhone (iOS 16.4+) y escritorio, con guía paso a paso. |

---

## 🧱 Stack

- **Frontend:** Vue 3 + Vite + Vue Router + Pinia + `vite-plugin-pwa`
- **Backend / datos / auth:** Supabase (Auth, Postgres con **Row Level Security**, Edge Functions, `pg_cron`)
- **Notificaciones:** Web Push (VAPID) enviadas desde una Edge Function programada con `pg_cron`
- **IA:** API de Anthropic (Claude) llamada **solo desde una Edge Function** (la API key nunca está en el navegador)
- **Despliegue:** Vercel o Netlify (frontend) + Supabase (backend). Todo con planes gratuitos.

---

## 🗂 Estructura del proyecto

```
├── public/
│   ├── fotos/            ← tus fotos de la pareja (y placeholders)
│   ├── videos/           ← videos de fondo (mp4) + pósteres (jpg)
│   ├── icons/            ← íconos de la PWA (generados con scripts/generar-iconos.mjs)
│   ├── push-handler.js   ← handler de notificaciones push (se inyecta en el service worker)
│   └── favicon.svg
├── src/
│   ├── components/       ← CajaRegalo, CuentaRegresiva, FondoVideo, CarruselFotos, PistaCard…
│   ├── composables/      ← useRevelacion, useNotificaciones
│   ├── data/             ← constantes (fecha de revelación, categorías), fotos, videos
│   ├── router/           ← rutas + guardia de sesión
│   ├── stores/           ← auth, pistas, corazonadas, ia, avisos, toast
│   ├── styles/base.css   ← variables CSS, temas rosa/azul, botones, formularios
│   └── views/            ← Portada, Login, AppLayout, Pistas, Corazonadas, IA, Revelación, Perfil, Instalar
├── supabase/
│   ├── migrations/0001_esquema_rls.sql      ← tablas + políticas RLS (privacidad)
│   ├── migrations/0002_cron_notificaciones.sql ← pg_cron (4 avisos)
│   ├── functions/ia-regalo/index.ts         ← Edge Function de la IA (Claude)
│   ├── functions/notificar/index.ts         ← Edge Function de notificaciones push
│   ├── semilla.sql / semilla_borrar.sql     ← datos de prueba opcionales
│   └── tests/rls_pruebas.sql                ← pruebas de privacidad
├── scripts/              ← generar-iconos.mjs, extraer-poster.swift, comprimir-video.swift
├── .env.example          ← plantilla de variables de entorno (sin llaves reales)
├── SETUP.md              ← guía paso a paso de configuración
└── README.md             ← este archivo
```

---

## 🚀 Arranque rápido

```bash
npm install
cp .env.example .env      # y completa tus llaves de Supabase + VAPID
npm run dev               # http://localhost:5173
```

Build de producción:

```bash
npm run build     # genera dist/ con la PWA
npm run preview   # sirve dist/ en local
```

> 📖 **Si es la primera vez, sigue el [SETUP.md](./SETUP.md)**: crea el proyecto en Supabase, corre las migraciones,
> crea los 2 usuarios, genera las llaves VAPID y despliega.

---

## 🔒 Privacidad (forzada en la base de datos)

La privacidad **no depende del frontend**: las políticas RLS de Postgres lo garantizan.

- Cada usuario **lee y escribe solo sus propias pistas**.
- Cada usuario **lee las pistas de su pareja** (para poder adivinar) pero **no puede editarlas ni borrarlas**.
- **Corazonadas / regalo elegido:** solo su dueño las ve **hasta el 20/11/2026 00:00 (Bogotá)**;
  después, la pareja también puede verlas. La condición de fecha está escrita en SQL (`public.es_revelado()`).
- **Historial de consultas a la IA:** privado para quien consulta.
- **Suscripciones push:** cada usuario solo ve las suyas.

Prueba de privacidad: abre `supabase/tests/rls_pruebas.sql`, reemplaza los dos UUID y ejecútalo en el SQL Editor.
Debe terminar con `🎉 TODAS LAS PRUEBAS DE RLS PASARON`.

---

## 📸 Tus fotos y videos

- **Fotos:** cópialas a `public/fotos/` y lista sus nombres en `src/data/fotos.js` (funciona de 3 a 12 fotos).
- **Video de fondo:** van en `public/videos/` y se listan en `src/data/videos.js`.
  Los clips se reproducen **sin audio, en bucle y con fundido**; encima hay un velo de degradado rosa ↔ azul
  para que los colores se integren con la app. Si la persona tiene activado el ahorro de datos o
  "reducir movimiento", se queda en el póster estático.

Herramientas incluidas para convertir material de iPhone/Sony a formatos web:

```bash
# Fotos HEIC o RAW → JPG
sips -s format jpeg -s formatOptions 78 --resampleWidth 1600 foto.HEIC --out public/fotos/foto.jpg

# Video → MP4 ligero (960×720, sin audio)
swift scripts/comprimir-video.swift entrada.mov public/videos/video-01.mp4 960 1400

# Póster (imagen) de un video
swift scripts/extraer-poster.swift public/videos/video-01.mp4 public/videos/poster-01.jpg
```

---

## 🧪 Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción + service worker |
| `npm run preview` | Sirve `dist/` en local |
| `node scripts/generar-iconos.mjs` | Regenera los íconos PNG de la PWA |

---

## 📅 Fechas importantes (hora de Bogotá)

| Fecha | Aviso |
| --- | --- |
| Todos los días, 7:00 p. m. | "¿Ya dejaste tu pista de hoy? 🎁" (solo si aún no la dejaste) |
| **Viernes 13 de noviembre de 2026**, 9:00 a. m. | "Falta 1 semana para descubrirnos 💌" |
| **19 de noviembre de 2026**, 9:00 a. m. | "¡Mañana es el gran día!" |
| **20 de noviembre de 2026**, 8:00 a. m. | "¡Hoy se descubre el regalo secreto! 🎉" |
| **20 de noviembre de 2026**, 00:00 | 🎁 **Se desbloquea la revelación** |

---

Hecho con 💕 para Jhon y Majo.
