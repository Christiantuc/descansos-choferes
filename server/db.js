const storage = require("./storage");

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

async function getAllSolicitudes() {
  const data = await storage.readData();
  return data.solicitudes
    .map(mapSolicitudFromStore)
    .sort((a, b) => {
      if (a.fechaDescanso !== b.fechaDescanso) {
        return a.fechaDescanso.localeCompare(b.fechaDescanso);
      }
      return (b.creadoEn || "").localeCompare(a.creadoEn || "");
    });
}

async function getSolicitudById(id) {
  const data = await storage.readData();
  const row = data.solicitudes.find((s) => s.id === id);
  return row ? mapSolicitudFromStore(row) : null;
}

async function insertSolicitud(solicitud) {
  const data = await storage.readData();
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
  await storage.writeData(data);
  return mapSolicitudFromStore(row);
}

async function deleteSolicitud(id) {
  const data = await storage.readData();
  const antes = data.solicitudes.length;
  data.solicitudes = data.solicitudes.filter((s) => s.id !== id);

  if (data.solicitudes.length === antes) {
    return false;
  }

  await storage.writeData(data);
  return true;
}

async function markSolicitudAsCumplida(id, cumplida = true) {
  const data = await storage.readData();
  const solicitud = data.solicitudes.find((s) => s.id === id);

  if (!solicitud) {
    return null;
  }

  solicitud.cumplida = cumplida;
  await storage.writeData(data);
  return mapSolicitudFromStore(solicitud);
}

async function wasDailyNotificationSent(email, fechaEnvio) {
  const data = await storage.readData();
  return data.notificacionesDiarias.some(
    (n) => n.email_destino === email && n.fecha_envio === fechaEnvio
  );
}

async function markDailyNotificationSent(email, fechaEnvio) {
  const data = await storage.readData();

  const existe = data.notificacionesDiarias.some(
    (n) => n.email_destino === email && n.fecha_envio === fechaEnvio
  );

  if (!existe) {
    data.notificacionesDiarias.push({
      email_destino: email,
      fecha_envio: fechaEnvio,
      enviado_en: new Date().toISOString(),
    });
    await storage.writeData(data);
  }
}

async function importarDatos(payload) {
  const actual = await storage.readData();
  const solicitudes = Array.isArray(payload.solicitudes)
    ? payload.solicitudes
    : actual.solicitudes;
  const notificacionesDiarias = Array.isArray(payload.notificacionesDiarias)
    ? payload.notificacionesDiarias
    : actual.notificacionesDiarias;

  await storage.replaceData({ solicitudes, notificacionesDiarias });
  return storage.normalizeData({ solicitudes, notificacionesDiarias });
}

module.exports = {
  getAllSolicitudes,
  getSolicitudById,
  insertSolicitud,
  deleteSolicitud,
  markSolicitudAsCumplida,
  wasDailyNotificationSent,
  markDailyNotificationSent,
  importarDatos,
};
