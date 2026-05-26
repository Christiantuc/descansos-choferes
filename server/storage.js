const fs = require("fs");
const path = require("path");

const REDIS_KEY = "descansos:v1";

const DEFAULT_DATA = {
  solicitudes: [],
  notificacionesDiarias: [],
};

let backend = "file";
let redis = null;
let filePath = null;

function getFilePath() {
  const dataDir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(__dirname, "..", "data");
  return path.join(dataDir, "descansos.json");
}

function isUpstashConfigured() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

function normalizeData(data) {
  return {
    solicitudes: Array.isArray(data?.solicitudes) ? data.solicitudes : [],
    notificacionesDiarias: Array.isArray(data?.notificacionesDiarias)
      ? data.notificacionesDiarias
      : [],
  };
}

function resolveFilePath() {
  if (!filePath) {
    filePath = getFilePath();
  }
  return filePath;
}

function ensureFile() {
  const target = resolveFilePath();
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, JSON.stringify(DEFAULT_DATA, null, 2), "utf8");
  }
}

function readFileSync() {
  const target = resolveFilePath();
  ensureFile();
  try {
    const raw = fs.readFileSync(target, "utf8");
    return normalizeData(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_DATA, solicitudes: [], notificacionesDiarias: [] };
  }
}

function getStorageInfo() {
  const persistent =
    backend === "upstash" || Boolean(process.env.DATA_DIR?.trim());
  return {
    backend,
    persistent,
    onRender: Boolean(process.env.RENDER),
    warning: process.env.RENDER && !persistent
      ? "Configure UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN en Render para no perder datos."
      : null,
  };
}

async function initStorage() {
  filePath = getFilePath();

  if (isUpstashConfigured()) {
    const { Redis } = require("@upstash/redis");
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL.trim(),
      token: process.env.UPSTASH_REDIS_REST_TOKEN.trim(),
    });
    backend = "upstash";

    const existing = await redis.get(REDIS_KEY);
    if (!existing) {
      const fileData = readFileSync();
      const hasData =
        fileData.solicitudes.length > 0 ||
        fileData.notificacionesDiarias.length > 0;
      await redis.set(REDIS_KEY, hasData ? fileData : DEFAULT_DATA);
      if (hasData) {
        console.log(
          `[storage] Migradas ${fileData.solicitudes.length} solicitudes del archivo a Upstash.`
        );
      }
    }

    const info = await redis.get(REDIS_KEY);
    const count = normalizeData(info).solicitudes.length;
    console.log(`[storage] Upstash Redis (persistente). Solicitudes: ${count}`);
    return;
  }

  backend = "file";
  ensureFile();

  if (process.env.RENDER) {
    console.warn(
      "[storage] ADVERTENCIA: Render sin almacenamiento persistente. " +
        "Los datos se pierden al reiniciar o redesplegar. " +
        "Agregue UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN (gratis). Ver DEPLOY.md"
    );
  } else {
    console.log(`[storage] Archivo local: ${filePath}`);
  }
}

async function readData() {
  if (backend === "upstash") {
    const data = await redis.get(REDIS_KEY);
    if (!data) {
      return { solicitudes: [], notificacionesDiarias: [] };
    }
    if (typeof data === "string") {
      return normalizeData(JSON.parse(data));
    }
    return normalizeData(data);
  }
  return readFileSync();
}

async function writeData(data) {
  const normalized = normalizeData(data);
  if (backend === "upstash") {
    await redis.set(REDIS_KEY, normalized);
    return;
  }
  const target = resolveFilePath();
  ensureFile();
  fs.writeFileSync(target, JSON.stringify(normalized, null, 2), "utf8");
}

async function replaceData(data) {
  await writeData(normalizeData(data));
}

module.exports = {
  DEFAULT_DATA,
  initStorage,
  readData,
  writeData,
  replaceData,
  getStorageInfo,
  normalizeData,
};
