const fs = require("fs");
const path = require("path");

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "descansos.json");

const DEFAULT_DATA = {
  solicitudes: [],
  notificacionesDiarias: [],
};

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(DEFAULT_DATA, null, 2), "utf8");
  }
}

function readData() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(dbPath, "utf8");
    const data = JSON.parse(raw);
    return {
      solicitudes: Array.isArray(data.solicitudes) ? data.solicitudes : [],
      notificacionesDiarias: Array.isArray(data.notificacionesDiarias)
        ? data.notificacionesDiarias
        : [],
    };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

function writeData(data) {
  ensureDataFile();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
}

function getAllSolicitudes() {
  const data = readData();
  return data.solicitudes
    .map(mapSolicitudFromStore)
    .sort((a, b) => {
      if (a.fechaDescanso !== b.fechaDescanso) {
        return a.fechaDescanso.localeCompare(b.fechaDescanso);
      }
      return (b.creadoEn || "").localeCompare(a.creadoEn || "");
    });
}

function getSolicitudById(id) {
  const data = readData();
  const row = data.solicitudes.find((s) => s.id === id);
  return row ? mapSolicitudFromStore(row) : null;
}

function insertSolicitud(solicitud) {
  const data = readData();
  const row = {
    id: solicitud.id,
    nombre_chofer: solicitud.nombreChofer,
    fecha_solicitud: solicitud.fechaSolicitud,
    fecha_descanso: solicitud.fechaDescanso,
    motivo: solicitud.motivo,
    registrado_por: solicitud.registradoPor || null,
    creado_en: solicitud.creadoEn,
    cumplida: false,
  };

  data.solicitudes.unshift(row);
  writeData(data);
  return mapSolicitudFromStore(row);
}

function deleteSolicitud(id) {
  const data = readData();
  const antes = data.solicitudes.length;
  data.solicitudes = data.solicitudes.filter((s) => s.id !== id);

  if (data.solicitudes.length === antes) {
    return false;
  }

  writeData(data);
  return true;
}

function markSolicitudAsCumplida(id, cumplida = true) {
  const data = readData();
  const solicitud = data.solicitudes.find((s) => s.id === id);

  if (!solicitud) {
    return null;
  }

  solicitud.cumplida = cumplida;
  writeData(data);
  return mapSolicitudFromStore(solicitud);
}

function wasDailyNotificationSent(email, fechaEnvio) {
  const data = readData();
  return data.notificacionesDiarias.some(
    (n) => n.email_destino === email && n.fecha_envio === fechaEnvio
  );
}

function markDailyNotificationSent(email, fechaEnvio) {
  const data = readData();

  const existe = data.notificacionesDiarias.some(
    (n) => n.email_destino === email && n.fecha_envio === fechaEnvio
  );

  if (!existe) {
    data.notificacionesDiarias.push({
      email_destino: email,
      fecha_envio: fechaEnvio,
      enviado_en: new Date().toISOString(),
    });
    writeData(data);
  }
}

function mapSolicitudFromStore(row) {
  return {
    id: row.id,
    nombreChofer: row.nombre_chofer,
    fechaSolicitud: row.fecha_solicitud,
    fechaDescanso: row.fecha_descanso,
    motivo: row.motivo,
    registradoPor: row.registrado_por,
    creadoEn: row.creado_en,
    cumplida: row.cumplida || false,
  };
}

module.exports = {
  getAllSolicitudes,
  getSolicitudById,
  insertSolicitud,
  deleteSolicitud,
  markSolicitudAsCumplida,
  wasDailyNotificationSent,
  markDailyNotificationSent,
};
