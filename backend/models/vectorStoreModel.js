const pool = require('../config/db');

const listVectorsByKeys = async (documentKeys = []) => {
  if (!Array.isArray(documentKeys) || documentKeys.length === 0) {
    return [];
  }

  const query = `
    SELECT
      document_key,
      document_type,
      source_id,
      interest_type,
      title,
      content,
      metadata,
      embedding_model,
      embedding,
      embedding_dimensions,
      content_hash,
      updated_at
    FROM recommendation_vectors
    WHERE document_key = ANY($1::text[]);
  `;

  const { rows } = await pool.query(query, [documentKeys]);
  return rows;
};

const upsertVectorDocument = async ({
  documentKey,
  documentType,
  sourceId,
  interestType,
  title,
  content,
  metadata,
  embeddingModel,
  embedding,
  contentHash
}) => {
  const query = `
    INSERT INTO recommendation_vectors (
      document_key,
      document_type,
      source_id,
      interest_type,
      title,
      content,
      metadata,
      embedding_model,
      embedding,
      embedding_dimensions,
      content_hash,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10, $11, CURRENT_TIMESTAMP)
    ON CONFLICT (document_key)
    DO UPDATE SET
      document_type = EXCLUDED.document_type,
      source_id = EXCLUDED.source_id,
      interest_type = EXCLUDED.interest_type,
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      metadata = EXCLUDED.metadata,
      embedding_model = EXCLUDED.embedding_model,
      embedding = EXCLUDED.embedding,
      embedding_dimensions = EXCLUDED.embedding_dimensions,
      content_hash = EXCLUDED.content_hash,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, document_key;
  `;

  const vector = Array.isArray(embedding) ? embedding : null;
  const embeddingDimensions = vector ? vector.length : 0;
  const values = [
    documentKey,
    documentType,
    sourceId,
    interestType || null,
    title,
    content,
    JSON.stringify(metadata || {}),
    embeddingModel,
    JSON.stringify(vector),
    embeddingDimensions,
    contentHash
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
};

const getVectorIndexSummary = async () => {
  const totalsQuery = `
    SELECT
      COUNT(*)::INT AS total_vectors,
      COUNT(*) FILTER (WHERE embedding IS NOT NULL)::INT AS embedded_vectors,
      COALESCE(MAX(updated_at), NULL) AS last_updated_at
    FROM recommendation_vectors;
  `;

  const byTypeQuery = `
    SELECT
      document_type,
      COUNT(*)::INT AS total,
      COUNT(*) FILTER (WHERE embedding IS NOT NULL)::INT AS embedded
    FROM recommendation_vectors
    GROUP BY document_type
    ORDER BY document_type ASC;
  `;

  const [totalsResult, byTypeResult] = await Promise.all([
    pool.query(totalsQuery),
    pool.query(byTypeQuery)
  ]);

  return {
    totals: totalsResult.rows[0] || { total_vectors: 0, embedded_vectors: 0, last_updated_at: null },
    by_type: byTypeResult.rows || []
  };
};

module.exports = {
  listVectorsByKeys,
  upsertVectorDocument,
  getVectorIndexSummary
};
