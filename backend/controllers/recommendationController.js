const { generateAssistantAnswer, buildFallbackAnswer } = require('../services/aiRecommendationService');
const { generateMlRecommendations } = require('../services/mlRecommendationService');
const {
  buildRagContext,
  reindexRecommendationCorpus,
  getRecommendationIndexStatus
} = require('../services/ragRetrievalService');
const { ai: aiConfig } = require('../config/env');
const { findUserById } = require('../models/userModel');
const { getUserProfileByUserId } = require('../models/profileModel');
const { getAssessmentByUserId } = require('../models/assessmentModel');
const {
  listJobsForRecommendations,
  listCoursesForRecommendations,
  listWorkshopsForRecommendations,
  getUserRecommendationHistory
} = require('../models/recommendationModel');

const validInterestTypes = ['govt', 'private', 'tech', 'non-tech'];

const isValidScore = (value) => Number.isFinite(value) && value >= 0 && value <= 100;
const toBoolean = (value) => String(value).toLowerCase() === 'true';

const getRecommendations = async (req, res) => {
  try {
    const [user, profileRecord, assessment] = await Promise.all([
      findUserById(req.user.userId),
      getUserProfileByUserId(req.user.userId),
      getAssessmentByUserId(req.user.userId)
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const bodySkillScores = req.body.skill_scores || {};
    const aptitudeScore = Number(
      bodySkillScores.aptitude_score ?? req.body.aptitude_score ?? assessment?.aptitude_score
    );
    const communicationScore = Number(
      bodySkillScores.communication_score ?? req.body.communication_score ?? assessment?.communication_score ?? aptitudeScore
    );
    const psychometricScore = Number(
      bodySkillScores.psychometric_score ?? req.body.psychometric_score ?? assessment?.psychometric_score ?? aptitudeScore
    );

    const profileContext = profileRecord?.profile || {};
    const derivedEducation = profileContext?.basicInfo?.education_level || profileContext?.education_level || profileContext?.course_name;
    const derivedInterest = profileContext?.interest_type;
    const interestType = req.body.interest_type || user.interest_type || derivedInterest || 'tech';
    const userEducation = req.body.user_education || req.body.education_level || user.education_level || derivedEducation || 'Undergraduate';

    if (!validInterestTypes.includes(interestType)) {
      return res.status(400).json({
        message: 'interest_type must be one of: govt, private, tech, non-tech'
      });
    }

    if (!userEducation) {
      return res.status(400).json({
        message: 'education detail is required to generate recommendations'
      });
    }

    if (!isValidScore(aptitudeScore) || !isValidScore(communicationScore) || !isValidScore(psychometricScore)) {
      return res.status(400).json({
        message: 'aptitude test scores are missing or invalid. Complete aptitude test first or pass valid skill_scores'
      });
    }

    const question = req.body.question ? String(req.body.question) : '';

    const datasetResults = await Promise.allSettled([
      listJobsForRecommendations(),
      listCoursesForRecommendations(),
      listWorkshopsForRecommendations(),
      getUserRecommendationHistory(req.user.userId)
    ]);

    const [jobsResult, coursesResult, workshopsResult, historyResult] = datasetResults;
    const jobs = jobsResult.status === 'fulfilled' ? jobsResult.value : [];
    const courses = coursesResult.status === 'fulfilled' ? coursesResult.value : [];
    const workshops = workshopsResult.status === 'fulfilled' ? workshopsResult.value : [];
    const history = historyResult.status === 'fulfilled'
      ? historyResult.value
      : { appliedJobs: [], courseAssignments: [], workshopAssignments: [] };

    const datasetFallback = {
      jobs: jobsResult.status === 'rejected',
      courses: coursesResult.status === 'rejected',
      workshops: workshopsResult.status === 'rejected',
      history: historyResult.status === 'rejected'
    };

    let ragContext = {
      semanticScores: { jobs: {}, courses: {}, workshops: {} },
      retrieval: {
        enabled: false,
        strategy: 'none',
        indexed_documents: 0,
        embedded_documents: 0,
        matched_documents: 0,
        top_contexts: []
      }
    };

    try {
      ragContext = await buildRagContext({
        jobs,
        courses,
        workshops,
        question,
        interestType,
        userEducation,
        skillScores: {
          aptitude_score: aptitudeScore,
          communication_score: communicationScore,
          psychometric_score: psychometricScore
        },
        profileContext,
        userContext: {
          name: user.name,
          branch: user.branch,
          education_level: user.education_level
        }
      });
    } catch (_ragError) {
      ragContext = {
        semanticScores: { jobs: {}, courses: {}, workshops: {} },
        retrieval: {
          enabled: false,
          strategy: 'failed_to_initialize',
          indexed_documents: jobs.length + courses.length + workshops.length,
          embedded_documents: 0,
          matched_documents: 0,
          top_contexts: []
        }
      };
    }

    const recommendations = generateMlRecommendations({
      userEducation,
      interestType,
      skillScores: {
        aptitude_score: aptitudeScore,
        communication_score: communicationScore,
        psychometric_score: psychometricScore
      },
      profileContext,
      question,
      userContext: {
        name: user.name,
        branch: user.branch,
        education_level: user.education_level,
        interest_type: user.interest_type,
        onboarding_completed: user.onboarding_completed
      },
      datasets: {
        jobs,
        courses,
        workshops
      },
      history,
      ragContext
    });

    let assistantAnswer = '';
    let llmAnswerGenerated = false;

    try {
      assistantAnswer = await generateAssistantAnswer({
        question,
        userEducation,
        interestType,
        skillScores: {
          aptitude_score: aptitudeScore,
          communication_score: communicationScore,
          psychometric_score: psychometricScore
        },
        userContext: {
          name: user.name,
          branch: user.branch
        },
        recommendations,
        retrievalContext: recommendations.retrieval_context || ragContext.retrieval
      });
      llmAnswerGenerated = Boolean(assistantAnswer);
    } catch (_aiError) {
      assistantAnswer = buildFallbackAnswer({
        question,
        recommendations
      });
    }

    const mergedRecommendations = {
      ...recommendations,
      assistant_answer: assistantAnswer
    };

    return res.status(200).json({
      provider: aiConfig.provider,
      source: {
        profile_used: Boolean(profileRecord),
        assessment_used: Boolean(assessment),
        ml_model: recommendations.ml_model?.name || 'Adaptive Hybrid Career Ranker v1',
        llm_answer_generated: llmAnswerGenerated,
        dataset_fallback: datasetFallback,
        dataset_counts: {
          jobs: jobs.length,
          courses: courses.length,
          workshops: workshops.length
        },
        rag: recommendations.retrieval_context || ragContext.retrieval,
        overrides_from_request: Boolean(req.body.skill_scores || req.body.interest_type || req.body.user_education)
      },
      input: {
        user_education: userEducation,
        interest_type: interestType,
        skill_scores: {
          aptitude_score: aptitudeScore,
          communication_score: communicationScore,
          psychometric_score: psychometricScore
        }
      },
      recommendations: mergedRecommendations
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to generate AI recommendations',
      error: error.message
    });
  }
};

const reindexRecommendations = async (req, res) => {
  try {
    const force = toBoolean(req.body?.force ?? req.query?.force ?? false);

    const datasetResults = await Promise.allSettled([
      listJobsForRecommendations(),
      listCoursesForRecommendations(),
      listWorkshopsForRecommendations()
    ]);

    const [jobsResult, coursesResult, workshopsResult] = datasetResults;
    const jobs = jobsResult.status === 'fulfilled' ? jobsResult.value : [];
    const courses = coursesResult.status === 'fulfilled' ? coursesResult.value : [];
    const workshops = workshopsResult.status === 'fulfilled' ? workshopsResult.value : [];

    const datasetFallback = {
      jobs: jobsResult.status === 'rejected',
      courses: coursesResult.status === 'rejected',
      workshops: workshopsResult.status === 'rejected'
    };

    const indexing = await reindexRecommendationCorpus({
      jobs,
      courses,
      workshops,
      force
    });

    return res.status(200).json({
      message: 'Recommendation corpus reindex completed',
      force,
      dataset_fallback: datasetFallback,
      dataset_counts: {
        jobs: jobs.length,
        courses: courses.length,
        workshops: workshops.length
      },
      indexing
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to reindex recommendation corpus',
      error: error.message
    });
  }
};

const getReindexStatus = async (_req, res) => {
  try {
    const status = await getRecommendationIndexStatus();
    return res.status(200).json(status);
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch recommendation index status',
      error: error.message
    });
  }
};

module.exports = {
  getRecommendations,
  reindexRecommendations,
  getReindexStatus
};
