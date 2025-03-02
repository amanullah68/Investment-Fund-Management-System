import pgtools from "pgtools";
import { env } from "../config/config.js";

export async function createDatabaseIfNotExist(): Promise<void> {
  const config = {
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    port: parseInt(env.POSTGRES_PORT),
    host: env.POSTGRES_HOST,
  };

  try {
    await pgtools.createdb(config, env.POSTGRES_DB);
    console.log(`Database ${env.POSTGRES_DB} created successfully`);
  } catch (error: any) {
    if (error.code === "42P04" || error.name === "duplicate_database") {
      console.log(`Database ${env.POSTGRES_DB} already exists`);
    } else {
      console.error("Error creating database:", error);
    }
  }
}
