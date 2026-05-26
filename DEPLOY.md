# Publicar Descansos en internet (gratis)

Guía paso a paso para subir la app a **Render.com** (plan gratuito) y que los correos de las **08:00** se envíen aunque tu PC esté apagada.

---

## Qué vas a obtener

- URL pública, por ejemplo: `https://descansos-choferes.onrender.com`
- La app y los datos en el servidor (no en tu notebook)
- Avisos por correo a las 08:00 con un **cron externo gratuito** (necesario en el plan free de Render)

---

## Antes de empezar

1. Cuenta en [GitHub](https://github.com) (gratis).
2. Cuenta en [Render](https://render.com) (gratis).
3. Cuenta en [cron-job.org](https://cron-job.org) (gratis) — para el aviso diario a las 8:00.
4. Gmail con **contraseña de aplicación** (ver `GMAIL-CONFIG.md`).
5. Los correos de usuarios en `config/usuarios.json`.

---

## Parte 1 — Subir el código a GitHub

### Paso 1.1 — Instalar Git (si no lo tenés)

Descargá Git desde https://git-scm.com/download/win e instalalo.

### Paso 1.2 — Crear repositorio en GitHub

1. Entrá a https://github.com/new
2. Nombre del repo: `descansos-choferes` (o el que quieras).
3. Dejalo **Private** si no querés que sea público.
4. **No** marques “Add README”.
5. Clic en **Create repository**.

### Paso 1.3 — Subir el proyecto desde tu PC

Abrí **PowerShell** en la carpeta del proyecto:

```powershell
cd "c:\Chistian\Mia\Cursor\Descansos"
git init
git add .
git commit -m "App descansos lista para deploy"
git branch -M main
git remote add origin https://github.com/Christiantuc/descansos-choferes.git
git push -u origin main
```

Tu usuario es **Christiantuc** y el repo será **descansos-choferes**. Si aún no subiste el código, seguí primero **[SUBIR-GITHUB.md](./SUBIR-GITHUB.md)**.

> **Importante:** El archivo `.env` **no** se sube a GitHub (está en `.gitignore`). Las claves se cargan después en Render.

Si Git pide usuario/contraseña, usá un **Personal Access Token** de GitHub en lugar de la contraseña.

---

## Parte 2 — Crear el servicio en Render

### Paso 2.1 — Nuevo Web Service

1. Entrá a https://dashboard.render.com
2. **New +** → **Web Service**
3. Conectá tu cuenta de **GitHub** si aún no lo hiciste.
4. Elegí el repositorio `descansos-choferes`.

### Paso 2.2 — Configuración del servicio

| Campo | Valor |
|--------|--------|
| **Name** | `descansos-choferes` |
| **Region** | La más cercana (ej. Ohio o São Paulo) |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | **Free** |

### Paso 2.3 — Variables de entorno

En la sección **Environment Variables**, agregá estas (copiá los valores reales de tu `.env` local):

| Variable | Ejemplo / valor |
|----------|------------------|
| `NODE_VERSION` | `20` |
| `TZ` | `America/Argentina/Buenos_Aires` |
| `DIAS_ALERTA` | `5` |
| `CRON_AVISOS` | `0 8 * * *` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | tu Gmail |
| `SMTP_PASS` | contraseña de aplicación (16 caracteres, sin espacios) |
| `MAIL_FROM` | `Descansos Choferes <tu@gmail.com>` |
| `ADMIN_KEY` | una clave larga y secreta (ej. generada al azar) |

> Guardá `ADMIN_KEY` en un lugar seguro: la vas a usar en cron-job.org.

### Paso 2.4 — Desplegar

1. Clic en **Create Web Service**.
2. Esperá a que termine el build (unos minutos la primera vez).
3. Cuando diga **Live**, abrí la URL que te muestra Render (ej. `https://descansos-choferes.onrender.com`).

### Paso 2.5 — Probar que funciona

1. Abrí la URL en el navegador.
2. Iniciá sesión con un usuario habilitado (Christian, Ariel, etc.).
3. Probá cargar una solicitud de descanso.
4. Verificá el correo: en la misma URL agregá `/api/health` — debe mostrar `"smtp": true` si Gmail está bien configurado.

---

## Parte 3 — Correo a las 08:00 (cron externo)

En el plan **gratuito**, Render puede **apagar** el servidor si nadie entra por un rato. Por eso el cron interno de las 8:00 no siempre corre solo.

**Solución:** un cron gratuito en internet que llame a tu API cada día a las 8:00.

### Paso 3.1 — Crear cuenta en cron-job.org

1. https://cron-job.org → registrate gratis.
2. Confirmá el correo si te lo pide.

### Paso 3.2 — Crear el trabajo diario

1. **Cronjobs** → **Create cronjob**
2. Configuración:

| Campo | Valor |
|--------|--------|
| **Title** | Aviso descansos 08:00 |
| **URL** | `https://TU-APP.onrender.com/api/notificaciones/ejecutar` |
| **Schedule** | Every day at **08:00** |
| **Timezone** | `America/Argentina/Buenos_Aires` |
| **Request method** | `POST` |

3. En **Headers**, agregá:

```
Content-Type: application/json
x-admin-key: TU_ADMIN_KEY_DE_RENDER
```

4. En **Body** (si el sitio lo pide):

```json
{"force": false}
```

5. Guardá y activá el cronjob.

### Paso 3.3 — Probar el cron

En cron-job.org usá **Run now** (ejecutar ahora). Deberías recibir el correo si hay descansos en los próximos 5 días.

Revisá en Render → **Logs** que aparezca algo como `[avisos] Correo enviado a ...`.

---

## Parte 4 — (Opcional) Mantener el servidor despierto

Si querés que la web responda más rápido y que el cron interno también ayude como respaldo:

1. Otro cronjob en cron-job.org.
2. URL: `https://TU-APP.onrender.com/api/health`
3. Método: `GET`
4. Cada **14 minutos** (Render free se duerme tras ~15 min sin tráfico).

No es obligatorio si ya tenés el cron de las 08:00 con `POST /api/notificaciones/ejecutar`.

---

## Parte 5 — Almacenamiento persistente (obligatorio en Render)

En el plan **gratuito** de Render, el disco del servidor es **efímero**: todo lo que se guarda en `data/descansos.json` **se pierde** al reiniciar, dormir o redesplegar. Por eso los datos del día de hoy pueden desaparecer.

La app usa **Upstash Redis** (gratis) para guardar las solicitudes de forma permanente.

### 5.1 Crear base en Upstash (5 minutos)

1. Entrá a **https://upstash.com** y creá cuenta (gratis).
2. **Create Database** → región cercana (ej. `us-east-1`) → **Create**.
3. En la base, pestaña **REST API** → copiá:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 5.2 Agregar variables en Render

En tu servicio → **Environment** → agregá:

| Key | Value |
|-----|--------|
| `UPSTASH_REDIS_REST_URL` | la URL de Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | el token de Upstash |

Guardá y esperá el **redeploy** automático.

### 5.3 Verificar

Abrí `https://TU-APP.onrender.com/api/health` y buscá:

```json
"storage": { "backend": "upstash", "persistent": true, ... }
```

Si dice `"backend": "file"` y hay `"warning"`, faltan las variables de Upstash.

### 5.4 Migrar datos desde tu PC

Si tenés solicitudes en `data/descansos.json` en tu computadora:

1. En tu PC, agregá las mismas variables `UPSTASH_*` en el archivo `.env`.
2. Ejecutá:

```bash
npm run importar-datos
```

Eso sube el JSON local a Upstash. Todos los usuarios verán los mismos datos en la URL de Render.

**Alternativa (sin Upstash en la PC):** después del deploy, llamá al endpoint de importación con tu `ADMIN_KEY`:

```bash
curl -X POST "https://TU-APP.onrender.com/api/admin/importar-datos" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: TU_ADMIN_KEY" \
  -d @data/descansos.json
```

---

## Resumen de URLs útiles

| Qué | URL |
|-----|-----|
| App | `https://TU-APP.onrender.com` |
| Estado / SMTP | `https://TU-APP.onrender.com/api/health` |
| Forzar aviso (manual) | `POST .../api/notificaciones/ejecutar` + header `x-admin-key` |

---

## Problemas frecuentes

### La página tarda 30–60 segundos en abrir

Normal en Render free: el servidor estaba dormido. La primera visita lo despierta.

### `smtp: false` en /api/health

- Revisá `SMTP_PASS` en Render (contraseña de aplicación, sin espacios).
- Volvé a desplegar después de cambiar variables.

### No llegó el correo a las 8:00

- Revisá que el cronjob en cron-job.org esté **activo** y con timezone Argentina.
- Revisá **Logs** en Render a esa hora.
- Revisá spam en Gmail.

### Perdí las solicitudes después de un deploy o no se guardan los datos de hoy

Render free **no persiste** archivos en disco. Configurá **Upstash** (Parte 5) y ejecutá `npm run importar-datos` para recuperar lo que tengas en tu PC.

---

## Otras opciones gratuitas

| Servicio | Ventaja | Desventaja |
|----------|---------|------------|
| **Render** (esta guía) | Muy fácil con GitHub | Free se duerme; cron externo recomendado |
| **Fly.io** | Puede quedar más tiempo activo | Configuración un poco más técnica |
| **Oracle Cloud (VM gratis)** | Siempre encendido | Hay que configurar Linux, Node y firewall vos mismo |

Para la mayoría de los casos, **Render + cron-job.org** es la opción más simple.

---

## Uso diario después del deploy

1. Compartí la URL de Render con Christian, Ariel, Yamil, etc.
2. Ya **no** hace falta tener `iniciar.bat` abierto en tu PC.
3. Los correos salen solos a las 08:00 si configuraste cron-job.org.
4. Para cambiar correos de usuarios: editá `config/usuarios.json`, hacé commit y push a GitHub; Render redespliega solo.
