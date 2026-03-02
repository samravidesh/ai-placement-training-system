const { findUserById, updateUserOnboardingStatus } = require('../models/userModel');
const { getUserProfileByUserId, upsertUserProfile, listProfilesWithAssessments } = require('../models/profileModel');
const { getAssessmentByUserId } = require('../models/assessmentModel');
const { calculateProfileCompletion } = require('../services/profileCompletionService');

const saveMyProfile = async (req, res) => {
  try {
    const profile = req.body || {};
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
      return res.status(400).json({ message: 'Profile payload must be a JSON object' });
    }

    const saved = await upsertUserProfile({
      userId: req.user.userId,
      profile
    });

    const [user, assessment] = await Promise.all([
      findUserById(req.user.userId),
      getAssessmentByUserId(req.user.userId)
    ]);
    const completion = calculateProfileCompletion({
      user,
      profileRecord: saved,
      assessment
    });

    return res.status(200).json({
      message: 'Profile saved successfully',
      profile: saved,
      completion
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to save profile', error: error.message });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const [user, profile, assessment] = await Promise.all([
      findUserById(req.user.userId),
      getUserProfileByUserId(req.user.userId),
      getAssessmentByUserId(req.user.userId)
    ]);

    const completion = calculateProfileCompletion({
      user,
      profileRecord: profile,
      assessment
    });

    return res.status(200).json({ profile: profile || null, completion });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
};

const getProfileCompletion = async (req, res) => {
  try {
    const [user, profile, assessment] = await Promise.all([
      findUserById(req.user.userId),
      getUserProfileByUserId(req.user.userId),
      getAssessmentByUserId(req.user.userId)
    ]);

    const completion = calculateProfileCompletion({
      user,
      profileRecord: profile,
      assessment
    });

    return res.status(200).json({
      user_id: req.user.userId,
      completion
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch profile completion', error: error.message });
  }
};

const completeOnboarding = async (req, res) => {
  try {
    const [user, profile, assessment] = await Promise.all([
      findUserById(req.user.userId),
      getUserProfileByUserId(req.user.userId),
      getAssessmentByUserId(req.user.userId)
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!profile) {
      return res.status(400).json({ message: 'Please save educational details before completing onboarding' });
    }

    if (!assessment) {
      return res.status(400).json({ message: 'Please complete aptitude test before completing onboarding' });
    }

    const updatedUser = await updateUserOnboardingStatus({
      userId: req.user.userId,
      completed: true
    });

    return res.status(200).json({
      message: 'Onboarding completed',
      user: updatedUser
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to complete onboarding', error: error.message });
  }
};

const getAllProfiles = async (_req, res) => {
  try {
    const profiles = await listProfilesWithAssessments();
    return res.status(200).json({
      count: profiles.length,
      profiles
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch profiles', error: error.message });
  }
};

module.exports = {
  saveMyProfile,
  getMyProfile,
  getProfileCompletion,
  completeOnboarding,
  getAllProfiles
};
