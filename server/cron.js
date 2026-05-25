const cron = require("node-cron");
const config = require("./config");
const { sendDailyNotifications } = require("./notifications");

function iniciarCron() {
  if (!cron.validate(config.CRON_AVISOS)) {
    console.error(
      `[cron] Expresión inválida: "${config.CRON_AVISOS}". Revise CRON_AVISOS en .env`
    );
    return;
  }

  cron.schedule(
    config.CRON_AVISOS,
    async () => {
      console.log("[cron] Ejecutando avisos diarios...");
      try {
        const resultado = await sendDailyNotifications();
        console.log("[cron] Resultado:", resultado);
      } catch (error) {
        console.error("[cron] Error:", error.message);
      }
    },
    { timezone: config.TZ }
  );

  console.log(
    `[cron] Avisos programados: "${config.CRON_AVISOS}" (${config.TZ})`
  );
}

module.exports = { iniciarCron };
