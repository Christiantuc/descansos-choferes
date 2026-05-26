require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const storage = require("./storage");
const { sendDailyNotifications } = require("./notifications");

const force = process.argv.includes("--force");

storage
  .initStorage()
  .then(() => sendDailyNotifications({ force }))
  .then((resultado) => {
    console.log("Avisos ejecutados:", resultado);
    process.exit(resultado.errores.length > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });
