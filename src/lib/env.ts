// Validasi environment variables saat startup
function requireEnv(name: string, devDefault?: string): string {
  const val = process.env[name];
  if (val) return val;
  if (process.env.NODE_ENV !== 'production' && devDefault) {
    process.env[name] = devDefault;
    return devDefault;
  }
  throw new Error(`Missing required environment variable: ${name}`);
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: requireEnv('DATABASE_URL'),
  NEXTAUTH_URL: requireEnv('NEXTAUTH_URL', 'http://localhost:3001'),
  NEXTAUTH_SECRET: requireEnv('NEXTAUTH_SECRET', 'dev-secret-do-not-use-in-prod'),
  APP_URL: requireEnv('APP_URL', 'http://localhost:3001'),
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  REDIS_URL: process.env.REDIS_URL,
};
