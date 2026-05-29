import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error("POSTGRES_URL is not set in environment variables.");
}

const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
export * from "./schema";
