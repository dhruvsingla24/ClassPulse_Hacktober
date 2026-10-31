// Deletes the local database so the next server start re-creates the demo seed.
// (In the running app, teachers and admins can also use Settings → Reset demo data.)
import fs from "node:fs";
import path from "node:path";
const file = path.join(process.env.CLASSPULSE_DATA_DIR ?? path.join(process.cwd(), "data"), "db.json");
if (fs.existsSync(file)) fs.rmSync(file);
console.log("Demo data cleared. Start the app to re-seed:", file);
