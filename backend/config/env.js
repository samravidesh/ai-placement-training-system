const dotenv = require('dotenv');

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';
const dbClient = String(process.env.DB_CLIENT || (databaseUrl ? 'prisma' : 'pg')).toLowerCase();
const required = ['PORT', 'JWT_SECRET'];

required.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

if (!databaseUrl && dbClient === 'prisma') {
  throw new Error('DATABASE_URL (or NEON_DATABASE_URL) is required when DB_CLIENT=prisma');
}

if (!databaseUrl && dbClient === 'pg') {
  const requiredDbVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  requiredDbVars.forEach((key) => {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  });
}

if (!['pg', 'prisma'].includes(dbClient)) {
  throw new Error('DB_CLIENT must be either "pg" or "prisma"');
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  db: {
    client: dbClient,
    connectionString: databaseUrl || undefined,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: databaseUrl ? true : process.env.DB_SSL === 'true'
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'openai',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  },
  rag: {
    enabled: process.env.RAG_ENABLED !== 'false',
    openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    maxRetrievedDocs: Number(process.env.RAG_MAX_RETRIEVED_DOCS) || 12,
    syncOnRequest: process.env.RAG_SYNC_ON_REQUEST === 'true'
  },
  adminEmails: String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)
};
