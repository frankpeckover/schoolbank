import { Pool } from "pg";

const databaseConfig = {
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};

declare global {
  var schoolbankPool: Pool | undefined;
}

export const db =
  globalThis.schoolbankPool ??
  new Pool(databaseConfig);

if (process.env.NODE_ENV !== "production") {
  globalThis.schoolbankPool = db;
}
