require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { sendDailyNotifications } = require("./notifications");

const force = process.argv.includes("--force");

sendDailyNotifications({ force })
  .then((resultado) => {
    console.log("Avisos ejecutados:", resultado);
    process.exit(resultado.errores.length > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });
