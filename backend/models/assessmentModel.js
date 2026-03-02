const pool = require('../config/db');

const upsertAssessment = async ({
  userId,
  aptitudeScore,
  communicationScore,
  psychometricScore,
  overallRating,
  profileRatingPercentage
}) => {
  const query = `
    INSERT INTO skill_assessments (
      user_id,
      aptitude_score,
      communication_score,
      psychometric_score,
      overall_rating,
      profile_rating_percentage
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id)
    DO UPDATE SET
      aptitude_score = EXCLUDED.aptitude_score,
      communication_score = EXCLUDED.communication_score,
      psychometric_score = EXCLUDED.psychometric_score,
      overall_rating = EXCLUDED.overall_rating,
      profile_rating_percentage = EXCLUDED.profile_rating_percentage,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, user_id, aptitude_score, communication_score, psychometric_score, overall_rating, profile_rating_percentage, created_at, updated_at;
  `;

  const values = [
    userId,
    aptitudeScore,
    communicationScore,
    psychometricScore,
    overallRating,
    profileRatingPercentage
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
};

const getAssessmentByUserId = async (userId) => {
  const query = `
    SELECT id, user_id, aptitude_score, communication_score, psychometric_score, overall_rating, profile_rating_percentage, created_at, updated_at
    FROM skill_assessments
    WHERE user_id = $1;
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows[0];
};

module.exports = {
  upsertAssessment,
  getAssessmentByUserId
};