/**
 * Importa data/descansos.json al almacenamiento activo (Upstash o archivo).
 * Uso: npm run importar-datos
 * Requiere UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN en .env para subir a la nube.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const storage = require("./storage");
const db = require("./db");

async function main() {
  const archivo = path.join(__dirname, "..", "data", "descansos.json");
  const raw = fs.readFileSync(archivo, "utf8");
  const datos = JSON.parse(raw);

  await storage.initStorage();
  const resultado = await db.importarDatos(datos);
  const info = storage.getStorageInfo();

  console.log("Importación completada.");
  console.log("Almacenamiento:", info.backend, info.persistent ? "(persistente)" : "");
  console.log("Solicitudes:", resultado.solicitudes.length);
  console.log("Notificaciones diarias:", resultado.notificacionesDiarias.length);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
