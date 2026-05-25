# Descansos de Choferes

Aplicación para registrar solicitudes de descanso y enviar **un aviso diario por correo** a todos los usuarios habilitados cuando hay descansos dentro de los próximos 5 días.

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior
- Servidor SMTP (Gmail, Outlook, SendGrid, etc.)

## Instalación

```bash
cd Descansos
npm install
copy .env.example .env
```

Edite `.env` con sus datos SMTP.

Edite `config/usuarios.json` y agregue el **correo** de cada usuario habilitado:

```json
{ "nombre": "Christian", "email": "christian@empresa.com" }
```

## Ejecutar

**Windows (recomendado):** doble clic en `iniciar.bat`

O desde la terminal:

```bash
npm start
```

Abra en el navegador: **http://localhost:3000**

> La app **debe** ejecutarse con el servidor. Abrir `index.html` directamente no funciona.

## Avisos por correo

- Se envían **una vez por día** a cada usuario con correo configurado.
- Incluyen todas las solicitudes cuya **fecha de descanso** está entre hoy y 5 días adelante.
- Horario por defecto: **08:00** (configurable con `CRON_AVISOS` en `.env`).
- Al iniciar el servidor también se verifica si faltó el envío del día.

### Probar avisos manualmente

```bash
npm run notificar
```

O con la clave de administrador (definida en `ADMIN_KEY`):

```bash
curl -X POST http://localhost:3000/api/notificaciones/ejecutar ^
  -H "Content-Type: application/json" ^
  -H "x-admin-key: su-clave" ^
  -d "{\"force\": false}"
```

## Variables de entorno principales

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto del servidor (default 3000) |
| `DIAS_ALERTA` | Días de anticipación (default 5) |
| `CRON_AVISOS` | Expresión cron del aviso diario |
| `TZ` | Zona horaria |
| `SMTP_*` | Configuración de correo |
| `MAIL_FROM` | Remitente |
| `ADMIN_KEY` | Clave para ejecutar avisos vía API |

## Datos

Las solicitudes se guardan en `data/descansos.json` (compartido por todos los usuarios).

## Usuarios habilitados

Christian, Ariel, Yamil, Jorge, Sebastian y Dario.

## Publicar en internet (servidor gratuito)

Para dejar la app online 24/7 (sin depender de `iniciar.bat` en tu PC), seguí la guía:

**[DEPLOY.md](./DEPLOY.md)** — paso a paso con Render.com (gratis) + cron para avisos a las 08:00.
