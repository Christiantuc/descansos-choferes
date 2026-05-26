require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const config = require("./config");
const storage = require("./storage");
const { getSolicitudesProximas, sendDailyNotifications, verifySmtpConnection } = require("./notifications");

async function main() {
  await storage.initStorage();
  console.log("--- Verificación de correo (Gmail) ---\n");

  const smtpStatus = config.getSmtpStatus();
  console.log("Configuración:", smtpStatus.motivo);

  if (!smtpStatus.ok) {
    console.log("\nAbra .env y complete SMTP_PASS con la contraseña de aplicación.");
    process.exit(1);
  }

  console.log("Usuario SMTP:", config.SMTP.auth.user);
  console.log("Verificando conexión con Gmail...");

  const verificacion = await verifySmtpConnection();
  if (!verificacion.ok) {
    console.error("Error:", verificacion.error);
    console.log("\nRevise que SMTP_PASS sea la contraseña de aplicación (16 caracteres).");
    process.exit(1);
  }

  console.log("Conexión SMTP: OK\n");

  const proximas = await getSolicitudesProximas();
  console.log(`Descansos próximos (≤ ${config.DIAS_ALERTA} días): ${proximas.length}`);

  if (proximas.length === 0) {
    console.log("No hay descansos en ese rango. Cree una solicitud con fecha cercana para probar.");
    process.exit(0);
  }

  proximas.forEach((s) => {
    console.log(`  - ${s.nombreChofer}: ${s.fechaDescanso} (${s.diasRestantes} días)`);
  });

  console.log("\nEnviando aviso de prueba...");
  const resultado = await sendDailyNotifications({ force: false });

  console.log("\nResultado:", JSON.stringify(resultado, null, 2));

  if (resultado.enviados > 0) {
    console.log("\nRevise la bandeja de entrada (y spam) de los destinatarios.");
  } else if (resultado.omitidos > 0) {
    console.log("\nYa se envió el aviso de hoy. Use: npm run notificar -- --force");
  }

  process.exit(resultado.errores.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
