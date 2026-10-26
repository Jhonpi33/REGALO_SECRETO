# 🛠 SETUP — Configura "Regalo Secreto" paso a paso

Guía pensada para quien está aprendiendo. Sigue los pasos **en orden**.
Tiempo estimado: 45–60 minutos. 💪

> Todo esto se puede hacer con los **planes gratuitos** de Supabase y Vercel.

---

## 0. Qué necesitas

- [Node.js](https://nodejs.org) 18 o superior (`node -v` para comprobar).
- Una cuenta gratis en [supabase.com](https://supabase.com).
- Una cuenta gratis en [vercel.com](https://vercel.com) (o Netlify).
- Una llave de la API de [Anthropic](https://console.anthropic.com) (tiene saldo inicial gratis).
- Tu celular a la mano (para instalar la app y activar notificaciones).

---

## 1. Prepara el proyecto en tu computador

```bash
cd "REGALO_SECRETO"
npm install
cp .env.example .env
```

El archivo `.env` queda vacío por ahora: lo llenamos en el paso 5.

---

## 2. Crea el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) → **New project**.
2. Elige un nombre (ej. `regalo-secreto`), una contraseña fuerte para la base de datos
   y la región más cercana (por ejemplo **Washington DC** para Colombia).
3. Espera ~2 minutos a que termine.

Anota estos dos valores (Panel → **Project Settings → API**):

- `Project URL` → algo como `https://abcdefgh.supabase.co`
- `anon public` → una llave larga que empieza con `eyJ...`

---

## 3. Corre las migraciones (tablas + privacidad)

1. En el panel de Supabase, abre **SQL Editor** (icono `>_`, menú izquierdo).
2. Pega **todo** el contenido de `supabase/migrations/0001_esquema_rls.sql` → **Run**.
3. Repite con `supabase/migrations/0002_cron_notificaciones.sql` → **Run**.

✅ Si no sale ningún error, ya existen las tablas `perfiles`, `pistas`, `corazonadas`,
`consultas_ia`, `push_suscripciones`, las políticas RLS y los 4 cron jobs.

> ¿Prefieres la línea de comandos? Instala el [Supabase CLI](https://supabase.com/docs/guides/cli)
> y ejecuta `supabase link --project-ref TU_ID` y luego `supabase db push`.

---

## 4. Crea los 2 usuarios

**No existe registro público**: los usuarios se crean a mano.

1. Panel de Supabase → **Authentication → Users → Add user / Create user**.
2. Activa **Auto Confirm User** (para no tener que confirmar por correo).
3. Crea el usuario de **Jhon** (ej. `jhon@pareja.com` + contraseña).
4. Crea el usuario de **Majo** (ej. `majo@pareja.com` + contraseña).

Copia el **UUID** de cada uno (columna `user uid` en la tabla de usuarios).

Ahora crea sus perfiles: en **SQL Editor** pega (cambia los UUID y el correo):

```sql
insert into public.perfiles (id, nombre, tema, pareja_id) values
  ('UUID_DE_JHON',  'Jhon', 'azul', 'UUID_DE_MAJO'),
  ('UUID_DE_MAJO',  'Majo', 'rosa', 'UUID_DE_JHON')
on conflict (id) do nothing;
```

⚠️ Reemplaza **cada** `UUID_...` por el valor real (el de Jhon apunta a Majo y viceversa).
Si te equivocas, bórralos y vuelve a insertar:

```sql
delete from public.perfiles where nombre in ('Jhon', 'Majo');
```

✅ **Prueba:** en la app, entra con el correo de Majo → debe verse "Majo & Jhon" en la cabecera
y el tema debe ser **rosado**; con el de Jhon, **azul**.

---

## 5. Variables de entorno (`.env`)

Edita el archivo `.env` de la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...tu_llave_anon...
VITE_VAPID_PUBLIC_KEY=PEGA_LA_LLAVE_PUBLICA_DEL_PASO_6
```

- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`: del paso 2.
- `VITE_VAPID_PUBLIC_KEY`: del paso 6.

> 🔒 El archivo `.env` está en `.gitignore`: **nunca** lo subas a GitHub.

Arranca la app y revisa:

```bash
npm run dev
```

Si en la pantalla de login **no** aparece el recuadro amarillo de "Falta configurar Supabase",
las llaves están bien.

---

## 6. Genera las llaves VAPID (notificaciones)

En una terminal (dentro de la carpeta del proyecto):

```bash
npx web-push generate-vapid-keys
```

Te imprime dos llaves:

- **Public Key** → va en `.env` como `VITE_VAPID_PUBLIC_KEY`
- **Private Key** → va en el paso 8 como secreto `VAPID_PRIVATE_KEY`

---

## 7. Configura la API key de Anthropic

1. Entra a [console.anthropic.com](https://console.anthropic.com) → **API Keys** → **Create Key**.
2. Copia la llave (empieza con `sk-ant-...`).
3. **No la pegues en ningún archivo del código**: la guardaremos como secreto en Supabase (paso 8).

---

## 8. Despliega las Edge Functions con sus secretos

### 8.1 Instala el CLI (si no lo tienes)

```bash
npm install -g supabase
supabase login
supabase link --project-ref TU_PROJECT_REF   # está en Project Settings → API
```

### 8.2 Guarda los secretos

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set VAPID_PRIVATE_KEY=TU_LLAVE_PRIVADA
supabase secrets set VAPID_PUBLIC_KEY=TU_LLAVE_PUBLICA
supabase secrets set VAPID_SUBJECT=mailto:tu_correo@ejemplo.com
```

También puedes hacerlo desde el panel: **Project Settings → Edge Functions → Secrets**.

### 8.3 Despliega las funciones

```bash
supabase functions deploy ia-regalo
supabase functions deploy notificar
```

### 8.4 Dile a la base de datos cómo llamarlas

En **SQL Editor** (reemplaza `TU_PROJECT_URL` y `TU_LLAVE_ANON`):

```sql
insert into private.ajustes (clave, valor) values
  ('supabase_url', 'https://TU_PROJECT_URL.supabase.co'),
  ('anon_key',     'TU_LLAVE_ANON')
on conflict (clave) do update set valor = excluded.valor;
```

✅ **Prueba de la IA:** en la app, entra a **IA** y toca *"Pedir ayuda a la IA"*.
Con menos de 3 pistas de la pareja debe mostrar el aviso "Aún hay muy poca información".

---

## 9. Comprueba los cron jobs (avisos programados)

En **SQL Editor**:

```sql
select jobid, schedule, command from cron.job;
```

Debes ver los 4 trabajos: `regalo-recordatorio-diario`, `regalo-una-semana`,
`regalo-vispera`, `regalo-dia-grande`.

⚠️ Si `pg_cron` no estaba habilitado y salió error en el paso 3,
ve a **Database → Extensions** y activa `pg_cron`, luego vuelve a correr la migración 0002.

**Prueba manual de un aviso** (envía el recordatorio de hoy):

```sql
select public.llamar_funcion('notificar',
  jsonb_build_object('tipo', 'recordatorio-diario', 'forzar', true));
```

Devuelve un `job_id` (el envío es **asíncrono** con `pg_net`). Espera unos
segundos y comprueba la respuesta real:

```sql
select status_code, content from net._http_response order by id desc limit 1;
```

> Debes ver `"ok": true`. Para probar la víspera/gran día fuera de fecha
> agrega `"forzar": true`, como arriba.

Para desprogramar todo después del 20/11/2026:

```sql
select cron.unschedule(jobid) from cron.job where command like '%regalo%';
```

---

## 10. Pruebas de privacidad (RLS)

1. Abre `supabase/tests/rls_pruebas.sql`.
2. Cambia `<ID_JHON>` y `<ID_MAJO>` por los UUID reales.
3. Pega todo en **SQL Editor** y ejecuta.

✅ Debe terminar con: **`🎉 TODAS LAS PRUEBAS DE RLS PASARON`**

---

## 11. Datos de prueba (opcional)

Para ver la app con contenido antes de que llegue el 20 de noviembre:

1. Abre `supabase/semilla.sql`, cambia `<ID_JHON>` y `<ID_MAJO>`, y ejecútalo.
2. Cuando quieras borrarlos: ejecuta `supabase/semilla_borrar.sql`.

---

## 12. Despliega el frontend (Vercel)

1. Sube el proyecto a GitHub (sin el `.env`).
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repositorio.
3. Vercel detecta Vite. Agrega estas **Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_VAPID_PUBLIC_KEY`
4. **Deploy**. Al terminar tendrás una URL tipo `https://regalo-secreto.vercel.app`.

> Con Netlify: build `npm run build`, directorio `dist`, y las mismas variables en
> **Site settings → Environment variables**.

⚠️ **Importante (Vercel/Netlify):** configura el *rewriting* de rutas para que la PWA funcione.

- **Vercel:** crea `vercel.json` en la raíz:
  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```
- **Netlify:** crea `public/_redirects` (o `_redirects` en `dist/`) con:
  ```
  /*  /index.html  200
  ```

---

## 13. Instala la app en los celulares

1. Abre la URL desplegada en el navegador del celular.
2. Sigue la guía dentro de la app: **Cómo instalar la app** (menú → Yo → o desde la portada).
   - **Android (Chrome):** menú ⋮ → *Instalar aplicación* / *Agregar a pantalla de inicio*.
   - **iPhone (Safari, iOS 16.4+):** compartir ⬆️ → *Agregar a pantalla de inicio*.
3. Entra con tu usuario y acepta las notificaciones cuando la app lo pida.

> 🍎 **iPhone:** las notificaciones push **solo** funcionan con la app instalada en la pantalla
> de inicio (iOS 16.4 o superior). Si solo la abres desde Safari, no llegarán.

---

## 14. Agrega tus fotos y videos

- **Fotos:** cópialas a `public/fotos/` y lista sus nombres en `src/data/fotos.js`.
- **Videos de fondo:** van en `public/videos/` y se listan en `src/data/videos.js`.
- Conversores útiles (ya incluidos en `scripts/`):
  ```bash
  sips -s format jpeg -s formatOptions 78 --resampleWidth 1600 foto.HEIC --out public/fotos/foto.jpg
  swift scripts/comprimir-video.swift video.mov public/videos/video-01.mp4 960 1400
  swift scripts/extraer-poster.swift public/videos/video-01.mp4 public/videos/poster-01.jpg
  ```
- Regenera los íconos si lo deseas: `node scripts/generar-iconos.mjs`.

---

## 15. La carta de perdón (Jhon → Majo)

La carta vive en **`/app/perdon`** y guarda su estado en la tabla `public.perdones`
(migración `0003_carta_perdon.sql`).

1. Ejecuta la migración 0003 (mismo procedimiento del paso 3).
2. Despliega `notificar` (paso 8.3): ya entiende los tipos `perdon`, `perdon-si` y `perdon-no`.
3. Entra a la app con el usuario de **Jhon** → menú **Yo** → escribe la ruta
   `/app/perdon` y toca **"Escribir la carta y enviarla 💕"** (o "Reenviar la carta 💕").
   Eso manda el push a Majo con la carta y los botones.
4. Desde el celular de Majo la carta se abre con la notificación (o con el banner 💌).
   Cada **No** suma intentos y le avisa a Jhon (la notificación se reemplaza, no se apila);
   el **Sí** le manda a Jhon: *"¡Ella dice que SÍ! 💕 … te ganaste unas gomitas 🍬"*.

> 🔐 Los tipos `perdon*` **exigen sesión de usuario** (no funcionan con la llave anon),
> y cada usuario solo puede hacer lo que le toca: enviarla quien la escribe, responderla
> quien la recibe.

---

## ✅ Checklist final

| # | Paso | Listo |
| --- | --- | --- |
| 1 | Proyecto creado en Supabase | ☐ |
| 2 | Migraciones 0001, 0002 y 0003 ejecutadas | ☐ |
| 3 | 2 usuarios creados en Authentication | ☐ |
| 4 | `perfiles` de Jhon y Majo insertados | ☐ |
| 5 | `.env` con las 3 variables | ☐ |
| 6 | Llaves VAPID generadas | ☐ |
| 7 | `ANTHROPIC_API_KEY` guardada como secreto | ☐ |
| 8 | Funciones `ia-regalo` y `notificar` desplegadas | ☐ |
| 9 | `private.ajustes` con URL y llave anon | ☐ |
| 10 | 4 cron jobs visibles en `cron.job` | ☐ |
| 11 | Pruebas de RLS en verde | ☐ |
| 12 | Frontend desplegado con las variables de entorno | ☐ |
| 13 | Rewrites/`_redirects` configurados (PWA) | ☐ |
| 14 | App instalada en los 2 celulares | ☐ |
| 15 | Fotos y videos agregados | ☐ |

---

## 🆘 Problemas frecuentes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| "Falta configurar Supabase" en el login | `.env` incompleto | Revisa el paso 5 y reinicia `npm run dev` |
| "No se pudo cargar el perfil" | Falta insertar el `perfiles` | Paso 4 |
| La IA responde "Falta el secreto ANTHROPIC_API_KEY" | Secreto no guardado | Paso 8.2 |
| No llegan notificaciones | Permiso denegado o app no instalada | Paso 13 (iPhone: instalar en pantalla de inicio) |
| Los avisos no se envían | `private.ajustes` vacío o `pg_cron` desactivado | Pasos 8.4 y 9 |
| Pantalla en blanco tras desplegar | Falta el rewrite de rutas | Paso 12 |
| `llamar_funcion` lanza excepción | Faltan `supabase_url` / `anon_key` | Paso 8.4 |
