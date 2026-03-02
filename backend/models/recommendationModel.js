const pool = require('../config/db');

const listJobsForRecommendations = async ({ interestType } = {}) => {
  let query = `
    SELECT
      id,
      company_name,
      job_role,
      package_offered,
      job_type,
      required_skills,
      location,
      interest_type
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

const listCoursesForRecommendations = async () => {
  const query = `
    SELECT id, course_name, description, duration_weeks, level, provider, category, course_link
    FROM training_courses
    ORDER BY created_at DESC;
  `;

  const { rows } = await pool.query(query);
  return rows;
};

const listWorkshopsForRecommendations = async () => {
  const query = `
    SELECT id, title, description, scheduled_date, duration_hours, mode
    FROM workshops
    ORDER BY scheduled_date ASC NULLS LAST, created_at DESC;
  `;

  const { rows } = await pool.query(query);
  return rows;
};

const getUserRecommendationHistory = async (userId) => {
  const appliedJobsQuery = `
    SELECT
      ja.job_id,
      ja.status,
      ja.applied_at,
      j.job_role,
      j.job_type,
      j.required_skills,
      j.interest_type
    FROM job_applications ja
    INNER JOIN jobs j ON j.id = ja.job_id
    WHERE ja.user_id = $1
    ORDER BY ja.applied_at DESC;
  `;

  const courseAssignmentsQuery = `
    SELECT
      ca.course_id,
      ca.status,
      ca.completion_percentage,
      tc.course_name,
      tc.level,
      tc.description
    FROM course_assignments ca
    INNER JOIN training_courses tc ON tc.id = ca.course_id
    WHERE ca.user_id = $1
    ORDER BY ca.assigned_at DESC;
  `;

  const workshopAssignmentsQuery = `
    SELECT
      wa.workshop_id,
      wa.status,
      wa.completion_percentage,
      w.title,
      w.mode,
      w.description
    FROM workshop_assignments wa
    INNER JOIN workshops w ON w.id = wa.workshop_id
    WHERE wa.user_id = $1
    ORDER BY wa.assigned_at DESC;
  `;

  const [appliedJobs, courseAssignments, workshopAssignments] = await Promise.all([
    pool.query(appliedJobsQuery, [userId]),
    pool.query(courseAssignmentsQuery, [userId]),
    pool.query(workshopAssignmentsQuery, [userId])
  ]);

  return {
    appliedJobs: appliedJobs.rows,
    courseAssignments: courseAssignments.rows,
    workshopAssignments: workshopAssignments.rows
  };
};

module.exports = {
  listJobsForRecommendations,
  listCoursesForRecommendations,
  listWorkshopsForRecommendations,
  getUserRecommendationHistory
};
