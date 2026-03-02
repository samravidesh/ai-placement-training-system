const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const env = require('./config/env');
const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const jobRoutes = require('./routes/jobRoutes');
const companyAnalyticsRoutes = require('./routes/companyAnalyticsRoutes');
const trainingRoutes = require('./routes/trainingRoutes');
const profileRoutes = require('./routes/profileRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    return res.status(200).json({ status: 'ok', database: 'connected', client: db.clientName });
  } catch (error) {
    return res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/company-analytics', companyAnalyticsRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/profile', profileRoutes);

app.use((req, res) => {
  return res.status(404).json({ message: 'Route not found' });
});

const ensureSchema = async () => {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await db.runSchemaSql(schemaSql);
};

const bootstrap = async () => {
  try {
    await ensureSchema();
    app.listen(env.port, () => {
      console.log(`Server is running on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to initialize schema:', error);
    process.exit(1);
  }
};

bootstrap();

process.on('SIGINT', async () => {
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await db.close();
  process.exit(0);
});
