import { db, adminQueries, analyticsQueries, graphQueries } from '@epstein/db';

export async function getDbMeta() {
  const rows = await adminQueries.getDbStats.run(undefined, db);
  return rows;
}

export async function getEntityAndDocumentCounts() {
  const rows = await analyticsQueries.getTotalCounts.run(undefined, db);
  const counts = rows[0];
  return {
    entities: Number(counts?.entities || 0),
    documents: Number(counts?.documents || 0),
  };
}

export async function pingDatabase() {
  await db.query('SELECT 1');
}

export async function getCriticalTableCounts(tables: string[]) {
  const results: Record<
    string,
    {
      ok: boolean;
      count: number;
      error?: string;
    }
  > = {};
  for (const table of tables) {
    try {
      // Use raw query for dynamic table name safely here since this is an admin/internal tool
      const { rows } = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
      results[table] = { ok: true, count: Number(rows[0].count) };
    } catch (e: any) {
      results[table] = { ok: false, count: 0, error: e.message };
    }
  }
  return results;
}

export async function getSampleEntityWithMentions() {
  const { rows } = await db.query('SELECT id, full_name FROM entities WHERE mentions > 0 LIMIT 1');
  return rows[0] as { id: number; full_name: string } | undefined;
}

export async function insertUploadedDocument(params: {
  fileName: string;
  filePath: string;
  mimetype: string;
  size: number;
  title: string;
  metadataJson: string;
}) {
  const { rows } = await db.query(
    `
      INSERT INTO documents (
        file_name, 
        file_path, 
        file_type, 
        file_size, 
        date_created, 
        title, 
        metadata_json,
        red_flag_rating
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, 0)
      RETURNING id
    `,
    [
      params.fileName,
      params.filePath,
      params.mimetype,
      params.size,
      params.title,
      params.metadataJson,
    ],
  );
  return rows[0].id;
}

export async function getEvidenceTypes() {
  const { rows } = await db.query(
    `
      SELECT evidence_type as type, COUNT(*) as count 
      FROM documents 
      WHERE evidence_type IS NOT NULL 
      GROUP BY evidence_type
    `,
  );
  return rows as Array<{ type: string; count: number }>;
}

export async function resetJunkFlags() {
  const rows = await adminQueries.resetJunkFlags.run(undefined, db);
  return rows.length; // Or return total count if we change resetJunkFlags to return count
}

export async function listUsers() {
  const rows = await adminQueries.listUsers.run(undefined, db);
  return rows;
}

export async function getUserById(id: string) {
  const rows = await adminQueries.getUserById.run({ id }, db);
  return rows[0];
}

export async function createUser(params: {
  id: string;
  username: string;
  email: string | null;
  role: string;
  passwordHash: string;
}) {
  await adminQueries.createUser.run(params, db);
}

export async function updateUser(
  id: string,
  fields: {
    username?: string;
    email?: string;
    role?: string;
    passwordHash?: string;
  },
) {
  const updates: string[] = [];
  const params: any[] = [];

  if (fields.username) {
    updates.push(`username = $${params.length + 1}`);
    params.push(fields.username);
  }
  if (fields.email) {
    updates.push(`email = $${params.length + 1}`);
    params.push(fields.email);
  }
  if (fields.role) {
    updates.push(`role = $${params.length + 1}`);
    params.push(fields.role);
  }
  if (fields.passwordHash) {
    updates.push(`password_hash = $${params.length + 1}`);
    params.push(fields.passwordHash);
  }

  if (updates.length === 0) {
    return;
  }

  params.push(id);
  await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
}

// DEPRECATED: Review Queue logic moved to reviewQueueRepository.ts

export async function getMapEntities(minRisk: number, limit: number) {
  return graphQueries.getMapEntities.run({ minRisk, limit }, db);
}

export interface WebVitalsPayload {
  sessionId: string;
  route: string;
  cls: number;
  lcp: number;
  inp: number;
  longTaskCount: number;
}

export async function recordWebVitals(payload: WebVitalsPayload) {
  await analyticsQueries.recordWebVitals.run(payload, db);
}

export async function getWebVitalsAggregates(days: number) {
  return analyticsQueries.getWebVitalsAggregates.run({ days: days.toString() }, db);
}

export async function getWebVitalsAggregatesAverage(days: number) {
  return analyticsQueries.getWebVitalsAggregatesAverage.run({ days: days.toString() }, db);
}

export async function getGraphCommunities() {
  return graphQueries.getGraphCommunities.run(undefined, db);
}

export async function getGraphNeighbors(
  sourceCanonicalId: string,
  startDate?: string,
  endDate?: string,
) {
  return graphQueries.getGraphNeighbors.run(
    {
      sourceCanonicalId,
      startDate: startDate || null,
      endDate: endDate || null,
    },
    db,
  );
}

export async function getGraphPathNodes(pathNodes: string[]) {
  return graphQueries.getGraphPathNodes.run({ pathNodes }, db);
}

export async function getGraphPathEdges(pathNodes: string[], startDate?: string, endDate?: string) {
  return graphQueries.getGraphPathEdges.run(
    {
      pathNodes,
      startDate: startDate || null,
      endDate: endDate || null,
    },
    db,
  );
}

export async function getGlobalGraphNodes(params: {
  minRisk: number;
  limit: number;
  startDate?: string;
  endDate?: string;
}) {
  return graphQueries.getGlobalGraphNodes.run(
    {
      minRisk: params.minRisk,
      limit: params.limit,
      startDate: params.startDate || null,
      endDate: params.endDate || null,
    },
    db,
  );
}

export async function getGlobalGraphEdges(params: {
  canonicalIds: string[];
  startDate?: string;
  endDate?: string;
}) {
  return graphQueries.getGlobalGraphEdges.run(
    {
      canonicalIds: params.canonicalIds,
      startDate: params.startDate || null,
      endDate: params.endDate || null,
    },
    db,
  );
}

export async function getEdgeEvidenceDocuments(sourceId: string, targetId: string) {
  return graphQueries.getEdgeEvidenceDocuments.run({ sourceId, targetId }, db);
}

export async function getEdgeRelationship(sourceId: string, targetId: string) {
  const rows = await graphQueries.getEdgeRelationship.run({ sourceId, targetId }, db);
  return rows[0];
}

export interface EmailCategoriesCounts {
  all: number;
  primary: number;
  updates: number;
  promotions: number;
}

export interface EmailMetadata {
  id: number;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  hasAttachments: boolean;
  category?: 'primary' | 'updates' | 'promotions';
}

interface EmailThreadRow {
  threadId: string;
  subject: string;
  participantsRaw: string;
  participantCount: number;
  lastMessageAt: string;
  snippet: string;
  messageCount: number;
  hasAttachments: number;
  linkedEntityIdsRaw: string;
  risk: number | null;
  ladder: string | null;
  confidence: number | null;
}

export async function getEmailMetadataPage(params: {
  page: number;
  limit: number;
  category?: string;
}): Promise<{
  data: EmailMetadata[];
  total: number;
}> {
  const { page, limit, category } = params;
  const offset = (page - 1) * limit;

  const whereParts = ["evidence_type = 'email'"];
  const queryParams: any[] = [];
  if (category && category !== 'all') {
    whereParts.push(`metadata_json ->> 'category' = $${queryParams.length + 1}`);
    queryParams.push(category);
  }
  const whereClause = `WHERE ${whereParts.join(' AND ')}`;

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) as count FROM documents ${whereClause}`,
    queryParams,
  );
  const total = Number(countRows[0].count);

  const query = `
      SELECT 
        id,
        metadata_json ->> 'thread_id' as "threadId",
        metadata_json ->> 'subject' as subject,
        metadata_json ->> 'from' as "from",
        metadata_json ->> 'to' as "to",
        date_created as date,
        SUBSTR(content_preview, 1, 150) as snippet,
        0 as "hasAttachments",
        metadata_json ->> 'category' as category
      FROM documents
      ${whereClause}
      ORDER BY date_created DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

  const { rows: emails } = await db.query(query, [...queryParams, limit, offset]);

  return { data: emails as EmailMetadata[], total };
}

export async function getEmailBodyById(id: string): Promise<{ body: string } | undefined> {
  const query = `
      SELECT content as body
      FROM documents
      WHERE id = $1 AND evidence_type = 'email'
    `;
  const { rows } = await db.query(query, [id]);
  return rows[0] as { body: string } | undefined;
}

export async function getEmailCategoriesCounts(): Promise<EmailCategoriesCounts> {
  const query = `
      SELECT 
        metadata_json ->> 'category' as category,
        COUNT(*) as count
      FROM documents
      WHERE evidence_type = 'email'
      GROUP BY category
    `;
  const { rows } = await db.query(query);

  const counts: EmailCategoriesCounts = {
    all: 0,
    primary: 0,
    updates: 0,
    promotions: 0,
  };

  for (const row of rows as Array<{ category: string; count: string }>) {
    const category = row.category || 'primary';
    const count = Number(row.count);
    if (category in counts) {
      counts[category as keyof EmailCategoriesCounts] += count;
    }
    counts.all += count;
  }
  return counts;
}

const buildCategoryCaseSql = `
CASE
  WHEN lower(coalesce(metadata_json ->> 'from', '')) LIKE '%amazon.com%'
    OR lower(coalesce(metadata_json ->> 'from', '')) LIKE '%noreply@%'
    OR lower(coalesce(metadata_json ->> 'from', '')) LIKE '%no-reply@%'
    OR lower(coalesce(content_refined, '')) LIKE '%order %'
    OR lower(coalesce(content_refined, '')) LIKE '%shipping%'
  THEN 'updates'
  WHEN lower(coalesce(metadata_json ->> 'from', '')) LIKE '%@houzz.com%'
    OR lower(coalesce(metadata_json ->> 'from', '')) LIKE '%@response.cnbc.com%'
    OR lower(coalesce(content_refined, '')) LIKE '%unsubscribe%'
    OR lower(coalesce(content_refined, '')) LIKE '%newsletter%'
  THEN 'promotions'
  ELSE 'primary'
END
`;

const buildThreadBaseSql = (where: string) => `
WITH email_docs AS (
  SELECT
    d.id,
    COALESCE(d.date_created, '1970-01-01T00:00:00.000Z'::timestamptz) AS dateCreated,
    COALESCE(
      metadata_json ->> 'thread_id',
      metadata_json ->> 'threadId',
      metadata_json ->> 'conversation_id',
      metadata_json ->> 'message_id',
      d.id::text
    ) AS threadId,
    COALESCE(metadata_json ->> 'subject', d.file_name, d.title, 'No Subject') AS subject,
    COALESCE(metadata_json ->> 'from', '') AS fromAddress,
    COALESCE(metadata_json ->> 'to', '') AS toAddress,
    COALESCE(d.content_refined, '') AS snippet,
    d.red_flag_rating,
    d.metadata_json,
    ${buildCategoryCaseSql} AS mailboxTab
  FROM documents d
  WHERE d.evidence_type = 'email'
    ${where}
),
threaded AS (
  SELECT
    threadId,
    MIN(subject) AS subject,
    MAX(dateCreated) AS lastMessageAt,
    COUNT(*) AS messageCount,
    STRING_AGG(DISTINCT fromAddress, ',') AS participantsRaw,
    MAX(COALESCE(red_flag_rating, 0)) AS risk,
    MAX(COALESCE((metadata_json ->> 'confidence')::float, (metadata_json ->> 'significance_score')::float)) AS confidence,
    MAX(COALESCE(metadata_json ->> 'ladder', metadata_json ->> 'evidence_ladder')) AS ladder,
    MAX(CASE WHEN (COALESCE(metadata_json ->> 'attachments_count', '0'))::int > 0 THEN 1 ELSE 0 END) AS hasAttachments,
    NULL AS linkedEntityIdsRaw,
    (
      SELECT COALESCE(d3.content_refined, '')
      FROM documents d3
      WHERE d3.evidence_type = 'email'
        AND COALESCE(
          metadata_json ->> 'thread_id',
          metadata_json ->> 'threadId',
          metadata_json ->> 'conversation_id',
          metadata_json ->> 'message_id',
          d3.id::text
        ) = email_docs.threadId
      ORDER BY COALESCE(d3.date_created, '1970-01-01T00:00:00.000Z'::timestamptz) DESC, d3.id DESC
      LIMIT 1
    ) AS snippet
  FROM email_docs
  GROUP BY threadId
)
SELECT
  threadId,
  subject,
  participantsRaw,
  COALESCE(
    CASE WHEN participantsRaw = '' THEN 0
         ELSE (LENGTH(participantsRaw) - LENGTH(REPLACE(participantsRaw, ',', '')) + 1)
    END,
    0
  ) AS participantCount,
  lastMessageAt,
  snippet,
  messageCount,
  hasAttachments,
  linkedEntityIdsRaw,
  risk,
  ladder,
  confidence
FROM threaded
`;

const getJunkFilterClause = (showSuppressedJunk: boolean) => {
  if (showSuppressedJunk) return '';
  return `
  AND NOT EXISTS (
    SELECT 1
    FROM entity_mentions em
    JOIN entities e ON e.id = em.entity_id
    WHERE em.document_id = d.id
      AND COALESCE(e.junk_tier, 'clean') = 'junk'
  )
  `;
};

export async function getEmailMailboxes(showSuppressedJunk: boolean) {
  const junkFilter = getJunkFilterClause(showSuppressedJunk);

  const { rows: totalsRows } = await db.query(
    `
      SELECT
        COUNT(DISTINCT COALESCE(
          metadata_json ->> 'thread_id',
          metadata_json ->> 'threadId',
          metadata_json ->> 'conversation_id',
          metadata_json ->> 'message_id',
          d.id::text
        )) AS "totalThreads",
        COUNT(*) AS "totalMessages",
        MAX(COALESCE(d.date_created, '1970-01-01T00:00:00.000Z'::timestamptz)) AS "lastActivityAt"
      FROM documents d
      WHERE d.evidence_type = 'email'
      ${junkFilter}
    `,
  );
  const totals = totalsRows[0];

  const { rows } = await db.query(
    `
      SELECT
        em.entity_id AS "entityId",
        e.full_name AS "displayName",
        COUNT(DISTINCT COALESCE(
          metadata_json ->> 'thread_id',
          metadata_json ->> 'threadId',
          metadata_json ->> 'conversation_id',
          metadata_json ->> 'message_id',
          d.id::text
        )) AS "totalThreads",
        COUNT(*) AS "totalMessages",
        MAX(COALESCE(d.date_created, '1970-01-01T00:00:00.000Z'::timestamptz)) AS "lastActivityAt",
        MAX(COALESCE(d.red_flag_rating, 0)) AS "topRisk"
      FROM entity_mentions em
      JOIN documents d ON d.id = em.document_id
      JOIN entities e ON e.id = em.entity_id
      WHERE d.evidence_type = 'email'
        ${showSuppressedJunk ? '' : "AND COALESCE(e.junk_tier, 'clean') = 'clean'"}
      GROUP BY em.entity_id, e.full_name
      HAVING COUNT(*) >= 2
      ORDER BY "totalThreads" DESC, "totalMessages" DESC, "displayName" ASC
      LIMIT 60
    `,
  );

  return { totals, rows };
}

export async function getEmailThreads(params: {
  mailboxId: string;
  query: string;
  fromFilter: string;
  toFilter: string;
  dateFrom: string;
  dateTo: string;
  hasAttachments: boolean;
  minRisk: number;
  tab: string;
  limit: number;
  parsedCursor: { lastMessageAt: string; threadId: string } | null;
  showSuppressedJunk: boolean;
}) {
  const {
    mailboxId,
    query,
    fromFilter,
    toFilter,
    dateFrom,
    dateTo,
    hasAttachments,
    minRisk,
    tab,
    limit,
    parsedCursor,
    showSuppressedJunk,
  } = params;

  const queryParams: any[] = [];
  let where = getJunkFilterClause(showSuppressedJunk);

  if (tab !== 'all') {
    where += ` AND (${buildCategoryCaseSql}) = $${queryParams.length + 1}`;
    queryParams.push(tab);
  }

  if (mailboxId.startsWith('entity:')) {
    const entityId = Number(mailboxId.replace('entity:', ''));
    if (Number.isFinite(entityId) && entityId > 0) {
      where += ` AND EXISTS (
          SELECT 1 FROM entity_mentions em
          WHERE em.document_id = d.id
            AND em.entity_id = $${queryParams.length + 1}
        )`;
      queryParams.push(entityId);
    }
  }

  if (query.length > 0) {
    const likeParam = `%${query}%`;
    where += ` AND (
        lower(COALESCE(metadata_json ->> 'subject', d.file_name, d.title, '')) LIKE lower($${queryParams.length + 1})
        OR lower(COALESCE(metadata_json ->> 'from', '')) LIKE lower($${queryParams.length + 1})
        OR lower(COALESCE(metadata_json ->> 'to', '')) LIKE lower($${queryParams.length + 1})
        OR lower(COALESCE(d.content_refined, '')) LIKE lower($${queryParams.length + 1})
      )`;
    queryParams.push(likeParam);
  }

  if (fromFilter.length > 0) {
    where += ` AND lower(COALESCE(metadata_json ->> 'from', '')) LIKE lower($${queryParams.length + 1})`;
    queryParams.push(`%${fromFilter}%`);
  }

  if (toFilter.length > 0) {
    where += ` AND lower(COALESCE(metadata_json ->> 'to', '')) LIKE lower($${queryParams.length + 1})`;
    queryParams.push(`%${toFilter}%`);
  }

  if (dateFrom.length > 0) {
    where += ` AND COALESCE(d.date_created, '1970-01-01T00:00:00.000Z'::timestamptz) >= $${queryParams.length + 1}`;
    queryParams.push(dateFrom);
  }

  if (dateTo.length > 0) {
    where += ` AND COALESCE(d.date_created, '1970-01-01T00:00:00.000Z'::timestamptz) <= $${queryParams.length + 1}`;
    queryParams.push(dateTo);
  }

  if (hasAttachments) {
    where += ` AND (COALESCE(metadata_json ->> 'attachments_count', '0'))::int > 0`;
  }

  if (Number.isFinite(minRisk) && minRisk > 0) {
    where += ` AND COALESCE(d.red_flag_rating, 0) >= $${queryParams.length + 1}`;
    queryParams.push(minRisk);
  }

  const baseSql = buildThreadBaseSql(where);

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) as total FROM (${baseSql}) threads`,
    queryParams,
  );
  const total = Number(countRows[0].total);

  const cursorParams: any[] = [];
  let cursorClause = '';
  if (parsedCursor) {
    cursorClause = ` WHERE (lastMessageAt < $${queryParams.length + 1} OR (lastMessageAt = $${queryParams.length + 1} AND threadId > $${queryParams.length + 2})) `;
    cursorParams.push(parsedCursor.lastMessageAt, parsedCursor.threadId);
  }

  const listSql = `${baseSql}
      ${cursorClause}
      ORDER BY lastMessageAt DESC, threadId ASC
      LIMIT $${queryParams.length + cursorParams.length + 1}
    `;

  const { rows } = await db.query(listSql, [...queryParams, ...cursorParams, limit + 1]);

  return { rows, countRow: { total } };
}
