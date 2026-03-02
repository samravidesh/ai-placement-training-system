const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getStrengthLabel = (percentage) => {
  if (percentage <= 40) {
    return 'Beginner';
  }
  if (percentage <= 70) {
    return 'Intermediate';
  }
  return 'Strong';
};

const calculateProfileCompletion = ({ user, profileRecord, assessment }) => {
  const sectionWeight = 20;
  const profile = profileRecord?.profile && typeof profileRecord.profile === 'object'
    ? profileRecord.profile
    : {};

  const basicInfo = profile.basicInfo && typeof profile.basicInfo === 'object'
    ? profile.basicInfo
    : {};

  const basicInfoFields = [
    basicInfo.full_name || user?.name,
    basicInfo.phone || profile.phone,
    basicInfo.education_level || user?.education_level || profile.education_level || profile.course_name,
    basicInfo.branch || user?.branch || profile.branch,
    basicInfo.city || profile.city
  ];
  const basicInfoCompletion = basicInfoFields.filter((item) => String(item || '').trim() !== '').length / basicInfoFields.length;

  const skillsList = normalizeList(profile.skills || profile.skills_list);
  const skillsCompletion = clamp(skillsList.length / 4, 0, 1);

  const resumeLink = profile.resume || profile.resume_url;
  const resumeCompletion = String(resumeLink || '').trim() ? 1 : 0;

  const aptitudeScore = toNumber(assessment?.aptitude_score || profile.aptitudeScore || profile.aptitude_score);
  const aptitudeCompletion = aptitudeScore > 0 ? 1 : 0;

  const targetRole = profile.targetRole || profile.target_role || normalizeList(profile.preferred_roles)[0] || '';
  const targetRoleCompletion = String(targetRole || '').trim() ? 1 : 0;

  const sections = {
    basicInfo: {
      weight: sectionWeight,
      earned: Number((basicInfoCompletion * sectionWeight).toFixed(2)),
      completed: basicInfoCompletion >= 0.99
    },
    skills: {
      weight: sectionWeight,
      earned: Number((skillsCompletion * sectionWeight).toFixed(2)),
      completed: skillsCompletion >= 0.99
    },
    resume: {
      weight: sectionWeight,
      earned: Number((resumeCompletion * sectionWeight).toFixed(2)),
      completed: resumeCompletion >= 0.99
    },
    aptitudeScore: {
      weight: sectionWeight,
      earned: Number((aptitudeCompletion * sectionWeight).toFixed(2)),
      completed: aptitudeCompletion >= 0.99
    },
    targetRole: {
      weight: sectionWeight,
      earned: Number((targetRoleCompletion * sectionWeight).toFixed(2)),
      completed: targetRoleCompletion >= 0.99
    }
  };

  const percentage = Number(
    Object.values(sections)
      .reduce((sum, section) => sum + section.earned, 0)
      .toFixed(2)
  );

  return {
    percentage,
    strength_label: getStrengthLabel(percentage),
    sections,
    profile_snapshot: {
      target_role: targetRole || null,
      aptitude_score: aptitudeScore || null,
      skills_count: skillsList.length,
      has_resume: Boolean(resumeCompletion),
      has_basic_info: basicInfoCompletion >= 0.99
    }
  };
};

module.exports = {
  calculateProfileCompletion,
  getStrengthLabel
};
