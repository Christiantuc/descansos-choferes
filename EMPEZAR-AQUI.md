# Empezar aquí — Publicar Descansos en internet

Guía **desde cero**, para principiantes. Solo seguí los pasos en orden (1, 2, 3…).

**Al terminar:** cualquier persona podrá abrir la app desde el celular, tablet o PC con internet, usando un enlace como `https://descansos-choferes.onrender.com`.

---

## Antes de empezar — Limpiar confusiones

| Qué | Qué hacer |
|-----|-----------|
| Repo correcto en GitHub | **descansos-choferes** → https://github.com/Christiantuc/descansos-choferes |
| Repo viejo (no usar) | **Descanso-choferes** (otro nombre) — ignorarlo |
| En Render | Si hay un servicio que **falla**, borralo: Settings → Delete Web Service |
| Tipo en Render | Siempre **Web Service** + **Node**, nunca **Docker** |

---

## Paso 1 — Comprobar que GitHub tiene tu app

1. Abrí en el navegador: **https://github.com/Christiantuc/descansos-choferes**
2. Deberías ver carpetas: `server`, `public`, `config`, `data`, etc.
3. Si las ves → **seguí al Paso 2**.
4. Si el repo no existe o está vacío, avisame (o pedí ayuda en Cursor).

---

## Paso 2 — Crear cuenta en Render (gratis)

1. Entrá a **https://render.com**
2. Clic en **Get Started** o **Sign Up**
3. Registrate con el mismo correo de GitHub si podés, o conectá GitHub cuando te lo pida
4. Entrá al panel: **https://dashboard.render.com**

---

## Paso 3 — Crear el sitio web (Web Service)

1. Clic en el botón azul **New +** (arriba a la derecha)
2. Elegí **Web Service** (no Blueprint, no Static Site, no Docker)
3. Si pide conectar GitHub → **Connect** y autorizá
4. En la lista de repositorios, buscá y elegí:
   - **`descansos-choferes`** (de Christiantuc)
   - **No** elijas `Descanso-choferes`
5. Completá **exactamente** así:

| Campo | Qué poner |
|--------|-----------|
| Name | `descansos-choferes` |
| Region | Ohio o São Paulo (cualquiera cercana) |
| Branch | `main` |
| Runtime / Language | **Node** |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | **Free** |

6. Bajá hasta **Environment Variables** (Variables de entorno)

---

## Paso 4 — Variables de entorno (copiar de tu PC)

Abrí en tu computadora el archivo:

`c:\Chistian\Mia\Cursor\Descansos\.env`

En Render, por cada fila de abajo: clic **Add Environment Variable** → **Key** = nombre → **Value** = valor de tu `.env` (sin comillas en MAIL_FROM).

| Key (nombre en Render) | De dónde sacar el Value |
|------------------------|-------------------------|
| `NODE_VERSION` | Escribí: `20` |
| `TZ` | Tu `.env` → línea TZ |
| `DIAS_ALERTA` | Tu `.env` → línea DIAS_ALERTA |
| `CRON_AVISOS` | Tu `.env` → `0 8 * * *` |
| `SMTP_HOST` | Tu `.env` |
| `SMTP_PORT` | Tu `.env` |
| `SMTP_SECURE` | Tu `.env` → `false` |
| `SMTP_USER` | Tu `.env` |
| `SMTP_PASS` | Tu `.env` (16 letras, sin espacios) |
| `MAIL_FROM` | Tu `.env` pero **sin** las comillas `"` alrededor |
| `ADMIN_KEY` | Tu `.env` |
| `UPSTASH_REDIS_REST_URL` | Crear base gratis en [upstash.com](https://upstash.com) → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Mismo panel de Upstash |

Sin Upstash, **los datos se pierden** al reiniciar Render. Ver **DEPLOY.md** Parte 5.

**No agregues** `PORT` (Render lo pone solo).

**Importante:** agregá **una variable por vez**. No pegues todo el archivo `.env` de una sola vez.

7. Clic en **Create Web Service** (abajo)
8. Esperá 5–10 minutos. Verás logs (texto que se mueve). Al final debe decir **Live** en verde.

---

## Paso 5 — Abrir la app en cualquier dispositivo

1. En Render, arriba verás una URL, por ejemplo:
   `https://descansos-choferes.onrender.com`
2. Clic en esa URL (o copiala y pegala en Chrome del celular)
3. La **primera vez** puede tardar 30–60 segundos (es normal en plan gratis)
4. Elegí un usuario (Christian, Ariel, etc.) y probá cargar un descanso
5. **Compartí esa URL** con tu equipo por WhatsApp — funciona en PC, tablet y celular

---

## Paso 6 — Correos a las 8:00 (aunque tu PC esté apagada)

Render gratis a veces “duerme” el servidor. Para el correo diario usá **cron-job.org** (gratis):

1. Entrá a **https://cron-job.org** y creá cuenta
2. **Create cronjob**
3. Completá:
   - **Title:** Aviso descansos
   - **URL:** `https://TU-URL.onrender.com/api/notificaciones/ejecutar`  
     (reemplazá TU-URL por la que te dio Render, sin espacio al final)
   - **Schedule:** Every day at **08:00**
   - **Timezone:** America/Argentina/Buenos_Aires
   - **Request method:** POST
4. En **Headers** agregá dos líneas:
   - `Content-Type` → `application/json`
   - `x-admin-key` → el mismo valor que pusiste en `ADMIN_KEY` en Render
5. **Body:** `{"force": false}`
6. Guardá y usá **Run now** para probar

---

## Si algo sale mal — Mensajes frecuentes

### "Dockerfile: no such file"
- Borrá el servicio en Render y creá uno nuevo (Paso 3).
- Runtime debe ser **Node**, no Docker.
- Repo debe ser **descansos-choferes**.

### La página no carga o tarda mucho
- Esperá 1 minuto y recargá (F5).
- El plan gratis “despierta” con la primera visita.

### No llegan los correos
- En el navegador abrí: `https://TU-URL.onrender.com/api/health`
- Si `"smtp": false`, revisá `SMTP_PASS` en Render (contraseña de aplicación de Gmail).
- Guía Gmail: archivo `GMAIL-CONFIG.md` en el proyecto.

### Perdí los datos / no se guardan los de hoy
- En Render **hay que configurar Upstash** (Paso 4: `UPSTASH_REDIS_*`). Sin eso, los datos se borran al reiniciar.
- Para recuperar lo de tu PC: `npm run importar-datos` (con las mismas variables en `.env`). Ver **DEPLOY.md** Parte 5.
- En `/api/health` debe decir `"storage": { "backend": "upstash", "persistent": true }`.

---

## Resumen en 6 frases

1. Código en GitHub: **descansos-choferes**
2. Render: **Web Service** + **Node** + ese repo
3. Variables: una por una desde tu `.env`
4. URL de Render = la app para todos los dispositivos
5. cron-job.org = correo a las 8:00
6. Tu PC ya no tiene que estar encendida

---

## ¿Necesitás ayuda?

Copiá y pegá en el chat:
- La **URL** de Render
- Las **últimas 10 líneas** de los logs de Render (pestaña Logs)
- El **mensaje de error** exacto (si hay)

Con eso se puede ver qué paso falló.
