const nodemailer = require("nodemailer");
const config = require("./config");
const db = require("./db");
const { diasHasta, formatDateDisplay, fechaHoyISO } = require("./dates");

let transporter = null;

function resetTransporter() {
  transporter = null;
}

function getTransporter() {
  if (!config.isSmtpConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.SMTP.host,
      port: config.SMTP.port,
      secure: config.SMTP.secure,
      auth: config.SMTP.auth,
      tls: {
        minVersion: "TLSv1.2",
      },
    });
  }
  return transporter;
}

async function verifySmtpConnection() {
  if (!config.isSmtpConfigured()) {
    const status = config.getSmtpStatus();
    return { ok: false, error: status.motivo };
  }

  const transport = getTransporter();
  try {
    await transport.verify();
    return { ok: true };
  } catch (error) {
    resetTransporter();
    return { ok: false, error: error.message };
  }
}

function getSolicitudesProximas(solicitudes = db.getAllSolicitudes()) {
  return solicitudes
    .map((s) => ({
      ...s,
      diasRestantes: diasHasta(s.fechaDescanso),
      urgente: diasHasta(s.fechaDescanso) < 0,
    }))
    .filter((s) => !s.cumplida && s.diasRestantes >= -7 && s.diasRestantes <= config.DIAS_ALERTA)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}

function getDestinatariosUnicos(usuarios) {
  const vistos = new Set();
  return usuarios.filter((u) => {
    const email = u.email.toLowerCase();
    if (vistos.has(email)) return false;
    vistos.add(email);
    return true;
  });
}

function buildEmailHtml(proximas) {
  const filas = proximas
    .map((s) => {
      const diasTexto =
        s.diasRestantes === 0
          ? "hoy"
          : s.diasRestantes === 1
            ? "mañana"
            : `en ${s.diasRestantes} días`;

      return `<tr>
        <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(s.nombreChofer)}</td>
        <td style="padding:8px;border:1px solid #ddd;">${formatDateDisplay(s.fechaDescanso)}</td>
        <td style="padding:8px;border:1px solid #ddd;">${diasTexto}</td>
        <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(s.motivo)}</td>
      </tr>`;
    })
    .join("");

  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#1a2332;">
      <h2 style="margin:0 0 12px;">Aviso diario — Descansos de choferes</h2>
      <p>Hay <strong>${proximas.length}</strong> solicitud(es) con descanso dentro de los próximos ${config.DIAS_ALERTA} días:</p>
      <table style="border-collapse:collapse;width:100%;max-width:720px;">
        <thead>
          <tr style="background:#f0f4f8;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Chofer</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Fecha descanso</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Plazo</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Motivo</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      <p style="margin-top:16px;font-size:13px;color:#666;">
        Ingrese a la aplicación para ver el detalle completo.
      </p>
    </div>
  `;
}

function buildEmailText(proximas) {
  const lineas = proximas.map((s) => {
    const diasTexto =
      s.diasRestantes === 0
        ? "hoy"
        : s.diasRestantes === 1
          ? "mañana"
          : `en ${s.diasRestantes} días`;
    return `- ${s.nombreChofer}: descanso ${formatDateDisplay(s.fechaDescanso)} (${diasTexto}) — ${s.motivo}`;
  });

  return [
    "Aviso diario — Descansos de choferes",
    "",
    `Hay ${proximas.length} solicitud(es) con descanso dentro de los próximos ${config.DIAS_ALERTA} días:`,
    "",
    ...lineas,
    "",
    "Ingrese a la aplicación para ver el detalle completo.",
  ].join("\n");
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendDailyNotifications(options = {}) {
  const { force = false } = options;
  const fechaHoy = fechaHoyISO();
  const proximas = getSolicitudesProximas();

  const resultado = {
    fecha: fechaHoy,
    proximas: proximas.length,
    destinatarios: 0,
    enviados: 0,
    omitidos: 0,
    errores: [],
    sinSmtp: false,
    sinDestinatarios: false,
    smtpOk: false,
  };

  if (proximas.length === 0) {
    return resultado;
  }

  const usuarios = config.loadUsuariosConEmail();
  if (usuarios.length === 0) {
    resultado.sinDestinatarios = true;
    return resultado;
  }

  if (!config.isSmtpConfigured()) {
    resultado.sinSmtp = true;
    resultado.errores.push({ mensaje: config.getSmtpStatus().motivo });
    console.warn("[avisos]", config.getSmtpStatus().motivo);
    return resultado;
  }

  const verificacion = await verifySmtpConnection();
  if (!verificacion.ok) {
    resultado.sinSmtp = true;
    resultado.errores.push({ mensaje: verificacion.error });
    console.error("[avisos] Error SMTP:", verificacion.error);
    return resultado;
  }

  resultado.smtpOk = true;
  const transport = getTransporter();
  const destinatarios = getDestinatariosUnicos(usuarios);
  resultado.destinatarios = destinatarios.length;

  const subject = `[Descansos] ${proximas.length} descanso(s) en los próximos ${config.DIAS_ALERTA} días`;
  const html = buildEmailHtml(proximas);
  const text = buildEmailText(proximas);

  for (const destinatario of destinatarios) {
    if (!force && db.wasDailyNotificationSent(destinatario.email, fechaHoy)) {
      resultado.omitidos += 1;
      console.log(
        `[avisos] Ya enviado hoy a ${destinatario.email}, se omite.`
      );
      continue;
    }

    try {
      await transport.sendMail({
        from: config.MAIL_FROM,
        to: destinatario.email,
        subject,
        text,
        html,
      });

      db.markDailyNotificationSent(destinatario.email, fechaHoy);
      resultado.enviados += 1;
      console.log(`[avisos] Correo enviado a ${destinatario.email}`);
    } catch (error) {
      resultado.errores.push({
        email: destinatario.email,
        mensaje: error.message,
      });
      console.error(
        `[avisos] Error al enviar a ${destinatario.email}:`,
        error.message
      );
    }
  }

  return resultado;
}

module.exports = {
  getSolicitudesProximas,
  sendDailyNotifications,
  verifySmtpConnection,
  resetTransporter,
};
