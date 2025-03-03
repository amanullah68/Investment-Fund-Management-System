import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3000"),
  NODE_ENV: z.string().default("development"),
  CLIENT_URL: z.string().default("*"),

  // blockchain
  RPC_URL: z.string().url(),
  PRIVATE_KEY: z.string(),
  CONTRACT_ADDRESS: z.string(),

  // redis
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.string().default("6379"),
  REDIS_PASSWORD: z.string().optional(),
  METRICS_CACHE_TTL: z.string().default("60"), // 1 minute

  // postgres
  POSTGRES_HOST: z.string().default("localhost"),
  POSTGRES_PORT: z.string().default("5432"),
  POSTGRES_USER: z.string().default("postgres"),
  POSTGRES_PASSWORD: z.string().default("password"),
  POSTGRES_DB: z.string().default("fund_tracking"),
});

export type EnvVars = z.infer<typeof envSchema>;
export const env = envSchema.parse(process.env);
