const { adminEmails } = require('../config/env');
const { findUserById } = require('../models/userModel');
const {
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
} = require('../models/trainingModel');
const { getUserProfileByUserId } = require('../models/profileModel');
const { getAssessmentByUserId } = require('../models/assessmentModel');

const isSelfOrAdmin = (req, userId) => {
  return req.user?.userId === userId || adminEmails.includes(req.user?.email);
};

const addCourse = async (req, res) => {
  try {
    const { course_name, description, duration_weeks, level, provider, category, course_link } = req.body;

    if (!course_name || !description || duration_weeks === undefined) {
      return res.status(400).json({
        message: 'course_name, description and duration_weeks are required'
      });
    }

    const durationWeeks = Number(duration_weeks);
    if (!Number.isInteger(durationWeeks) || durationWeeks <= 0) {
      return res.status(400).json({ message: 'duration_weeks must be a positive integer' });
    }

    const course = await createCourse({
      courseName: String(course_name).trim(),
      description: String(description).trim(),
      durationWeeks,
      level: level ? String(level).trim() : 'beginner',
      provider: provider ? String(provider).trim() : 'Internal',
      category: category ? String(category).trim() : 'General',
      courseLink: course_link ? String(course_link).trim() : null
    });

    return res.status(201).json({ message: 'Course added successfully', course });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to add course', error: error.message });
  }
};

const getCourses = async (_req, res) => {
  try {
    const courses = await listCourses();
    return res.status(200).json({ count: courses.length, courses });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch courses', error: error.message });
  }
};

const assignCourse = async (req, res) => {
  try {
    const { user_id, course_id, start_date, target_end_date } = req.body;

    if (!user_id || !course_id) {
      return res.status(400).json({ message: 'user_id and course_id are required' });
    }

    const userId = Number(user_id);
    const courseId = Number(course_id);

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({ message: 'user_id and course_id must be positive integers' });
    }

    const [user, course] = await Promise.all([
      findUserById(userId),
      getCourseById(courseId)
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const assignment = await assignCourseToUser({
      userId,
      courseId,
      assignedBy: req.user.userId,
      startDate: start_date || null,
      targetEndDate: target_end_date || null
    });

    return res.status(201).json({ message: 'Course assigned successfully', assignment });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to assign course', error: error.message });
  }
};

const updateCourseCompletion = async (req, res) => {
  try {
    const assignmentId = Number(req.params.assignmentId);
    const completionPercentage = Number(req.body.completion_percentage);

    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      return res.status(400).json({ message: 'Invalid assignment id' });
    }

    if (!Number.isFinite(completionPercentage) || completionPercentage < 0 || completionPercentage > 100) {
      return res.status(400).json({ message: 'completion_percentage must be between 0 and 100' });
    }

    const assignment = await getCourseAssignmentById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Course assignment not found' });
    }

    if (!isSelfOrAdmin(req, assignment.user_id)) {
      return res.status(403).json({ message: 'Not allowed to update this assignment' });
    }

    const updated = await updateCourseAssignmentCompletion({ assignmentId, completionPercentage });
    return res.status(200).json({ message: 'Course completion updated', assignment: updated });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update course completion', error: error.message });
  }
};

const generateSixMonthTrainingPlan = async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const [user, profileRecord, assessment] = await Promise.all([
      findUserById(userId),
      getUserProfileByUserId(userId),
      getAssessmentByUserId(userId)
    ]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const profile = profileRecord?.profile && typeof profileRecord.profile === 'object'
      ? profileRecord.profile
      : {};
    const targetRole = String(profile.targetRole || profile.target_role || '').trim() || 'General';
    const aptitude = Number(assessment?.aptitude_score || 0);
    const communication = Number(assessment?.communication_score || aptitude || 0);
    const skillCount = Array.isArray(profile.skills)
      ? profile.skills.length
      : String(profile.skills || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean).length;
    const skillsGap = skillCount < 4
      ? `Skill gap detected (${skillCount} core skills listed). Prioritize fundamentals and portfolio depth.`
      : 'Skill base is moderate. Prioritize depth and interview execution.';
    const weakestArea = aptitude < 60
      ? 'Aptitude and DSA fundamentals'
      : communication < 60
        ? 'Communication and interview articulation'
        : 'Project depth and interview consistency';

    const personalizedTemplate = [
      {
        monthNo: 1,
        moduleTitle: `Fundamentals Sprint (${targetRole})`,
        keyOutcomes: `Build core foundations and daily revision cadence. Focus area: ${weakestArea}. ${skillsGap}`,
        workshopModule: 'Learning strategy and consistency workshop'
      },
      {
        monthNo: 2,
        moduleTitle: `Core Concepts and Aptitude (${targetRole})`,
        keyOutcomes: 'Strengthen aptitude, CS basics, and role fundamentals with timed practice.',
        workshopModule: 'Aptitude and logical reasoning workshop'
      },
      {
        monthNo: 3,
        moduleTitle: `Project Build Phase I (${targetRole})`,
        keyOutcomes: 'Implement practical mini-projects and start DSA medium-level progression.',
        workshopModule: 'Project architecture and code review workshop'
      },
      {
        monthNo: 4,
        moduleTitle: `Project Build Phase II + DSA Medium`,
        keyOutcomes: 'Complete one showcase project and solve medium interview patterns consistently.',
        workshopModule: 'Problem-solving and debugging sprint workshop'
      },
      {
        monthNo: 5,
        moduleTitle: 'System Design and Advanced Role Preparation',
        keyOutcomes: `Learn system design basics tailored to ${targetRole} and prepare for technical rounds.`,
        workshopModule: 'System design and mock interview workshop'
      },
      {
        monthNo: 6,
        moduleTitle: 'Interview Prep and Placement Execution',
        keyOutcomes: 'Run full mock loops, resume optimization, and targeted application execution.',
        workshopModule: 'HR, behavioral, and offer negotiation workshop'
      }
    ];

    const planRows = await Promise.all(
      personalizedTemplate.map((monthPlan) =>
        upsertTrainingPlanMonth({
          userId,
          monthNo: monthPlan.monthNo,
          moduleTitle: monthPlan.moduleTitle,
          keyOutcomes: monthPlan.keyOutcomes,
          workshopModule: monthPlan.workshopModule
        })
      )
    );

    return res.status(200).json({
      message: '6 month structured training plan generated',
      user_id: userId,
      target_role: targetRole,
      weakest_area: weakestArea,
      plan: planRows
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate training plan', error: error.message });
  }
};

const getTrainingPlan = async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    if (!isSelfOrAdmin(req, userId)) {
      return res.status(403).json({ message: 'Not allowed to view this training plan' });
    }

    const plan = await getTrainingPlanByUserId(userId);
    return res.status(200).json({ user_id: userId, months: plan.length, plan });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch training plan', error: error.message });
  }
};

const addWorkshop = async (req, res) => {
  try {
    const { title, description, scheduled_date, duration_hours, mode } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'title and description are required' });
    }

    const durationHours = duration_hours === undefined ? null : Number(duration_hours);

    if (durationHours !== null && (!Number.isFinite(durationHours) || durationHours <= 0)) {
      return res.status(400).json({ message: 'duration_hours must be a positive number' });
    }

    const workshop = await createWorkshop({
      title: String(title).trim(),
      description: String(description).trim(),
      scheduledDate: scheduled_date || null,
      durationHours,
      mode: mode ? String(mode).trim() : 'offline'
    });

    return res.status(201).json({ message: 'Workshop created successfully', workshop });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to add workshop', error: error.message });
  }
};

const getWorkshops = async (_req, res) => {
  try {
    const workshops = await listWorkshops();
    return res.status(200).json({ count: workshops.length, workshops });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch workshops', error: error.message });
  }
};

const assignWorkshop = async (req, res) => {
  try {
    const { user_id, workshop_id } = req.body;

    if (!user_id || !workshop_id) {
      return res.status(400).json({ message: 'user_id and workshop_id are required' });
    }

    const userId = Number(user_id);
    const workshopId = Number(workshop_id);

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(workshopId) || workshopId <= 0) {
      return res.status(400).json({ message: 'user_id and workshop_id must be positive integers' });
    }

    const [user, workshop] = await Promise.all([
      findUserById(userId),
      getWorkshopById(workshopId)
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!workshop) {
      return res.status(404).json({ message: 'Workshop not found' });
    }

    const assignment = await assignWorkshopToUser({
      userId,
      workshopId,
      assignedBy: req.user.userId
    });

    return res.status(201).json({ message: 'Workshop assigned successfully', assignment });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to assign workshop', error: error.message });
  }
};

const updateWorkshopCompletion = async (req, res) => {
  try {
    const assignmentId = Number(req.params.assignmentId);
    const completionPercentage = Number(req.body.completion_percentage);

    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      return res.status(400).json({ message: 'Invalid assignment id' });
    }

    if (!Number.isFinite(completionPercentage) || completionPercentage < 0 || completionPercentage > 100) {
      return res.status(400).json({ message: 'completion_percentage must be between 0 and 100' });
    }

    const assignment = await getWorkshopAssignmentById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Workshop assignment not found' });
    }

    if (!isSelfOrAdmin(req, assignment.user_id)) {
      return res.status(403).json({ message: 'Not allowed to update this assignment' });
    }

    const updated = await updateWorkshopAssignmentCompletion({ assignmentId, completionPercentage });
    return res.status(200).json({ message: 'Workshop completion updated', assignment: updated });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update workshop completion', error: error.message });
  }
};

const getCompletionProgress = async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    if (!isSelfOrAdmin(req, userId)) {
      return res.status(403).json({ message: 'Not allowed to view this progress' });
    }

    const stats = await getCompletionStatsByUser(userId);

    const totalAssignments = Number(stats.total_courses) + Number(stats.total_workshops);
    const totalCompletionSum = Number(stats.course_completion_sum) + Number(stats.workshop_completion_sum);

    const overallCompletionPercentage = totalAssignments === 0
      ? 0
      : Number((totalCompletionSum / totalAssignments).toFixed(2));

    return res.status(200).json({
      user_id: userId,
      course_stats: {
        total_courses: Number(stats.total_courses),
        completed_courses: Number(stats.completed_courses),
        completion_percentage: Number(stats.course_completion_avg)
      },
      workshop_stats: {
        total_workshops: Number(stats.total_workshops),
        completed_workshops: Number(stats.completed_workshops),
        completion_percentage: Number(stats.workshop_completion_avg)
      },
      overall_completion_percentage: overallCompletionPercentage
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch completion progress', error: error.message });
  }
};

module.exports = {
  addCourse,
  getCourses,
  assignCourse,
  updateCourseCompletion,
  generateSixMonthTrainingPlan,
  getTrainingPlan,
  addWorkshop,
  getWorkshops,
  assignWorkshop,
  updateWorkshopCompletion,
  getCompletionProgress
};
