require("dotenv").config();
const app = require("./src/app");
const connectToDB = require("./src/config/db");

const PORT = process.env.PORT || 3000;

async function startServer() {
    await connectToDB();

    app.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════════════════════╗
║  🚀 AI Interview Strategist & Resume API Started       ║
║  🔗 Local:  http://localhost:${PORT}                      ║
║  🩺 Health: http://localhost:${PORT}/api/health           ║
╚════════════════════════════════════════════════════════╝
        `);
    });
}

startServer();