import { config } from "dotenv";

config({ quiet: true });
config({ path: ".env.local", override: false, quiet: true });
