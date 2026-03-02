const { Pool } = require('pg');
const { db } = require('./env');

const pgPoolConfig = db.connectionString
  ? {
      connectionString: db.connectionString,
      ssl: db.ssl ? { rejectUnauthorized: false } : false
    }
  : {
      host: db.host,
      port: db.port,
      user: db.user,
      password: db.password,
      database: db.database,
      ssl: db.ssl ? { rejectUnauthorized: false } : false
    };

const pgPool = new Pool(pgPoolConfig);

const createPrismaAdapter = () => {
  let PrismaClient;
  try {
    ({ PrismaClient } = require('@prisma/client'));
  } catch (_error) {
    throw new Error(
      'DB_CLIENT=prisma but @prisma/client is not installed. Run "npm install prisma @prisma/client" in backend.'
    );
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: db.connectionString
      }
    }
  });

  return {
    clientName: 'prisma',
    prisma,
    query: async (text, params = []) => {
      const result = await prisma.$queryRawUnsafe(text, ...params);
      const rows = Array.isArray(result) ? result : [];
      return {
        rows,
        rowCount: rows.length
      };
    },
    runSchemaSql: async (sqlText) => {
      // Prisma raw query execution can be restrictive for multi-statement schema SQL.
      await pgPool.query(sqlText);
    },
    close: async () => {
      await Promise.allSettled([prisma.$disconnect(), pgPool.end()]);
    }
  };
};

const createPgAdapter = () => ({
  clientName: 'pg',
  query: (text, params) => pgPool.query(text, params),
  runSchemaSql: (sqlText) => pgPool.query(sqlText),
  close: () => pgPool.end()
});

const adapter = db.client === 'prisma' ? createPrismaAdapter() : createPgAdapter();

module.exports = adapter;
