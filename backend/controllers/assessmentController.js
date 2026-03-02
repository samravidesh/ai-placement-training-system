const { upsertAssessment, getAssessmentByUserId } = require('../models/assessmentModel');
const { findUserById } = require('../models/userModel');
const { getUserProfileByUserId } = require('../models/profileModel');
const { calculateProfileCompletion } = require('../services/profileCompletionService');

const isValidScore = (value) => Number.isFinite(value) && value >= 0 && value <= 100;

const calculateRatings = ({ aptitudeScore, communicationScore, psychometricScore }) => {
  const overallRating = Number(((aptitudeScore + communicationScore + psychometricScore) / 3).toFixed(2));
  const profileRatingPercentage = overallRating;

  let ratingBand = 'Needs Improvement';
  if (profileRatingPercentage >= 85) {
    ratingBand = 'Excellent';
  } else if (profileRatingPercentage >= 70) {
    ratingBand = 'Good';
  } else if (profileRatingPercentage >= 50) {
    ratingBand = 'Average';
  }

  return {
    overallRating,
    profileRatingPercentage,
    ratingBand
  };
};

const saveAssessment = async (req, res) => {
  try {
    const aptitudeScore = Number(req.body.aptitude_score);
    const communicationScore = req.body.communication_score === undefined
      ? aptitudeScore
      : Number(req.body.communication_score);
    const psychometricScore = req.body.psychometric_score === undefined
      ? aptitudeScore
      : Number(req.body.psychometric_score);

    if (!isValidScore(aptitudeScore) || !isValidScore(communicationScore) || !isValidScore(psychometricScore)) {
      return res.status(400).json({
        message: 'aptitude_score is required and communication_score / psychometric_score (if provided) must be between 0 and 100'
      });
    }

    const { overallRating, profileRatingPercentage, ratingBand } = calculateRatings({
      aptitudeScore,
      communicationScore,
      psychometricScore
    });

    const assessment = await upsertAssessment({
      userId: req.user.userId,
      aptitudeScore,
      communicationScore,
      psychometricScore,
      overallRating,
      profileRatingPercentage
    });

    const [user, profileRecord] = await Promise.all([
      findUserById(req.user.userId),
      getUserProfileByUserId(req.user.userId)
    ]);
    const completion = calculateProfileCompletion({
      user,
      profileRecord,
      assessment
    });

    return res.status(200).json({
      message: 'Assessment saved successfully',
      assessment,
      completion,
      analysis: {
        overall_rating: overallRating,
        profile_rating_percentage: profileRatingPercentage,
        rating_band: ratingBand
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to save assessment', error: error.message });
  }
};

const getProfileAnalysis = async (req, res) => {
  try {
    const assessment = await getAssessmentByUserId(req.user.userId);

    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found for this user' });
    }

    const { ratingBand } = calculateRatings({
      aptitudeScore: Number(assessment.aptitude_score),
      communicationScore: Number(assessment.communication_score),
      psychometricScore: Number(assessment.psychometric_score)
    });

    const [user, profileRecord] = await Promise.all([
      findUserById(req.user.userId),
      getUserProfileByUserId(req.user.userId)
    ]);
    const completion = calculateProfileCompletion({
      user,
      profileRecord,
      assessment
    });

    return res.status(200).json({
      user_id: assessment.user_id,
      scores: {
        aptitude_score: assessment.aptitude_score,
        communication_score: assessment.communication_score,
        psychometric_score: assessment.psychometric_score
      },
      overall_rating: assessment.overall_rating,
      profile_rating_percentage: assessment.profile_rating_percentage,
      rating_band: ratingBand,
      completion,
      last_updated: assessment.updated_at
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch profile analysis', error: error.message });
  }
};

module.exports = {
  saveAssessment,
  getProfileAnalysis
};
