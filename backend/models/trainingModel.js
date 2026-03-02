const pool = require('../config/db');

const createCourse = async ({ courseName, description, durationWeeks, level, provider, category, courseLink }) => {
  const query = `
    INSERT INTO training_courses (course_name, description, duration_weeks, level, provider, category, course_link)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, course_name, description, duration_weeks, level, provider, category, course_link, created_at;
  `;

  const { rows } = await pool.query(query, [
    courseName,
    description,
    durationWeeks,
    level,
    provider,
    category,
    courseLink
  ]);
  return rows[0];
};

const listCourses = async () => {
  const query = `
    SELECT id, course_name, description, duration_weeks, level, provider, category, course_link, created_at
    FROM training_courses
    ORDER BY created_at DESC;
  `;

  const { rows } = await pool.query(query);
  return rows;
};

const getCourseById = async (courseId) => {
  const query = `
    SELECT id, course_name, description, duration_weeks, level, provider, category, course_link
    FROM training_courses
    WHERE id = $1;
  `;

  const { rows } = await pool.query(query, [courseId]);
  return rows[0];
};

const assignCourseToUser = async ({ userId, courseId, assignedBy, startDate, targetEndDate }) => {
  const query = `
    INSERT INTO course_assignments (user_id, course_id, assigned_by, start_date, target_end_date)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, course_id)
    DO UPDATE SET
      assigned_by = EXCLUDED.assigned_by,
      start_date = EXCLUDED.start_date,
      target_end_date = EXCLUDED.target_end_date
    RETURNING id, user_id, course_id, status, completion_percentage, start_date, target_end_date, assigned_at;
  `;

  const { rows } = await pool.query(query, [userId, courseId, assignedBy, startDate, targetEndDate]);
  return rows[0];
};

const getCourseAssignmentById = async (assignmentId) => {
  const query = `
    SELECT id, user_id, course_id, status, completion_percentage
    FROM course_assignments
    WHERE id = $1;
  `;

  const { rows } = await pool.query(query, [assignmentId]);
  return rows[0];
};

const updateCourseAssignmentCompletion = async ({ assignmentId, completionPercentage }) => {
  const nextStatus = completionPercentage >= 100 ? 'completed' : completionPercentage > 0 ? 'in_progress' : 'assigned';

  const query = `
    UPDATE course_assignments
    SET completion_percentage = $2,
        status = $3
    WHERE id = $1
    RETURNING id, user_id, course_id, status, completion_percentage, start_date, target_end_date, assigned_at;
  `;

  const { rows } = await pool.query(query, [assignmentId, completionPercentage, nextStatus]);
  return rows[0];
};

const upsertTrainingPlanMonth = async ({ userId, monthNo, moduleTitle, keyOutcomes, workshopModule }) => {
  const query = `
    INSERT INTO training_plans (user_id, month_no, module_title, key_outcomes, workshop_module)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, month_no)
    DO UPDATE SET
      module_title = EXCLUDED.module_title,
      key_outcomes = EXCLUDED.key_outcomes,
      workshop_module = EXCLUDED.workshop_module
    RETURNING id, user_id, month_no, module_title, key_outcomes, workshop_module, created_at;
  `;

  const { rows } = await pool.query(query, [userId, monthNo, moduleTitle, keyOutcomes, workshopModule]);
  return rows[0];
};

const getTrainingPlanByUserId = async (userId) => {
  const query = `
    SELECT id, user_id, month_no, module_title, key_outcomes, workshop_module, created_at
    FROM training_plans
    WHERE user_id = $1
    ORDER BY month_no ASC;
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows;
};

const createWorkshop = async ({ title, description, scheduledDate, durationHours, mode }) => {
  const query = `
    INSERT INTO workshops (title, description, scheduled_date, duration_hours, mode)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, title, description, scheduled_date, duration_hours, mode, created_at;
  `;

  const { rows } = await pool.query(query, [title, description, scheduledDate, durationHours, mode]);
  return rows[0];
};

const listWorkshops = async () => {
  const query = `
    SELECT id, title, description, scheduled_date, duration_hours, mode, created_at
    FROM workshops
    ORDER BY scheduled_date ASC NULLS LAST, created_at DESC;
  `;

  const { rows } = await pool.query(query);
  return rows;
};

const getWorkshopById = async (workshopId) => {
  const query = `
    SELECT id, title, description, scheduled_date, duration_hours, mode
    FROM workshops
    WHERE id = $1;
  `;

  const { rows } = await pool.query(query, [workshopId]);
  return rows[0];
};

const assignWorkshopToUser = async ({ userId, workshopId, assignedBy }) => {
  const query = `
    INSERT INTO workshop_assignments (user_id, workshop_id, assigned_by)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, workshop_id)
    DO UPDATE SET
      assigned_by = EXCLUDED.assigned_by
    RETURNING id, user_id, workshop_id, status, completion_percentage, assigned_at;
  `;

  const { rows } = await pool.query(query, [userId, workshopId, assignedBy]);
  return rows[0];
};

const getWorkshopAssignmentById = async (assignmentId) => {
  const query = `
    SELECT id, user_id, workshop_id, status, completion_percentage
    FROM workshop_assignments
    WHERE id = $1;
  `;

  const { rows } = await pool.query(query, [assignmentId]);
  return rows[0];
};

const updateWorkshopAssignmentCompletion = async ({ assignmentId, completionPercentage }) => {
  const nextStatus = completionPercentage >= 100 ? 'completed' : completionPercentage > 0 ? 'in_progress' : 'assigned';

  const query = `
    UPDATE workshop_assignments
    SET completion_percentage = $2,
        status = $3
    WHERE id = $1
    RETURNING id, user_id, workshop_id, status, completion_percentage, assigned_at;
  `;

  const { rows } = await pool.query(query, [assignmentId, completionPercentage, nextStatus]);
  return rows[0];
};

const getCompletionStatsByUser = async (userId) => {
  const query = `
    WITH course_stats AS (
      SELECT
        COUNT(*)::INT AS total_courses,
        COALESCE(SUM(completion_percentage), 0)::NUMERIC AS course_completion_sum,
        COALESCE(ROUND(AVG(completion_percentage), 2), 0)::NUMERIC AS course_completion_avg,
        COUNT(*) FILTER (WHERE completion_percentage >= 100)::INT AS completed_courses
      FROM course_assignments
      WHERE user_id = $1
    ),
    workshop_stats AS (
      SELECT
        COUNT(*)::INT AS total_workshops,
        COALESCE(SUM(completion_percentage), 0)::NUMERIC AS workshop_completion_sum,
        COALESCE(ROUND(AVG(completion_percentage), 2), 0)::NUMERIC AS workshop_completion_avg,
        COUNT(*) FILTER (WHERE completion_percentage >= 100)::INT AS completed_workshops
      FROM workshop_assignments
      WHERE user_id = $1
    )
    SELECT
      c.total_courses,
      c.course_completion_sum,
      c.course_completion_avg,
      c.completed_courses,
      w.total_workshops,
      w.workshop_completion_sum,
      w.workshop_completion_avg,
      w.completed_workshops
    FROM course_stats c
    CROSS JOIN workshop_stats w;
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows[0];
};

module.exports = {
  createCourse,
  listCourses,
  getCourseById,
  assignCourseToUser,
  getCourseAssignmentById,
  updateCourseAssignmentCompletion,
  upsertTrainingPlanMonth,
  getTrainingPlanByUserId,
  createWorkshop,
  listWorkshops,
  getWorkshopById,
  assignWorkshopToUser,
  getWorkshopAssignmentById,
  updateWorkshopAssignmentCompletion,
  getCompletionStatsByUser
};
