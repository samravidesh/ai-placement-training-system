const { ai: aiConfig } = require('../config/env');

const safeString = (value) => String(value || '').trim();
const isEligibilityQuestion = (question) => /eligib|eligible|qualif|fit for|am i fit|can i apply/i.test(safeString(question));

const summarizeList = (items, formatter) => {
  if (!Array.isArray(items) || items.length === 0) {
    return 'None';
  }
  return items.slice(0, 3).map(formatter).join('; ');
};

const buildAssistantPrompt = ({
  question,
  userEducation,
  interestType,
  skillScores,
  userContext,
  recommendations,
  retrievalContext
}) => {
  const safeQuestion = safeString(question) || 'Provide a practical action plan for the next month.';
  const eligibilityMode = isEligibilityQuestion(safeQuestion);

  const placementText = summarizeList(
    recommendations.placement_recommendation,
    (item) => `${item.title} at ${item.company}`
  );
  const internshipText = summarizeList(
    recommendations.internship_recommendation,
    (item) => `${item.title} at ${item.company}`
  );
  const courseText = summarizeList(
    recommendations.course_recommendation,
    (item) => `${item.name} (${item.platform})`
  );
  const trainingText = summarizeList(
    recommendations.training_recommendation,
    (item) => `${item.title} [${item.type}]`
  );
  const retrievalText = summarizeList(
    retrievalContext?.top_contexts || recommendations?.retrieval_context?.top_contexts || [],
    (item) => `${item.type}:${item.title} (${item.relevance_score}) ${safeString(item.snippet)}`
  );

  return `You are an expert placement and training assistant. Use the supplied ML recommendation output and retrieved context to answer the user directly.

Constraints:
- Response must be plain text only.
- Maximum 140 words.
- Give concrete actions for next 7 and 30 days.
- Mention at least one placement role and one course/training.
- Keep tone practical and specific.
${eligibilityMode ? '- User asked eligibility. State eligible/not-ready with concise evidence from retrieved context.' : ''}
${eligibilityMode ? '- If context is insufficient, explicitly say eligibility cannot be confirmed from available data.' : ''}

User snapshot:
- Name: ${safeString(userContext.name) || 'Student'}
- Education: ${safeString(userEducation)}
- Branch: ${safeString(userContext.branch)}
- Interest type: ${safeString(interestType)}
- Scores: aptitude ${safeString(skillScores.aptitude_score)}, communication ${safeString(skillScores.communication_score)}, psychometric ${safeString(skillScores.psychometric_score)}
- Placement probability: 3 months ${safeString(recommendations.placement_probability?.next_3_months)}, 6 months ${safeString(recommendations.placement_probability?.next_6_months)}

Top ML picks:
- Placements: ${placementText}
- Internships: ${internshipText}
- Courses: ${courseText}
- Trainings: ${trainingText}

Retrieved context for grounding:
- ${retrievalText}

User question:
${safeQuestion}`;
};

const callOpenAIForAnswer = async (prompt) => {
  if (!aiConfig.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiConfig.openaiApiKey}`
    },
    body: JSON.stringify({
      model: aiConfig.openaiModel,
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You provide concise and actionable career guidance.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI API returned empty content');
  }
  return safeString(content);
};

const callGeminiForAnswer = async (prompt) => {
  if (!aiConfig.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.geminiModel}:generateContent?key=${aiConfig.geminiApiKey}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error('Gemini API returned empty content');
  }
  return safeString(content);
};

const buildFallbackAnswer = ({ question, recommendations }) => {
  const placement = recommendations.placement_recommendation?.[0];
  const course = recommendations.course_recommendation?.[0];
  const training = recommendations.training_recommendation?.[0];
  const safeQuestion = safeString(question);

  const intro = safeQuestion
    ? `For your question "${safeQuestion}", prioritize execution in two tracks:`
    : 'Focus on execution in two tracks:';

  return `${intro} placement readiness and skill acceleration. In the next 7 days, apply to ${placement?.title || 'top matched roles'} and complete one module from ${course?.name || training?.title || 'recommended training'}. In the next 30 days, finish mock interviews, complete at least one certification, and track weekly progress against your placement probability milestones.`;
};

const generateAssistantAnswer = async ({
  question,
  userEducation,
  interestType,
  skillScores,
  userContext,
  recommendations,
  retrievalContext
}) => {
  const prompt = buildAssistantPrompt({
    question,
    userEducation,
    interestType,
    skillScores,
    userContext,
    recommendations,
    retrievalContext
  });

  const provider = String(aiConfig.provider || '').toLowerCase();
  if (provider === 'gemini') {
    return callGeminiForAnswer(prompt);
  }
  return callOpenAIForAnswer(prompt);
};

module.exports = {
  generateAssistantAnswer,
  buildFallbackAnswer
};
