import connectDb, { closeDb } from "./db/postgres.js";
import seedAdmin from "./seedAdmin.js";

try {
  await connectDb();
  await seedAdmin();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await closeDb();
}
