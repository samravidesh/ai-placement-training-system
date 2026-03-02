const PROFILE_COMPLETION_FIELDS = [
  'phone',
  'date_of_birth',
  'gender',
  'current_address',
  'city',
  'state',
  'country',
  'postal_code',
  'college_name',
  'university_name',
  'course_name',
  'specialization',
  'graduation_year',
  'cgpa',
  'tenth_percentage',
  'twelfth_percentage'
];

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'or', 'the', 'to', 'for', 'of', 'in', 'on', 'with', 'is', 'are', 'from',
  'at', 'by', 'be', 'as', 'this', 'that', 'it', 'your', 'you', 'will'
]);

const INTEREST_KEYWORDS = {
  tech: ['developer', 'software', 'programming', 'data', 'ai', 'ml', 'cloud', 'devops', 'code'],
  private: ['business', 'operations', 'sales', 'finance', 'consulting', 'corporate', 'analyst'],
  govt: ['government', 'public', 'civil', 'banking', 'railway', 'defence', 'exam', 'policy'],
  'non-tech': ['hr', 'communication', 'support', 'operations', 'content', 'training', 'service']
};

const SCORE_WEIGHTS = {
  tech: { aptitude: 0.5, communication: 0.2, psychometric: 0.3 },
  private: { aptitude: 0.3, communication: 0.45, psychometric: 0.25 },
  govt: { aptitude: 0.45, communication: 0.25, psychometric: 0.3 },
  'non-tech': { aptitude: 0.25, communication: 0.5, psychometric: 0.25 }
};

const DEFAULT_RECOMMENDATION_CATALOG = {
  tech: {
    placements: [
      { title: 'Software Developer', company: 'Growth Product Startup', location: 'Remote/Hybrid', package: 6.5, reason: 'Strong foundation role for coding, problem solving, and iterative product work.' },
      { title: 'Data Analyst', company: 'Analytics Services Firm', location: 'Bengaluru', package: 5.8, reason: 'Good fit to build SQL, BI, and business analytics depth for placements.' },
      { title: 'QA Automation Engineer', company: 'Mid-size SaaS Company', location: 'Pune', package: 5.2, reason: 'Entry path to software lifecycle, testing frameworks, and release workflows.' }
    ],
    internships: [
      { title: 'Software Engineering Intern', company: 'Campus Hiring Partner', location: 'Remote', reason: 'Build production habits and project ownership before final placement rounds.' },
      { title: 'Data Science Intern', company: 'AI Enablement Team', location: 'Hybrid', reason: 'Adds practical portfolio projects in analytics and machine-learning workflows.' },
      { title: 'Cloud Operations Intern', company: 'Cloud Services Company', location: 'Chennai', reason: 'Improves deployment, monitoring, and infrastructure basics valued by recruiters.' }
    ],
    courses: [
      { name: 'DSA and Problem Solving Track', platform: 'Placement Platform', reason: 'Directly improves coding round conversion and interview speed.' },
      { name: 'SQL and Data Analytics Bootcamp', platform: 'Placement Platform', reason: 'Strengthens data interpretation and analyst role readiness.' },
      { name: 'System Design Fundamentals', platform: 'Placement Platform', reason: 'Helps explain architecture decisions during technical interviews.' }
    ],
    trainings: [
      { title: 'Weekly Mock Coding Sprint', type: 'workshop', duration: '2 hours', reason: 'Improves timed performance and debugging speed.' },
      { title: 'Interview Communication Lab', type: 'workshop', duration: '2 hours', reason: 'Builds concise technical storytelling for interview rounds.' },
      { title: 'Resume and GitHub Improvement Clinic', type: 'workshop', duration: '90 minutes', reason: 'Increases profile quality and recruiter response rate.' }
    ]
  },
  private: {
    placements: [
      { title: 'Business Analyst', company: 'Consulting Partner', location: 'Mumbai', package: 5.6, reason: 'Builds analytical and stakeholder communication experience.' },
      { title: 'Management Trainee', company: 'Corporate Operations Firm', location: 'Delhi NCR', package: 5.0, reason: 'Provides broad exposure across operations, reporting, and execution.' },
      { title: 'Sales Operations Associate', company: 'Enterprise Services Company', location: 'Hyderabad', package: 4.8, reason: 'Develops business process and performance tracking skills.' }
    ],
    internships: [
      { title: 'Business Development Intern', company: 'Growth Company', location: 'Remote', reason: 'Builds communication and market research capability.' },
      { title: 'Operations Intern', company: 'Process Consulting Team', location: 'Pune', reason: 'Hands-on process optimization and reporting exposure.' },
      { title: 'Finance Intern', company: 'Finance Analytics Firm', location: 'Bengaluru', reason: 'Strengthens data-driven decision support and business acumen.' }
    ],
    courses: [
      { name: 'Business Analytics Foundations', platform: 'Placement Platform', reason: 'Improves analyst role outcomes and decision-making clarity.' },
      { name: 'Excel, SQL, and Dashboarding', platform: 'Placement Platform', reason: 'Core tools for private sector entry roles.' },
      { name: 'Corporate Communication Essentials', platform: 'Placement Platform', reason: 'Strengthens interviews, teamwork, and client interaction.' }
    ],
    trainings: [
      { title: 'Case Study Workshop', type: 'workshop', duration: '2 hours', reason: 'Prepares for business and consulting style interviews.' },
      { title: 'Group Discussion Practice', type: 'workshop', duration: '90 minutes', reason: 'Improves structured speaking and persuasion under time pressure.' },
      { title: 'Resume Positioning Session', type: 'workshop', duration: '90 minutes', reason: 'Aligns profile with private sector JD expectations.' }
    ]
  },
  govt: {
    placements: [
      { title: 'Public Sector Apprentice', company: 'Government-linked Enterprise', location: 'Regional', package: 4.2, reason: 'Entry route into structured public sector hiring tracks.' },
      { title: 'Banking Operations Associate', company: 'Public Sector Banking Partner', location: 'Multiple Cities', package: 4.5, reason: 'Strong alignment with aptitude and public-service preparation.' },
      { title: 'Program Support Associate', company: 'Public Program Office', location: 'State HQ', package: 4.0, reason: 'Builds execution and documentation skills for government roles.' }
    ],
    internships: [
      { title: 'Public Policy Intern', company: 'Policy Research Unit', location: 'Hybrid', reason: 'Adds policy and governance exposure valuable for govt careers.' },
      { title: 'Bank Exam Practice Intern', company: 'Exam Training Partner', location: 'Remote', reason: 'Improves quantitative and reasoning consistency.' },
      { title: 'Administrative Intern', company: 'District Administration Support', location: 'On-site', reason: 'Develops process discipline and public-facing communication.' }
    ],
    courses: [
      { name: 'Quantitative Aptitude Mastery', platform: 'Placement Platform', reason: 'High-impact for govt and banking exam pathways.' },
      { name: 'Reasoning and Logical Ability', platform: 'Placement Platform', reason: 'Improves score consistency in competitive tests.' },
      { name: 'Current Affairs and Public Policy Basics', platform: 'Placement Platform', reason: 'Builds context for interviews and public-sector readiness.' }
    ],
    trainings: [
      { title: 'Mock Test Analysis Lab', type: 'workshop', duration: '2 hours', reason: 'Helps identify weak sections and improve score trend.' },
      { title: 'Interview and Documentation Session', type: 'workshop', duration: '90 minutes', reason: 'Prepares for structured government recruitment rounds.' },
      { title: 'Time Management Bootcamp', type: 'workshop', duration: '90 minutes', reason: 'Improves exam strategy and execution under constraints.' }
    ]
  },
  'non-tech': {
    placements: [
      { title: 'HR Associate', company: 'People Operations Firm', location: 'Pune', package: 4.6, reason: 'Matches communication-heavy, people-focused career growth.' },
      { title: 'Customer Success Associate', company: 'Service Platform', location: 'Bengaluru', package: 4.8, reason: 'Develops client communication and issue-resolution capability.' },
      { title: 'Operations Coordinator', company: 'Business Services Company', location: 'Hyderabad', package: 4.5, reason: 'Builds process, communication, and delivery consistency.' }
    ],
    internships: [
      { title: 'HR Intern', company: 'Talent Operations Team', location: 'Remote', reason: 'Hands-on exposure to hiring workflows and people analytics.' },
      { title: 'Content and Communication Intern', company: 'Training Partner', location: 'Hybrid', reason: 'Improves structured communication for non-tech interviews.' },
      { title: 'Operations Intern', company: 'Service Delivery Team', location: 'On-site', reason: 'Strengthens execution and stakeholder coordination.' }
    ],
    courses: [
      { name: 'HR and People Operations Basics', platform: 'Placement Platform', reason: 'Builds fundamentals for HR and people-centric roles.' },
      { name: 'Professional Communication and Email Writing', platform: 'Placement Platform', reason: 'Improves interview and workplace communication quality.' },
      { name: 'Operations Management Essentials', platform: 'Placement Platform', reason: 'Supports coordination and process-oriented job paths.' }
    ],
    trainings: [
      { title: 'HR Interview Simulation', type: 'workshop', duration: '90 minutes', reason: 'Improves confidence and response structure.' },
      { title: 'Communication Masterclass', type: 'workshop', duration: '2 hours', reason: 'Builds clarity, tone, and stakeholder communication skills.' },
      { title: 'Workplace Collaboration Lab', type: 'workshop', duration: '90 minutes', reason: 'Strengthens teamwork and delivery ownership.' }
    ]
  }
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const normalizeText = (value) => String(value || '').trim().toLowerCase();

const toPercent = (value) => `${Math.round(clamp(value, 0, 99))}%`;
const toRatio = (value) => `${Math.round(clamp(value, 0, 100))}%`;

const normalizeList = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const tokenizeText = (value) => {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
};

const tokenizeList = (values) => {
  const tokens = values.flatMap((value) => tokenizeText(value));
  return [...new Set(tokens)];
};

const jaccardSimilarity = (leftTokens, rightTokens) => {
  const left = new Set(leftTokens);
  const right = new Set(rightTokens);

  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let overlap = 0;
  left.forEach((token) => {
    if (right.has(token)) {
      overlap += 1;
    }
  });

  const union = left.size + right.size - overlap;
  return union === 0 ? 0 : overlap / union;
};

const keywordCoverage = (tokens, keywords) => {
  if (!tokens.length || !keywords.length) {
    return 0;
  }
  const tokenSet = new Set(tokens);
  const hits = keywords.filter((keyword) => tokenSet.has(keyword)).length;
  return hits / keywords.length;
};

const average = (values) => {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, current) => sum + current, 0) / values.length;
};

const getLevelTarget = (scoreAverage) => {
  if (scoreAverage < 50) {
    return 'beginner';
  }
  if (scoreAverage < 75) {
    return 'intermediate';
  }
  return 'advanced';
};

const mapScoreBand = (score) => {
  if (score >= 80) {
    return 'Advanced';
  }
  if (score >= 60) {
    return 'Intermediate';
  }
  return 'Beginner';
};

const isInternshipJob = (jobType) => {
  const normalized = String(jobType || '').toLowerCase();
  return normalized.includes('intern') || normalized.includes('trainee') || normalized.includes('apprentice');
};

const getProfileCompletion = (profileContext) => {
  const profile = profileContext && typeof profileContext === 'object' ? profileContext : {};
  const filled = PROFILE_COMPLETION_FIELDS.filter((field) => {
    const value = profile[field];
    return value !== undefined && value !== null && String(value).trim() !== '';
  }).length;
  return (filled / PROFILE_COMPLETION_FIELDS.length) * 100;
};

const buildUserVector = ({ interestType, skillScores, profileContext, userContext, history, question }) => {
  const aptitude = clamp(toNumber(skillScores.aptitude_score), 0, 100);
  const communication = clamp(toNumber(skillScores.communication_score), 0, 100);
  const psychometric = clamp(toNumber(skillScores.psychometric_score), 0, 100);
  const weights = SCORE_WEIGHTS[interestType] || SCORE_WEIGHTS.tech;
  const weightedScore = (
    aptitude * weights.aptitude +
    communication * weights.communication +
    psychometric * weights.psychometric
  );

  const profile = profileContext && typeof profileContext === 'object' ? profileContext : {};

  const skills = normalizeList(profile.skills);
  const certifications = normalizeList(profile.certifications);
  const projects = normalizeList(profile.projects);
  const internships = normalizeList(profile.internships);
  const preferredRoles = normalizeList(profile.preferred_roles);
  const preferredLocations = normalizeList(profile.preferred_locations);
  const targetRole = String(profile.targetRole || profile.target_role || preferredRoles[0] || '').trim();
  const appliedRoleHistory = (history.appliedJobs || []).map((item) => item.job_role);
  const learnedTopics = [
    ...(history.courseAssignments || []).map((item) => item.course_name),
    ...(history.workshopAssignments || []).map((item) => item.title)
  ];

  const userTokens = tokenizeList([
    ...skills,
    ...certifications,
    ...projects,
    ...internships,
    ...preferredRoles,
    targetRole,
    profile.specialization,
    profile.objective,
    userContext.branch,
    question
  ]);

  const roleIntentTokens = tokenizeList([...preferredRoles, ...appliedRoleHistory, question]);
  const locationIntentTokens = tokenizeList(preferredLocations);
  const learningHistoryTokens = tokenizeList(learnedTopics);

  return {
    interestType: String(interestType || '').toLowerCase(),
    aptitude,
    communication,
    psychometric,
    weightedScore,
    profileCompletion: getProfileCompletion(profile),
    interestKeywords: INTEREST_KEYWORDS[interestType] || INTEREST_KEYWORDS.tech,
    userTokens,
    roleIntentTokens,
    locationIntentTokens,
    learningHistoryTokens,
    targetRole,
    preferredRoles,
    preferredLocations,
    profile
  };
};

const scoreJobCandidate = (job, userVector, semanticSignal = 0) => {
  const candidateTokens = tokenizeList([
    job.job_role,
    job.required_skills,
    job.company_name,
    job.location,
    job.job_type
  ]);

  const skillMatch = jaccardSimilarity(userVector.userTokens, candidateTokens);
  const interestMatch = keywordCoverage(candidateTokens, userVector.interestKeywords);
  const roleIntentMatch = jaccardSimilarity(userVector.roleIntentTokens, tokenizeText(job.job_role));
  const locationMatch = userVector.locationIntentTokens.length
    ? jaccardSimilarity(userVector.locationIntentTokens, tokenizeText(job.location))
    : 0.15;

  const packageBoost = clamp(toNumber(job.package_offered) / 20, 0, 1);
  const interestTypeMatch = String(job.interest_type || '').toLowerCase() === userVector.interestType ? 1 : 0;
  const interestBonus = interestTypeMatch * 0.05;
  const semanticMatch = clamp(toNumber(semanticSignal), 0, 1);

  const placementScore = (
    skillMatch * 0.26 +
    interestMatch * 0.16 +
    roleIntentMatch * 0.12 +
    locationMatch * 0.07 +
    (userVector.weightedScore / 100) * 0.14 +
    packageBoost * 0.05 +
    semanticMatch * 0.2 +
    interestBonus
  );

  const normalizedScore = clamp(placementScore, 0, 1) * 100;
  const type = isInternshipJob(job.job_type) ? 'internship' : 'placement';

  return {
    score: normalizedScore,
    type,
    item: {
      id: job.id,
      title: job.job_role,
      company: job.company_name,
      location: job.location,
      job_type: job.job_type,
      package: toNumber(job.package_offered),
      interest_type: job.interest_type,
      match_ratio: toRatio(normalizedScore),
      reason:
        `Skill match ${(skillMatch * 100).toFixed(0)}%, semantic match ${(semanticMatch * 100).toFixed(0)}%, interest alignment ${(interestMatch * 100).toFixed(0)}%, readiness ${userVector.weightedScore.toFixed(0)}%, track match ${(interestTypeMatch * 100).toFixed(0)}%.`
    }
  };
};

const getCourseRuleAdjustments = (course, userVector) => {
  const courseText = normalizeText(
    `${course.course_name} ${course.description} ${course.category} ${course.provider} ${course.level}`
  );
  const courseCategory = normalizeText(course.category);
  const courseProvider = normalizeText(course.provider);
  const targetRole = normalizeText(userVector.targetRole);

  let boost = 0;
  const notes = [];

  const weakInDsa = userVector.aptitude < 60;
  const isDsaCourse = courseCategory.includes('dsa') || courseText.includes('dsa') || courseText.includes('data structure');
  const isKnownDsaTrack = courseProvider.includes('striver') || courseProvider.includes('love babbar') || courseText.includes('a2z') || courseText.includes('sheet');
  if (weakInDsa && isDsaCourse && isKnownDsaTrack) {
    boost += 0.2;
    notes.push('Boosted for weak DSA with Striver/Love Babbar style track');
  }

  const lowAptitude = userVector.aptitude < 55;
  const isAptitudeCourse = courseCategory.includes('aptitude') || courseText.includes('aptitude') || courseText.includes('quant');
  if (lowAptitude && isAptitudeCourse) {
    boost += 0.18;
    notes.push('Boosted for low aptitude score');
  }

  const isBackendTrack = targetRole.includes('backend');
  const backendCourse =
    courseText.includes('node') ||
    courseText.includes('java') ||
    courseText.includes('backend') ||
    courseText.includes('system design');
  if (isBackendTrack && backendCourse) {
    boost += 0.2;
    notes.push('Boosted for backend target role');
  }

  return {
    boost: clamp(boost, 0, 0.28),
    notes
  };
};

const scoreCourseCandidate = (course, userVector, history, semanticSignal = 0) => {
  const candidateTokens = tokenizeList([
    course.course_name,
    course.description,
    course.level,
    course.category,
    course.provider
  ]);
  const skillMatch = jaccardSimilarity(userVector.userTokens, candidateTokens);
  const interestMatch = keywordCoverage(candidateTokens, userVector.interestKeywords);
  const semanticMatch = clamp(toNumber(semanticSignal), 0, 1);
  const levelTarget = getLevelTarget(userVector.weightedScore);
  const levelMatch = String(course.level || 'beginner').toLowerCase() === levelTarget ? 1 : 0.6;
  const durationFit = clamp(1 - (Math.abs(toNumber(course.duration_weeks, 4) - 8) / 20), 0, 1);

  const completedCourseTokens = tokenizeList(
    (history.courseAssignments || [])
      .filter((item) => toNumber(item.completion_percentage) >= 70)
      .map((item) => item.course_name)
  );
  const novelty = 1 - jaccardSimilarity(completedCourseTokens, tokenizeText(course.course_name));
  const ruleAdjustments = getCourseRuleAdjustments(course, userVector);

  const score = (
    skillMatch * 0.26 +
    interestMatch * 0.18 +
    semanticMatch * 0.24 +
    levelMatch * 0.16 +
    durationFit * 0.06 +
    novelty * 0.08 +
    (userVector.weightedScore / 100) * 0.02 +
    ruleAdjustments.boost
  );

  const normalizedScore = clamp(score, 0, 1) * 100;
  return {
    score: normalizedScore,
    item: {
      id: course.id,
      name: course.course_name,
      platform: course.provider || 'Placement Platform',
      level: course.level,
      category: course.category || 'General',
      link: course.course_link || null,
      duration_weeks: toNumber(course.duration_weeks, 0),
      match_ratio: toRatio(normalizedScore),
      reason:
        `Mapped to your ${levelTarget} readiness with ${(skillMatch * 100).toFixed(0)}% topic overlap, ${(semanticMatch * 100).toFixed(0)}% semantic relevance, and ${(novelty * 100).toFixed(0)}% novelty.${ruleAdjustments.notes.length ? ` ${ruleAdjustments.notes.join('; ')}.` : ''}`
    }
  };
};

const scoreWorkshopCandidate = (workshop, userVector, history, semanticSignal = 0) => {
  const candidateTokens = tokenizeList([workshop.title, workshop.description, workshop.mode]);
  const skillMatch = jaccardSimilarity(userVector.userTokens, candidateTokens);
  const interestMatch = keywordCoverage(candidateTokens, userVector.interestKeywords);
  const semanticMatch = clamp(toNumber(semanticSignal), 0, 1);

  const completedWorkshopTokens = tokenizeList(
    (history.workshopAssignments || [])
      .filter((item) => toNumber(item.completion_percentage) >= 70)
      .map((item) => item.title)
  );
  const novelty = 1 - jaccardSimilarity(completedWorkshopTokens, tokenizeText(workshop.title));

  const score = (
    skillMatch * 0.28 +
    interestMatch * 0.2 +
    semanticMatch * 0.24 +
    novelty * 0.12 +
    (userVector.communication / 100) * 0.08 +
    (userVector.psychometric / 100) * 0.08
  );

  const normalizedScore = clamp(score, 0, 1) * 100;
  return {
    score: normalizedScore,
    item: {
      id: workshop.id,
      title: workshop.title,
      type: 'workshop',
      mode: workshop.mode,
      duration_hours: toNumber(workshop.duration_hours, 0),
      match_ratio: toRatio(normalizedScore),
      reason:
        `Recommended for communication and execution growth with ${(interestMatch * 100).toFixed(0)}% interest alignment and ${(semanticMatch * 100).toFixed(0)}% semantic relevance.`
    }
  };
};

const topN = (items, limit = 3) => items.sort((a, b) => b.score - a.score).slice(0, limit);

const mergeWithFallback = (primary, fallback, limit = 3, keySelector = (item) => JSON.stringify(item)) => {
  const unique = new Map();
  [...(primary || []), ...(fallback || [])].forEach((item) => {
    const key = keySelector(item);
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  });
  return Array.from(unique.values()).slice(0, limit);
};

const getFallbackCatalog = (interestType) => {
  return DEFAULT_RECOMMENDATION_CATALOG[interestType] || DEFAULT_RECOMMENDATION_CATALOG.tech;
};

const buildSkillGapAnalysis = ({ userVector, topPlacementRecommendations, topCourseRecommendations }) => {
  const baselineGaps = [
    {
      skill: 'Problem Solving',
      value: userVector.aptitude,
      action: 'Solve 5 aptitude/coding sets every week and track speed with timed mocks.'
    },
    {
      skill: 'Communication',
      value: userVector.communication,
      action: 'Practice structured answers for HR/behavioral rounds and weekly speaking drills.'
    },
    {
      skill: 'Decision Making',
      value: userVector.psychometric,
      action: 'Use case-study style scenarios and post-analysis reflection for interview confidence.'
    }
  ];

  const roleTokens = tokenizeList(topPlacementRecommendations.map((item) => item.title));
  const courseTokens = tokenizeList(topCourseRecommendations.map((item) => item.name));
  const missing = roleTokens
    .filter((token) => !userVector.userTokens.includes(token))
    .filter((token) => !STOP_WORDS.has(token) && token.length > 2);

  if (missing.length > 0) {
    baselineGaps[0] = {
      skill: missing[0][0].toUpperCase() + missing[0].slice(1),
      value: average([userVector.aptitude, userVector.communication]),
      action: `Bridge this gap using practical projects and a focused module from ${topCourseRecommendations[0]?.name || 'recommended courses'}.`
    };
  }

  return baselineGaps.map((gap) => ({
    skill: gap.skill,
    current_level: mapScoreBand(gap.value),
    target_level: gap.value >= 80 ? 'Expert' : gap.value >= 60 ? 'Advanced' : 'Intermediate',
    action: gap.action + (courseTokens.length ? ' Include weekly revision checkpoints.' : '')
  }));
};

const buildInterviewPlan = (userVector) => {
  const weakest = [
    { key: 'aptitude', value: userVector.aptitude },
    { key: 'communication', value: userVector.communication },
    { key: 'psychometric', value: userVector.psychometric }
  ].sort((a, b) => a.value - b.value)[0];

  const weaknessAction = weakest.key === 'aptitude'
    ? 'Daily timed aptitude/problem-solving drills with section-wise tracking.'
    : weakest.key === 'communication'
      ? 'Daily mock HR answers, elevator pitch, and peer feedback practice.'
      : 'Case-based situational judgment practice and decision explanation drills.';

  return [
    {
      phase: 'Weeks 1-2',
      focus: 'Foundation and resume targeting',
      action: 'Finalize role-specific resume, shortlist 20 companies, and align projects with JD keywords.'
    },
    {
      phase: 'Weeks 3-4',
      focus: 'Mock rounds and weak-area repair',
      action: weaknessAction
    },
    {
      phase: 'Weeks 5-6',
      focus: 'Placement sprint execution',
      action: 'Run full mock interviews, apply in batches, and do post-interview retrospective updates.'
    }
  ];
};

const buildCertifications = (interestType, topCourseRecommendations) => {
  const defaults = {
    tech: [
      { name: 'AWS Cloud Practitioner', provider: 'AWS' },
      { name: 'Google Data Analytics', provider: 'Google' },
      { name: 'Meta Front-End Developer', provider: 'Meta/Coursera' }
    ],
    private: [
      { name: 'Business Analysis Fundamentals', provider: 'IIBA/Udemy' },
      { name: 'Financial Markets', provider: 'Yale/Coursera' },
      { name: 'Project Management Foundations', provider: 'PMI/LinkedIn Learning' }
    ],
    govt: [
      { name: 'Government Exam Strategy Program', provider: 'Testbook' },
      { name: 'Quantitative Aptitude Professional', provider: 'NPTEL' },
      { name: 'Public Policy Basics', provider: 'SWAYAM' }
    ],
    'non-tech': [
      { name: 'HR Analytics Certificate', provider: 'Coursera' },
      { name: 'Digital Marketing Associate', provider: 'Meta' },
      { name: 'Operations Excellence', provider: 'edX' }
    ]
  };

  const picks = defaults[interestType] || defaults.tech;
  return picks.map((item, index) => ({
    ...item,
    reason: `Supports ${(topCourseRecommendations[index]?.name || 'your current learning path')} and improves interview credibility.`
  }));
};

const buildHigherEducationSuggestions = (interestType, weightedScore) => {
  const readyForMasters = weightedScore >= 70;
  const tracks = {
    tech: ['M.Tech in AI/DS', 'MS in Computer Science', 'PG Diploma in Data Engineering'],
    private: ['MBA (Business Analytics)', 'PGDM (Operations)', 'M.Com/Finance Analytics'],
    govt: ['Master of Public Administration', 'Public Policy Program', 'MBA (Government and Public Systems)'],
    'non-tech': ['MBA (HR/Marketing)', 'MA in Communication', 'PG Program in People Analytics']
  };

  return (tracks[interestType] || tracks.tech).map((program) => ({
    program,
    reason: readyForMasters
      ? 'Your current readiness supports progression into higher specialization.'
      : 'Build 4-6 months of core skills first, then this track becomes high-impact.'
  }));
};

const buildStartupIdeas = (interestType, userVector) => {
  const ideasByInterest = {
    tech: ['Campus Interview Prep SaaS', 'Micro-LMS for Skill Drills', 'AI Resume Optimization Studio'],
    private: ['SME Hiring Operations Service', 'Sales Enablement Analytics', 'Local Business Process Consulting'],
    govt: ['Exam Preparation Mentorship Hub', 'Public Services Guidance Platform', 'Civic Data Awareness Startup'],
    'non-tech': ['HR Outsourcing Studio', 'Communication Coaching Hub', 'Community Skill Center']
  };

  return (ideasByInterest[interestType] || ideasByInterest.tech).map((idea) => ({
    idea,
    reason: `Matches your profile strength (${mapScoreBand(userVector.weightedScore)}) and current career interest.`
  }));
};

const buildCompanyTargets = (interestType, weightedScore) => {
  const confidence = weightedScore >= 75 ? 'high' : weightedScore >= 60 ? 'moderate' : 'developing';
  const targetMap = {
    tech: [
      { company_type: 'Product startups', role_focus: 'Software/Data roles' },
      { company_type: 'IT service firms', role_focus: 'Graduate engineer roles' },
      { company_type: 'Mid-size SaaS firms', role_focus: 'Developer + support engineering' }
    ],
    private: [
      { company_type: 'Consulting firms', role_focus: 'Analyst roles' },
      { company_type: 'Operations-led enterprises', role_focus: 'Business operations' },
      { company_type: 'Finance and sales organizations', role_focus: 'Management trainee' }
    ],
    govt: [
      { company_type: 'Public sector banks', role_focus: 'Officer trainee paths' },
      { company_type: 'Government-backed enterprises', role_focus: 'Administrative/operations roles' },
      { company_type: 'Public programs and missions', role_focus: 'Project assistant roles' }
    ],
    'non-tech': [
      { company_type: 'People operations teams', role_focus: 'HR associate' },
      { company_type: 'Support and service organizations', role_focus: 'Operations/support specialist' },
      { company_type: 'Training and education firms', role_focus: 'Content/training associate' }
    ]
  };

  return (targetMap[interestType] || targetMap.tech).map((item) => ({
    ...item,
    reason: `Current readiness is ${confidence}; target these companies with staged applications and mock preparation.`
  }));
};

const computePlacementProbability = ({
  userVector,
  courseHistory,
  workshopHistory,
  topPlacementScore
}) => {
  const courseCompletionAvg = average(courseHistory.map((item) => toNumber(item.completion_percentage, 0)));
  const workshopCompletionAvg = average(workshopHistory.map((item) => toNumber(item.completion_percentage, 0)));

  const readiness = (
    userVector.weightedScore * 0.48 +
    userVector.profileCompletion * 0.2 +
    courseCompletionAvg * 0.14 +
    workshopCompletionAvg * 0.08 +
    topPlacementScore * 0.1
  );

  const next3 = clamp(readiness * 0.78 + 8, 15, 95);
  const next6 = clamp(next3 + 8 + courseCompletionAvg * 0.08, next3, 98);

  const reason = `Readiness is driven by score profile ${userVector.weightedScore.toFixed(1)}%, profile completion ${userVector.profileCompletion.toFixed(1)}%, and top placement fit ${topPlacementScore.toFixed(1)}%.`;

  return {
    next_3_months: toPercent(next3),
    next_6_months: toPercent(next6),
    reason
  };
};

const buildProfileSummary = ({ userContext, userEducation, interestType, userVector, question }) => {
  const questionText = question
    ? ` The current query focus is: "${question}".`
    : '';
  return `${userContext.name || 'Student'} (${userEducation}, ${interestType}) has weighted readiness ${userVector.weightedScore.toFixed(1)}% with profile completion ${userVector.profileCompletion.toFixed(1)}%. Recommendations prioritize practical placement conversion through targeted courses, trainings, and role-matched opportunities.${questionText}`;
};

const generateMlRecommendations = ({
  userEducation,
  interestType,
  skillScores,
  profileContext,
  userContext,
  question,
  datasets,
  history,
  ragContext
}) => {
  const jobs = datasets.jobs || [];
  const courses = datasets.courses || [];
  const workshops = datasets.workshops || [];
  const userHistory = history || { appliedJobs: [], courseAssignments: [], workshopAssignments: [] };
  const semanticScores = ragContext?.semanticScores || { jobs: {}, courses: {}, workshops: {} };
  const retrievalContext = ragContext?.retrieval || {
    enabled: false,
    strategy: 'none',
    indexed_documents: jobs.length + courses.length + workshops.length,
    embedded_documents: 0,
    matched_documents: 0,
    top_contexts: []
  };

  const userVector = buildUserVector({
    interestType,
    skillScores,
    profileContext,
    userContext,
    history: userHistory,
    question
  });

  const scoredJobs = topN(
    jobs.map((job) => scoreJobCandidate(job, userVector, semanticScores.jobs?.[job.id] || 0)),
    jobs.length || 0
  );
  const internshipCandidates = topN(scoredJobs.filter((entry) => entry.type === 'internship'));
  const placementCandidates = topN(scoredJobs.filter((entry) => entry.type === 'placement'));

  const fallbackInternships = internshipCandidates.length > 0
    ? internshipCandidates
    : placementCandidates.slice(0, 3).map((entry) => ({
      ...entry,
      item: {
        ...entry.item,
        reason: `${entry.item.reason} No dedicated internship posting matched; this role is closest to entry-level transition.`
      }
    }));

  const scoredCourses = topN(
    courses.map((course) => scoreCourseCandidate(course, userVector, userHistory, semanticScores.courses?.[course.id] || 0)),
    courses.length || 0
  );
  const scoredWorkshops = topN(
    workshops.map((workshop) => scoreWorkshopCandidate(workshop, userVector, userHistory, semanticScores.workshops?.[workshop.id] || 0)),
    workshops.length || 0
  );
  const fallbackCatalog = getFallbackCatalog(interestType);

  const derivedTrainingRecommendations = [
    ...scoredCourses.slice(0, 2).map((entry) => ({
      title: entry.item.name,
      type: 'course',
      duration: `${entry.item.duration_weeks} weeks`,
      match_ratio: entry.item.match_ratio,
      reason: entry.item.reason
    })),
    ...scoredWorkshops.slice(0, 2).map((entry) => ({
      title: entry.item.title,
      type: 'workshop',
      duration: `${entry.item.duration_hours || 2} hours`,
      match_ratio: entry.item.match_ratio,
      reason: entry.item.reason
    }))
  ].slice(0, 3);

  const topPlacementRecommendations = mergeWithFallback(
    placementCandidates.slice(0, 3).map((entry) => entry.item),
    fallbackCatalog.placements,
    3,
    (item) => `${item.title}-${item.company}`
  );
  const topCourseRecommendations = mergeWithFallback(
    scoredCourses.slice(0, 3).map((entry) => entry.item),
    [],
    3,
    (item) => `${item.name}-${item.platform}-${item.category || 'general'}`
  );
  const topInternshipRecommendations = mergeWithFallback(
    fallbackInternships.slice(0, 3).map((entry) => entry.item),
    fallbackCatalog.internships,
    3,
    (item) => `${item.title}-${item.company}`
  );
  const trainingRecommendations = mergeWithFallback(
    derivedTrainingRecommendations,
    fallbackCatalog.trainings,
    3,
    (item) => `${item.title}-${item.type}`
  );

  const topJobRecommendations = [
    ...topPlacementRecommendations,
    ...topInternshipRecommendations
  ].slice(0, 3);

  const placementProbability = computePlacementProbability({
    userVector,
    courseHistory: userHistory.courseAssignments || [],
    workshopHistory: userHistory.workshopAssignments || [],
    topPlacementScore: placementCandidates[0]?.score || 35
  });

  const skillGapAnalysis = buildSkillGapAnalysis({
    userVector,
    topPlacementRecommendations,
    topCourseRecommendations
  });

  return {
    ml_model: {
      name: 'Adaptive Hybrid Career Ranker v2 (RAG)',
      approach: 'Hybrid ranking using profile scores, engagement history, and retrieval-augmented semantic similarity',
      data_points: {
        jobs_indexed: jobs.length,
        courses_indexed: courses.length,
        workshops_indexed: workshops.length,
        historical_applications: userHistory.appliedJobs?.length || 0,
        historical_course_assignments: userHistory.courseAssignments?.length || 0,
        historical_workshop_assignments: userHistory.workshopAssignments?.length || 0,
        rag_documents_indexed: retrievalContext.indexed_documents || 0,
        rag_documents_embedded: retrievalContext.embedded_documents || 0,
        rag_strategy: retrievalContext.strategy || 'none'
      }
    },
    job_recommendation: topJobRecommendations.map((item) => ({
      title: `${item.title} (${item.company})`,
      match_ratio: item.match_ratio || 'N/A',
      reason: item.reason
    })),
    course_recommendation: topCourseRecommendations.map((item) => ({
      name: item.name,
      platform: item.platform,
      category: item.category,
      link: item.link,
      match_ratio: item.match_ratio || 'N/A',
      reason: item.reason
    })),
    internship_recommendation: topInternshipRecommendations.map((item) => ({
      title: item.title,
      company: item.company,
      location: item.location,
      match_ratio: item.match_ratio || 'N/A',
      reason: item.reason
    })),
    placement_recommendation: topPlacementRecommendations.map((item) => ({
      title: item.title,
      company: item.company,
      location: item.location,
      package: item.package,
      match_ratio: item.match_ratio || 'N/A',
      reason: item.reason
    })),
    training_recommendation: trainingRecommendations,
    startup_idea_suggestion: buildStartupIdeas(interestType, userVector),
    higher_education_suggestion: buildHigherEducationSuggestions(interestType, userVector.weightedScore),
    certification_recommendation: buildCertifications(interestType, topCourseRecommendations),
    interview_preparation_plan: buildInterviewPlan(userVector),
    company_target_suggestion: buildCompanyTargets(interestType, userVector.weightedScore),
    skill_gap_analysis: skillGapAnalysis,
    placement_probability: placementProbability,
    profile_summary: buildProfileSummary({
      userContext,
      userEducation,
      interestType,
      userVector,
      question
    }),
    retrieval_context: retrievalContext,
    assistant_answer: ''
  };
};

module.exports = {
  generateMlRecommendations
};
