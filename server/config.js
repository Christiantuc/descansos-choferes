require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const path = require("path");

const USUARIOS_HABILITADOS = [
  "Christian",
  "Ariel",
  "Yamil",
  "Jorge",
  "Sebastian",
  "Dario",
  "Invitado",
];

function normalizarNombre(nombre) {
  return String(nombre)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buscarUsuarioHabilitado(nombre) {
  const normalizado = normalizarNombre(nombre);
  if (!normalizado) return null;
  return (
    USUARIOS_HABILITADOS.find((u) => normalizarNombre(u) === normalizado) ||
    null
  );
}

function loadUsuariosConEmail() {
  const fs = require("fs");
  const configPath = path.join(__dirname, "..", "config", "usuarios.json");
  let lista = [];

  try {
    lista = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    lista = [];
  }

  return USUARIOS_HABILITADOS.map((nombre) => {
    const encontrado = lista.find(
      (u) => normalizarNombre(u.nombre) === normalizarNombre(nombre)
    );
    const email = (encontrado?.email || "").trim();
    return { nombre, email };
  }).filter((u) => u.email);
}

function isPlaceholderPassword(pass) {
  const normalizado = pass.toLowerCase();
  return (
    !pass ||
    normalizado.includes("pegar") ||
    normalizado.includes("contraseña") ||
    normalizado.includes("aplicacion") ||
    normalizado.includes("aplicación")
  );
}

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  DIAS_ALERTA: Number(process.env.DIAS_ALERTA) || 5,
  CRON_AVISOS: process.env.CRON_AVISOS || "0 8 * * *",
  TZ: process.env.TZ || "America/Argentina/Buenos_Aires",
  MAIL_FROM: process.env.MAIL_FROM || "Descansos <notificaciones@localhost>",
  SMTP: {
    host: (process.env.SMTP_HOST || "").trim(),
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: (process.env.SMTP_USER || "").trim(),
      pass: String(process.env.SMTP_PASS || "")
        .trim()
        .replace(/\s+/g, ""),
    },
  },
  ADMIN_KEY: process.env.ADMIN_KEY || "",
  USUARIOS_HABILITADOS,
  normalizarNombre,
  buscarUsuarioHabilitado,
  loadUsuariosConEmail,
  isSmtpConfigured() {
    const pass = String(process.env.SMTP_PASS || "").trim();
    if (isPlaceholderPassword(pass)) return false;
    return Boolean(
      (process.env.SMTP_HOST || "").trim() &&
        (process.env.SMTP_USER || "").trim() &&
        pass.replace(/\s+/g, "").length >= 8
    );
  },
  getSmtpStatus() {
    if (!(process.env.SMTP_HOST || "").trim()) {
      return { ok: false, motivo: "Falta SMTP_HOST en .env" };
    }
    if (!(process.env.SMTP_USER || "").trim()) {
      return { ok: false, motivo: "Falta SMTP_USER en .env" };
    }
    const pass = String(process.env.SMTP_PASS || "").trim();
    if (isPlaceholderPassword(pass)) {
      return {
        ok: false,
        motivo: "Falta SMTP_PASS en .env (pegue la contraseña de aplicación de Gmail)",
      };
    }
    if (pass.replace(/\s+/g, "").length < 8) {
      return { ok: false, motivo: "SMTP_PASS parece incompleta" };
    }
    return { ok: true, motivo: "Configuración SMTP presente" };
  },
};
