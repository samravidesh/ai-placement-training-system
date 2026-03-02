const {
  createJob,
  getJobs,
  getJobById,
  applyForJob,
  hasAppliedForJob
} = require('../models/jobModel');

const validInterestTypes = ['govt', 'private', 'tech', 'non-tech'];

const addJob = async (req, res) => {
  try {
    const {
      company_name,
      job_role,
      package: packageValue,
      job_type,
      required_skills,
      location,
      interest_type
    } = req.body;

    if (!company_name || !job_role || packageValue === undefined || !job_type || !required_skills || !location || !interest_type) {
      return res.status(400).json({
        message: 'company_name, job_role, package, job_type, required_skills, location, and interest_type are required'
      });
    }

    const numericPackage = Number(packageValue);
    if (!Number.isFinite(numericPackage) || numericPackage < 0) {
      return res.status(400).json({ message: 'package must be a valid non-negative number' });
    }

    if (!validInterestTypes.includes(interest_type)) {
      return res.status(400).json({ message: 'interest_type must be one of: govt, private, tech, non-tech' });
    }

    const requiredSkillsText = Array.isArray(required_skills)
      ? required_skills.join(', ')
      : String(required_skills);

    const job = await createJob({
      companyName: company_name,
      jobRole: job_role,
      packageValue: numericPackage,
      jobType: job_type,
      requiredSkills: requiredSkillsText,
      location,
      interestType: interest_type
    });

    return res.status(201).json({ message: 'Job created successfully', job });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to add job', error: error.message });
  }
};

const getAllJobs = async (req, res) => {
  try {
    const { interest_type } = req.query;

    if (interest_type && !validInterestTypes.includes(interest_type)) {
      return res.status(400).json({ message: 'interest_type must be one of: govt, private, tech, non-tech' });
    }

    const jobs = await getJobs({ interestType: interest_type });

    return res.status(200).json({ count: jobs.length, jobs });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch jobs', error: error.message });
  }
};

const applyJob = async (req, res) => {
  try {
    const jobId = Number(req.params.jobId);

    if (!Number.isInteger(jobId) || jobId <= 0) {
      return res.status(400).json({ message: 'Invalid job id' });
    }

    const job = await getJobById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const alreadyApplied = await hasAppliedForJob({ userId: req.user.userId, jobId });
    if (alreadyApplied) {
      return res.status(409).json({ message: 'You have already applied for this job' });
    }

    const application = await applyForJob({ userId: req.user.userId, jobId });

    return res.status(201).json({
      message: 'Job application submitted successfully',
      application
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to apply for job', error: error.message });
  }
};

module.exports = {
  addJob,
  getAllJobs,
  applyJob
};