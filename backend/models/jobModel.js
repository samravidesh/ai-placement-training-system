const pool = require('../config/db');

const createJob = async ({
  companyName,
  jobRole,
  packageValue,
  jobType,
  requiredSkills,
  location,
  interestType
}) => {
  const query = `
    INSERT INTO jobs (
      company_name,
      job_role,
      package_offered,
      job_type,
      required_skills,
      location,
      interest_type
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, company_name, job_role, package_offered AS package, job_type, required_skills, location, interest_type, created_at;
  `;

  const values = [
    companyName,
    jobRole,
    packageValue,
    jobType,
    requiredSkills,
    location,
    interestType
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
};

const getJobs = async ({ interestType }) => {
  let query = `
    SELECT id, company_name, job_role, package_offered AS package, job_type, required_skills, location, interest_type, created_at
    FROM jobs
  `;

  const values = [];

  if (interestType) {
    query += ' WHERE interest_type = $1';
    values.push(interestType);
  }

  query += ' ORDER BY created_at DESC;';

  const { rows } = await pool.query(query, values);
  return rows;
};

const getJobById = async (jobId) => {
  const query = `
    SELECT id, company_name, job_role, package_offered AS package, job_type, required_skills, location, interest_type
    FROM jobs
    WHERE id = $1;
  `;

  const { rows } = await pool.query(query, [jobId]);
  return rows[0];
};

const applyForJob = async ({ userId, jobId }) => {
  const query = `
    INSERT INTO job_applications (user_id, job_id)
    VALUES ($1, $2)
    RETURNING id, user_id, job_id, status, applied_at;
  `;

  const { rows } = await pool.query(query, [userId, jobId]);
  return rows[0];
};

const hasAppliedForJob = async ({ userId, jobId }) => {
  const query = 'SELECT id FROM job_applications WHERE user_id = $1 AND job_id = $2;';
  const { rows } = await pool.query(query, [userId, jobId]);
  return Boolean(rows[0]);
};

module.exports = {
  createJob,
  getJobs,
  getJobById,
  applyForJob,
  hasAppliedForJob
};