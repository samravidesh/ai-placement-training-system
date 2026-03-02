const pool = require('../config/db');

const upsertUserProfile = async ({ userId, profile }) => {
  const query = `
    INSERT INTO user_profiles (user_id, profile)
    VALUES ($1, $2::jsonb)
    ON CONFLICT (user_id)
    DO UPDATE SET
      profile = EXCLUDED.profile,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, user_id, profile, created_at, updated_at;
  `;

  const { rows } = await pool.query(query, [userId, JSON.stringify(profile || {})]);
  return rows[0];
};

const getUserProfileByUserId = async (userId) => {
  const query = `
    SELECT id, user_id, profile, created_at, updated_at
    FROM user_profiles
    WHERE user_id = $1;
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows[0];
};

const listProfilesWithAssessments = async () => {
  const query = `
    SELECT
      u.id AS user_id,
      u.name,
      u.email,
      u.branch,
      u.education_level,
      u.interest_type,
      u.onboarding_completed,
      up.profile,
      up.updated_at AS profile_updated_at,
      sa.aptitude_score,
      sa.communication_score,
      sa.psychometric_score,
      sa.overall_rating,
      sa.profile_rating_percentage,
      sa.updated_at AS assessment_updated_at
    FROM users u
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN skill_assessments sa ON sa.user_id = u.id
    ORDER BY u.id DESC;
  `;

  const { rows } = await pool.query(query);
  return rows;
};

module.exports = {
  upsertUserProfile,
  getUserProfileByUserId,
  listProfilesWithAssessments
};
