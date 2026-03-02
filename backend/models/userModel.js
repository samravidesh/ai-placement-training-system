const pool = require('../config/db');

const publicUserFields = `id, name, email, branch, education_level, interest_type, onboarding_completed`;
const normalizeText = (value, fallback) => {
  const next = String(value || '').trim();
  return next || fallback;
};

const createUser = async ({ name, email, password, branch, education_level, interest_type }) => {
  const query = `
    INSERT INTO users (name, email, password, branch, education_level, interest_type)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING ${publicUserFields};
  `;

  const values = [
    normalizeText(name, 'New User'),
    email,
    password,
    normalizeText(branch, 'Not specified'),
    normalizeText(education_level, 'Not specified'),
    normalizeText(interest_type, 'tech')
  ];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

const findUserByEmail = async (email) => {
  const query = `
    SELECT id, name, email, password, branch, education_level, interest_type, onboarding_completed
    FROM users
    WHERE email = $1;
  `;

  const { rows } = await pool.query(query, [email]);
  return rows[0];
};

const findUserById = async (id) => {
  const query = `
    SELECT ${publicUserFields}
    FROM users
    WHERE id = $1;
  `;

  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

const updateUserOnboardingStatus = async ({ userId, completed }) => {
  const query = `
    UPDATE users
    SET onboarding_completed = $2
    WHERE id = $1
    RETURNING ${publicUserFields};
  `;

  const { rows } = await pool.query(query, [userId, completed]);
  return rows[0];
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserOnboardingStatus
};
