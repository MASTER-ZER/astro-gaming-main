import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Supabase Transaction Pooler runs on port 6543 and does not support
// prepared statements. Detect it automatically and disable preparation.
const isSupabasePooler = process.env.DATABASE_URL.includes(":6543");

const client = postgres(process.env.DATABASE_URL, {
  prepare: !isSupabasePooler,
  max: 10,
});

export const db = drizzle(client, { schema });
