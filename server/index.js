const express = require("express");
const cors = require("cors");
const path = require("path");
const { randomUUID } = require("crypto");

const config = require("./config");
const db = require("./db");
const { iniciarCron } = require("./cron");
const {
  getSolicitudesProximas,
  sendDailyNotifications,
  verifySmtpConnection,
} = require("./notifications");

const app = express();

app.use(cors());
app.use(express.json());

function requireUsuario(req, res, next) {
  const nombre = req.headers["x-usuario"];
  const usuario = config.buscarUsuarioHabilitado(nombre);

  if (!usuario) {
    return res.status(401).json({ error: "Usuario no habilitado." });
  }

  req.usuario = usuario;
  next();
}

app.get("/api/health", async (_req, res) => {
  const smtpStatus = config.getSmtpStatus();
  let smtpConexion = false;
  let smtpError = null;

  if (smtpStatus.ok) {
    const verificacion = await verifySmtpConnection();
    smtpConexion = verificacion.ok;
    smtpError = verificacion.error || null;
  }

  const proximas = getSolicitudesProximas();

  res.json({
    ok: true,
    smtp: smtpStatus.ok && smtpConexion,
    smtpConfig: smtpStatus,
    smtpConexion,
    smtpError,
    usuariosConEmail: config.loadUsuariosConEmail().length,
    descansosProximos: proximas.length,
  });
});

app.post("/api/auth/validar", (req, res) => {
  const { nombre } = req.body || {};
  const usuario = config.buscarUsuarioHabilitado(nombre);

  if (!usuario) {
    return res.status(401).json({ error: "No es un usuario habilitado." });
  }

  res.json({ usuario });
});

app.get("/api/solicitudes", requireUsuario, (_req, res) => {
  res.json(db.getAllSolicitudes());
});

app.post("/api/solicitudes", requireUsuario, (req, res) => {
  const { nombreChofer, fechaSolicitud, fechaDescanso, motivo } = req.body || {};

  if (!nombreChofer?.trim() || !fechaSolicitud || !fechaDescanso) {
    return res.status(400).json({ error: "Complete todos los campos obligatorios." });
  }

  const solicitud = db.insertSolicitud({
    id: randomUUID(),
    nombreChofer: nombreChofer.trim(),
    fechaSolicitud,
    fechaDescanso,
    motivo: motivo ? motivo.trim() : "",
    registradoPor: req.usuario,
    creadoEn: new Date().toISOString(),
  });

  res.status(201).json(solicitud);

  setImmediate(async () => {
    const proximas = getSolicitudesProximas();
    if (proximas.some((p) => p.id === solicitud.id)) {
      const resultado = await sendDailyNotifications();
      if (resultado.enviados > 0) {
        console.log("[avisos] Aviso enviado tras nueva solicitud:", resultado);
      }
    }
  });
});

app.delete("/api/solicitudes/:id", requireUsuario, (req, res) => {
  const eliminado = db.deleteSolicitud(req.params.id);

  if (!eliminado) {
    return res.status(404).json({ error: "Solicitud no encontrada." });
  }

  res.status(204).send();
});

app.patch("/api/solicitudes/:id/cumplida", requireUsuario, (req, res) => {
  const { cumplida } = req.body || {};
  const solicitud = db.markSolicitudAsCumplida(req.params.id, cumplida);

  if (!solicitud) {
    return res.status(404).json({ error: "Solicitud no encontrada." });
  }

  res.json(solicitud);
});

app.get("/api/alertas/proximas", requireUsuario, (_req, res) => {
  const proximas = getSolicitudesProximas();
  res.json({
    diasAlerta: config.DIAS_ALERTA,
    total: proximas.length,
    solicitudes: proximas,
  });
});

app.post("/api/notificaciones/ejecutar", async (req, res) => {
  const adminKey = req.headers["x-admin-key"] || req.body?.adminKey;

  if (!config.ADMIN_KEY || adminKey !== config.ADMIN_KEY) {
    return res.status(403).json({ error: "No autorizado." });
  }

  const force = Boolean(req.body?.force);
  const resultado = await sendDailyNotifications({ force });
  res.json(resultado);
});

const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

const host = process.env.HOST || "0.0.0.0";

app.listen(config.PORT, host, async () => {
  console.log(`Servidor en http://${host}:${config.PORT}`);

  const smtpStatus = config.getSmtpStatus();
  if (!smtpStatus.ok) {
    console.warn("[correo]", smtpStatus.motivo);
    console.warn("  Guía: GMAIL-CONFIG.md | Prueba: npm run verificar-correo");
  } else {
    const verificacion = await verifySmtpConnection();
    if (verificacion.ok) {
      console.log("[correo] Gmail conectado correctamente.");
    } else {
      console.error("[correo] Error al conectar Gmail:", verificacion.error);
    }
  }

  const usuariosEmail = config.loadUsuariosConEmail();
  if (usuariosEmail.length === 0) {
    console.warn(
      "Agregue correos en config/usuarios.json para enviar avisos diarios."
    );
  } else {
    console.log(
      `Usuarios con correo configurado: ${usuariosEmail.map((u) => u.nombre).join(", ")}`
    );
  }

  iniciarCron();

  setTimeout(async () => {
    console.log("[inicio] Verificando avisos pendientes del día...");
    const resultado = await sendDailyNotifications();
    console.log("[inicio] Resultado avisos:", resultado);
  }, 3000);
});
