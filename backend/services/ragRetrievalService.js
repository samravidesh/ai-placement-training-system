const crypto = require('crypto');
const { ai: aiConfig, rag: ragConfig } = require('../config/env');
const { listVectorsByKeys, upsertVectorDocument, getVectorIndexSummary } = require('../models/vectorStoreModel');

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'or', 'the', 'to', 'for', 'of', 'in', 'on', 'with', 'is', 'are', 'from',
  'at', 'by', 'be', 'as', 'this', 'that', 'it', 'your', 'you', 'will', 'we', 'our', 'their'
]);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const safeString = (value) => String(value || '').trim();
const toDocumentKey = (documentType, sourceId) => `${documentType}:${sourceId}`;

const normalizeList = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => safeString(item)).filter(Boolean);
  }
  return safeString(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const tokenize = (value) => {
  return safeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
};

const jaccardSimilarity = (leftText, rightText) => {
  const leftSet = new Set(tokenize(leftText));
  const rightSet = new Set(tokenize(rightText));
  if (leftSet.size === 0 || rightSet.size === 0) {
    return 0;
  }

  let overlap = 0;
  leftSet.forEach((token) => {
    if (rightSet.has(token)) {
      overlap += 1;
    }
  });

  const union = leftSet.size + rightSet.size - overlap;
  return union === 0 ? 0 : overlap / union;
};

const cosineSimilarity = (left, right) => {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || left.length === 0) {
    return 0;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let i = 0; i < left.length; i += 1) {
    const l = Number(left[i]) || 0;
    const r = Number(right[i]) || 0;
    dot += l * r;
    leftNorm += l * l;
    rightNorm += r * r;
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
};

const hashText = (value) => {
  return crypto.createHash('sha256').update(safeString(value)).digest('hex');
};

const parseEmbedding = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (!value) {
    return null;
  }
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
};

const toJobDocument = (job) => {
  const content = [
    `Role: ${safeString(job.job_role)}`,
    `Company: ${safeString(job.company_name)}`,
    `Type: ${safeString(job.job_type)}`,
    `Skills: ${safeString(job.required_skills)}`,
    `Location: ${safeString(job.location)}`,
    `Interest Track: ${safeString(job.interest_type)}`,
    `Package LPA: ${safeString(job.package_offered)}`
  ].join('\n');

  return {
    documentKey: toDocumentKey('job', job.id),
    documentType: 'job',
    sourceId: Number(job.id),
    interestType: safeString(job.interest_type) || null,
    title: safeString(job.job_role) || `Job ${job.id}`,
    content,
    metadata: {
      company_name: safeString(job.company_name),
      job_type: safeString(job.job_type),
      location: safeString(job.location)
    },
    contentHash: hashText(content)
  };
};

const toCourseDocument = (course) => {
  const content = [
    `Course: ${safeString(course.course_name)}`,
    `Provider: ${safeString(course.provider)}`,
    `Category: ${safeString(course.category)}`,
    `Level: ${safeString(course.level)}`,
    `Duration Weeks: ${safeString(course.duration_weeks)}`,
    `Description: ${safeString(course.description)}`,
    `Link: ${safeString(course.course_link)}`
  ].join('\n');

  return {
    documentKey: toDocumentKey('course', course.id),
    documentType: 'course',
    sourceId: Number(course.id),
    interestType: null,
    title: safeString(course.course_name) || `Course ${course.id}`,
    content,
    metadata: {
      provider: safeString(course.provider),
      category: safeString(course.category),
      level: safeString(course.level),
      duration_weeks: Number(course.duration_weeks) || 0,
      course_link: safeString(course.course_link)
    },
    contentHash: hashText(content)
  };
};

const toWorkshopDocument = (workshop) => {
  const content = [
    `Workshop: ${safeString(workshop.title)}`,
    `Mode: ${safeString(workshop.mode)}`,
    `Duration Hours: ${safeString(workshop.duration_hours)}`,
    `Scheduled Date: ${safeString(workshop.scheduled_date)}`,
    `Description: ${safeString(workshop.description)}`
  ].join('\n');

  return {
    documentKey: toDocumentKey('workshop', workshop.id),
    documentType: 'workshop',
    sourceId: Number(workshop.id),
    interestType: null,
    title: safeString(workshop.title) || `Workshop ${workshop.id}`,
    content,
    metadata: {
      mode: safeString(workshop.mode),
      duration_hours: Number(workshop.duration_hours) || 0
    },
    contentHash: hashText(content)
  };
};

const buildDocuments = ({ jobs, courses, workshops }) => [
  ...(jobs || []).map(toJobDocument),
  ...(courses || []).map(toCourseDocument),
  ...(workshops || []).map(toWorkshopDocument)
];

const buildUserQueryText = ({
  question,
  interestType,
  userEducation,
  skillScores,
  profileContext,
  userContext
}) => {
  const profile = profileContext && typeof profileContext === 'object' ? profileContext : {};
  const skills = normalizeList(profile.skills).join(', ');
  const certifications = normalizeList(profile.certifications).join(', ');
  const projects = normalizeList(profile.projects).join(', ');
  const preferredRoles = normalizeList(profile.preferred_roles).join(', ');
  const preferredLocations = normalizeList(profile.preferred_locations).join(', ');

  return [
    `Question: ${safeString(question) || 'Best career opportunities for my profile.'}`,
    `Interest Type: ${safeString(interestType)}`,
    `Education: ${safeString(userEducation || userContext?.education_level)}`,
    `Branch: ${safeString(userContext?.branch)}`,
    `Aptitude Score: ${safeString(skillScores?.aptitude_score)}`,
    `Communication Score: ${safeString(skillScores?.communication_score)}`,
    `Psychometric Score: ${safeString(skillScores?.psychometric_score)}`,
    `Skills: ${skills}`,
    `Certifications: ${certifications}`,
    `Projects: ${projects}`,
    `Preferred Roles: ${preferredRoles}`,
    `Preferred Locations: ${preferredLocations}`,
    `Specialization: ${safeString(profile.specialization)}`,
    `Objective: ${safeString(profile.objective)}`
  ].join('\n');
};

const fetchOpenAIEmbeddings = async (inputs) => {
  if (!aiConfig.openaiApiKey || !Array.isArray(inputs) || inputs.length === 0) {
    return [];
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiConfig.openaiApiKey}`
    },
    body: JSON.stringify({
      model: ragConfig.openaiEmbeddingModel,
      input: inputs
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI embeddings error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return Array.isArray(data.data) ? data.data.map((item) => item.embedding) : [];
};

const batchFetchEmbeddings = async (inputs, batchSize = 32) => {
  const vectors = new Array(inputs.length).fill(null);
  for (let start = 0; start < inputs.length; start += batchSize) {
    const end = Math.min(start + batchSize, inputs.length);
    const batch = inputs.slice(start, end);
    const batchVectors = await fetchOpenAIEmbeddings(batch);
    batchVectors.forEach((vector, index) => {
      vectors[start + index] = Array.isArray(vector) ? vector : null;
    });
  }
  return vectors;
};

const shouldSyncDocument = ({ row, doc, force }) => {
  if (force) {
    return true;
  }
  if (!row) {
    return true;
  }
  return row.content_hash !== doc.contentHash || row.embedding_model !== ragConfig.openaiEmbeddingModel;
};

const syncVectorDocuments = async (documents, { syncMissing = false, force = false } = {}) => {
  if (!documents.length) {
    return {
      embeddingsByKey: {},
      stats: {
        indexedDocuments: 0,
        syncedDocuments: 0,
        embeddingsGenerated: 0,
        reusedEmbeddings: 0,
        skippedWithoutEmbeddingApi: 0
      }
    };
  }

  let existingRows = [];
  try {
    existingRows = await listVectorsByKeys(documents.map((doc) => doc.documentKey));
  } catch (_error) {
    existingRows = [];
  }

  const existingMap = new Map(existingRows.map((row) => [row.document_key, row]));
  const embeddingsByKey = {};
  let reusedEmbeddings = 0;

  documents.forEach((doc) => {
    const embedding = parseEmbedding(existingMap.get(doc.documentKey)?.embedding);
    if (Array.isArray(embedding) && embedding.length > 0) {
      embeddingsByKey[doc.documentKey] = embedding;
      reusedEmbeddings += 1;
    }
  });

  if (!syncMissing) {
    return {
      embeddingsByKey,
      stats: {
        indexedDocuments: documents.length,
        syncedDocuments: 0,
        embeddingsGenerated: 0,
        reusedEmbeddings,
        skippedWithoutEmbeddingApi: 0
      }
    };
  }

  const documentsToSync = documents.filter((doc) => {
    const row = existingMap.get(doc.documentKey);
    return shouldSyncDocument({ row, doc, force });
  });

  const canGenerateEmbeddings = Boolean(ragConfig.enabled && aiConfig.openaiApiKey);
  let generatedVectors = new Array(documentsToSync.length).fill(null);
  let embeddingsGenerated = 0;
  let skippedWithoutEmbeddingApi = 0;

  if (documentsToSync.length > 0) {
    if (canGenerateEmbeddings) {
      try {
        generatedVectors = await batchFetchEmbeddings(documentsToSync.map((doc) => doc.content));
      } catch (_embeddingError) {
        generatedVectors = new Array(documentsToSync.length).fill(null);
      }
    } else {
      skippedWithoutEmbeddingApi = documentsToSync.length;
    }
  }

  await Promise.allSettled(
    documentsToSync.map((doc, index) => {
      const existingRow = existingMap.get(doc.documentKey);
      const existingEmbedding = parseEmbedding(existingRow?.embedding);
      const generatedVector = Array.isArray(generatedVectors[index]) ? generatedVectors[index] : null;
      const vectorToPersist = generatedVector || existingEmbedding || null;

      if (generatedVector) {
        embeddingsByKey[doc.documentKey] = generatedVector;
        embeddingsGenerated += 1;
      } else if (Array.isArray(existingEmbedding) && existingEmbedding.length > 0) {
        embeddingsByKey[doc.documentKey] = existingEmbedding;
      }

      return upsertVectorDocument({
        documentKey: doc.documentKey,
        documentType: doc.documentType,
        sourceId: doc.sourceId,
        interestType: doc.interestType,
        title: doc.title,
        content: doc.content,
        metadata: doc.metadata,
        embeddingModel: ragConfig.openaiEmbeddingModel,
        embedding: vectorToPersist,
        contentHash: doc.contentHash
      });
    })
  );

  return {
    embeddingsByKey,
    stats: {
      indexedDocuments: documents.length,
      syncedDocuments: documentsToSync.length,
      embeddingsGenerated,
      reusedEmbeddings,
      skippedWithoutEmbeddingApi
    }
  };
};

const buildRagContext = async ({
  jobs,
  courses,
  workshops,
  question,
  interestType,
  userEducation,
  skillScores,
  profileContext,
  userContext
}) => {
  const emptyScores = { jobs: {}, courses: {}, workshops: {} };
  const documents = buildDocuments({ jobs, courses, workshops });

  if (documents.length === 0) {
    return {
      semanticScores: emptyScores,
      retrieval: {
        enabled: false,
        strategy: 'none',
        indexed_documents: 0,
        embedded_documents: 0,
        matched_documents: 0,
        top_contexts: []
      }
    };
  }

  const { embeddingsByKey, stats } = await syncVectorDocuments(documents, {
    syncMissing: ragConfig.syncOnRequest
  });

  const queryText = buildUserQueryText({
    question,
    interestType,
    userEducation,
    skillScores,
    profileContext,
    userContext
  });

  const hasAnyDocumentEmbedding = documents.some((doc) => Array.isArray(embeddingsByKey[doc.documentKey]));
  const canUseQueryEmbedding = Boolean(ragConfig.enabled && aiConfig.openaiApiKey && hasAnyDocumentEmbedding);

  let queryEmbedding = null;
  if (canUseQueryEmbedding) {
    try {
      const queryVectors = await fetchOpenAIEmbeddings([queryText]);
      queryEmbedding = Array.isArray(queryVectors[0]) ? queryVectors[0] : null;
    } catch (_error) {
      queryEmbedding = null;
    }
  }

  const semanticScores = { jobs: {}, courses: {}, workshops: {} };
  const scoredContexts = [];

  documents.forEach((doc) => {
    const documentEmbedding = embeddingsByKey[doc.documentKey];
    const lexical = jaccardSimilarity(queryText, doc.content);
    const semantic = queryEmbedding && Array.isArray(documentEmbedding)
      ? clamp(cosineSimilarity(queryEmbedding, documentEmbedding), 0, 1)
      : 0;
    let score = queryEmbedding && Array.isArray(documentEmbedding)
      ? clamp(semantic * 0.85 + lexical * 0.15, 0, 1)
      : lexical;

    if (
      doc.documentType === 'job' &&
      doc.interestType &&
      safeString(interestType) &&
      doc.interestType !== safeString(interestType)
    ) {
      score *= 0.65;
    }

    if (doc.documentType === 'job') {
      semanticScores.jobs[doc.sourceId] = score;
    } else if (doc.documentType === 'course') {
      semanticScores.courses[doc.sourceId] = score;
    } else if (doc.documentType === 'workshop') {
      semanticScores.workshops[doc.sourceId] = score;
    }

    scoredContexts.push({
      type: doc.documentType,
      source_id: doc.sourceId,
      title: doc.title,
      snippet: String(doc.content || '').replace(/\s+/g, ' ').slice(0, 240),
      score
    });
  });

  scoredContexts.sort((left, right) => right.score - left.score);

  const embeddedDocuments = documents.filter((doc) => Array.isArray(embeddingsByKey[doc.documentKey])).length;
  const limitedContexts = scoredContexts
    .slice(0, ragConfig.maxRetrievedDocs)
    .map((item) => ({
      type: item.type,
      source_id: item.source_id,
      title: item.title,
      snippet: item.snippet,
      relevance_score: `${Math.round(item.score * 100)}%`
    }));

  return {
    semanticScores,
    retrieval: {
      enabled: true,
      strategy: queryEmbedding ? 'embedding_plus_lexical' : 'lexical_only',
      indexed_documents: documents.length,
      embedded_documents: embeddedDocuments,
      matched_documents: limitedContexts.length,
      sync_on_request: ragConfig.syncOnRequest,
      synced_documents_on_request: stats.syncedDocuments,
      top_contexts: limitedContexts
    }
  };
};

const reindexRecommendationCorpus = async ({
  jobs,
  courses,
  workshops,
  force = false
}) => {
  const startedAt = Date.now();
  const documents = buildDocuments({ jobs, courses, workshops });

  const { stats } = await syncVectorDocuments(documents, {
    syncMissing: true,
    force
  });

  let summary = {
    totals: { total_vectors: 0, embedded_vectors: 0, last_updated_at: null },
    by_type: []
  };
  try {
    summary = await getVectorIndexSummary();
  } catch (_error) {
    summary = {
      totals: { total_vectors: 0, embedded_vectors: 0, last_updated_at: null },
      by_type: []
    };
  }

  return {
    indexed_documents_requested: documents.length,
    synced_documents: stats.syncedDocuments,
    embeddings_generated: stats.embeddingsGenerated,
    reused_embeddings: stats.reusedEmbeddings,
    skipped_without_embedding_api: stats.skippedWithoutEmbeddingApi,
    embedding_model: ragConfig.openaiEmbeddingModel,
    rag_enabled: ragConfig.enabled,
    duration_ms: Date.now() - startedAt,
    index_summary: summary
  };
};

const getRecommendationIndexStatus = async () => {
  const summary = await getVectorIndexSummary();
  return {
    rag_enabled: ragConfig.enabled,
    sync_on_request: ragConfig.syncOnRequest,
    embedding_model: ragConfig.openaiEmbeddingModel,
    openai_embedding_key_configured: Boolean(aiConfig.openaiApiKey),
    index_summary: summary
  };
};

module.exports = {
  buildRagContext,
  reindexRecommendationCorpus,
  getRecommendationIndexStatus
};
