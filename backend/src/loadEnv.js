// Loads environment variables from backend/.env for LOCAL DEVELOPMENT only.
// On Vercel, environment variables are injected directly into process.env
// before the function runs, so this file is never imported there.
import dotenv from "dotenv";

dotenv.config({
  path: new URL("../.env", import.meta.url),
});
