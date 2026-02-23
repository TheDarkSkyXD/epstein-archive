import express from 'express';
import { getDb } from '../db/connection.js';
import { cleanMime } from '../services/mimeCleaner.js';
import {
  getEntitiesInEmail,
  getKnownEntitySenders,
} from '../services/emailClassificationService.js';
import { performanceCache } from '../performanceCache.js';
import {
  mapEmailMailboxesResponseDto,
  mapEmailMessageBodyDto,
  mapEmailRawMessageDto,
  mapEmailSearchResponseDto,
  mapEmailThreadDetailsDto,
  mapEmailThreadsResponseDto,
} from '../mappers/emailsDtoMapper.js';
import { getEmailMailboxes, getEmailThreads, getEmailCategoriesCounts } from '../db/routesDb.js';

const router = express.Router();

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;
const LIST_TTL_SECONDS = 45;
const BODY_TTL_SECONDS = 60;

interface ParsedCursor {
  lastMessageAt: string;
  threadId: string;
}

interface EmailMessageHeaderRow {
  messageId: number;
  threadId: string;
  subject: string;
  fromAddress: string;
  toAddresses: string;
  ccAddresses: string;
  dateCreated: string;
  snippet: string;
  hasAttachments: number;
  attachmentsMetaRaw: string;
  ingestRunId: number | null;
  pipelineVersion: string | null;
  confidence: number | null;
  ladder: string | null;
  wasAgentic: number;
  redFlagRating: number | null;
}

const safeJsonParse = <T>(raw: string | null | undefined, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const normalizeList = (raw: unknown): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((value) => String(value || '').trim()).filter(Boolean);
  }
  return String(raw)
    .split(/[;,]/)
    .map((value) => value.trim())
    .filter(Boolean);
};

const normalizeThreadId = (metadataJson: string | null, id: number): string => {
  const metadata = safeJsonParse<Record<string, any>>(metadataJson, {});
  return String(
    metadata.thread_id ||
      metadata.threadId ||
      metadata.conversation_id ||
      metadata.message_id ||
      id,
  );
};

const parseCursor = (value: string | undefined): ParsedCursor | null => {
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8');
    const [lastMessageAt, threadId] = decoded.split('|');
    if (!lastMessageAt || !threadId) return null;
    return { lastMessageAt, threadId };
  } catch {
    return null;
  }
};

const encodeCursor = (lastMessageAt: string, threadId: string): string =>
  Buffer.from(`${lastMessageAt}|${threadId}`, 'utf8').toString('base64');

const normalizeTab = (tab: string | undefined): 'all' | 'primary' | 'updates' | 'promotions' => {
  if (tab === 'primary' || tab === 'updates' || tab === 'promotions') return tab;
  return 'all';
};

const parseEntityIds = (raw: string | null): number[] => {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  );
};

// GET /api/emails/mailboxes
router.get('/mailboxes', async (req, res, next) => {
  try {
    const showSuppressedJunk = req.query.showSuppressedJunk === '1';
    const cacheKey = `emails:mailboxes:${showSuppressedJunk ? 'all' : 'filtered'}`;
    const cached = performanceCache.get<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const { totals, rows } = await getEmailMailboxes(showSuppressedJunk);

    const payload = {
      revisionKey: `${process.env.INGEST_RUN_ID || process.env.LATEST_INGEST_RUN_ID || 'default'}:${process.env.RULESET_VERSION || 'v1'}`,
      data: [
        {
          mailboxId: 'all',
          displayName: 'All Inboxes',
          entityId: null,
          totalThreads: totals.totalThreads || 0,
          totalMessages: totals.totalMessages || 0,
          lastActivityAt: totals.lastActivityAt,
          riskSummary: null,
          isJunkSuppressed: !showSuppressedJunk,
        },
        ...rows.map((row) => ({
          mailboxId: `entity:${row.entityId}`,
          entityId: row.entityId,
          displayName: row.displayName,
          totalThreads: row.totalThreads,
          totalMessages: row.totalMessages,
          lastActivityAt: row.lastActivityAt,
          riskSummary:
            row.topRisk >= 4
              ? 'high'
              : row.topRisk >= 2
                ? 'medium'
                : row.topRisk > 0
                  ? 'low'
                  : 'minimal',
          isJunkSuppressed: !showSuppressedJunk,
        })),
      ],
    };

    const dto = mapEmailMailboxesResponseDto(payload);
    performanceCache.set(cacheKey, dto, LIST_TTL_SECONDS);
    res.json(dto);
  } catch (error) {
    next(error);
  }
});

// GET /api/emails/threads
router.get('/threads', async (req, res, next) => {
  try {
    const mailboxId = String(req.query.mailboxId || 'all');
    const query = String(req.query.q || '').trim();
    const fromFilter = String(req.query.from || '').trim();
    const toFilter = String(req.query.to || '').trim();
    const dateFrom = String(req.query.dateFrom || '').trim();
    const dateTo = String(req.query.dateTo || '').trim();
    const hasAttachments = req.query.hasAttachments === '1';
    const minRisk = Number(req.query.minRisk || 0);
    const tab = normalizeTab(typeof req.query.tab === 'string' ? req.query.tab : undefined);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || DEFAULT_LIMIT));
    res.setHeader('X-Limit-Applied', String(limit));
    const parsedCursor = parseCursor(
      typeof req.query.cursor === 'string' ? req.query.cursor : undefined,
    );
    const showSuppressedJunk = req.query.showSuppressedJunk === '1';

    const { rows, countRow } = await getEmailThreads({
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
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? encodeCursor(
          pageRows[pageRows.length - 1].lastMessageAt,
          pageRows[pageRows.length - 1].threadId,
        )
      : null;

    const payload = {
      data: pageRows.map((row) => ({
        threadId: row.threadId,
        subject: row.subject || 'No Subject',
        participants: normalizeList(row.participantsRaw),
        participantCount: row.participantCount,
        lastMessageAt: row.lastMessageAt,
        snippet: row.snippet || '',
        messageCount: row.messageCount,
        hasAttachments: row.hasAttachments === 1,
        linkedEntityIds: parseEntityIds(row.linkedEntityIdsRaw),
        risk: row.risk,
        ladder: row.ladder || null,
        confidence: row.confidence,
      })),
      meta: {
        total: countRow.total || 0,
        limit,
        hasMore,
        nextCursor,
      },
    };

    res.json(mapEmailThreadsResponseDto(payload));
  } catch (error) {
    next(error);
  }
});

// GET /api/emails/threads/:threadId
router.get('/threads/:threadId', async (req, res, next) => {
  try {
    const db = getDb();
    const threadId = req.params.threadId;

    const rows = (await db
      .prepare(
        `
      SELECT
        d.id AS "messageId",
        COALESCE(
          json_extract(d.metadata_json, '$.thread_id'),
          json_extract(d.metadata_json, '$.threadId'),
          json_extract(d.metadata_json, '$.conversation_id'),
          json_extract(d.metadata_json, '$.message_id'),
          CAST(d.id AS TEXT)
        ) AS "threadId",
        COALESCE(json_extract(d.metadata_json, '$.subject'), d.file_name, d.title, 'No Subject') AS subject,
        COALESCE(json_extract(d.metadata_json, '$.from'), '') AS "fromAddress",
        COALESCE(json_extract(d.metadata_json, '$.to'), '') AS "toAddresses",
        COALESCE(json_extract(d.metadata_json, '$.cc'), '') AS "ccAddresses",
        COALESCE(d.date_created, '1970-01-01T00:00:00.000Z') AS "dateCreated",
        COALESCE(d.content_refined, '') AS snippet,
        CASE WHEN CAST(COALESCE(json_extract(d.metadata_json, '$.attachments_count'), '0') AS INTEGER) > 0 THEN 1 ELSE 0 END AS "hasAttachments",
        COALESCE(json_extract(d.metadata_json, '$.attachments'), '[]') AS "attachmentsMetaRaw",
        NULL AS "ingestRunId",
        NULL AS "pipelineVersion",
        COALESCE(json_extract(d.metadata_json, '$.confidence'), json_extract(d.metadata_json, '$.significance_score')) AS confidence,
        COALESCE(json_extract(d.metadata_json, '$.ladder'), json_extract(d.metadata_json, '$.evidence_ladder')) AS ladder,
        COALESCE(json_extract(d.metadata_json, '$.was_agentic'), 0) AS "wasAgentic",
        d.red_flag_rating AS "redFlagRating"
      FROM documents d
      WHERE d.evidence_type = 'email'
        AND COALESCE(
          json_extract(d.metadata_json, '$.thread_id'),
          json_extract(d.metadata_json, '$.threadId'),
          json_extract(d.metadata_json, '$.conversation_id'),
          json_extract(d.metadata_json, '$.message_id'),
          CAST(d.id AS TEXT)
        ) = ?
      ORDER BY "dateCreated" ASC, d.id ASC
      `,
      )
      .all(threadId)) as EmailMessageHeaderRow[];

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const messageIds = rows.map((row) => row.messageId);
    const entityRows =
      messageIds.length > 0
        ? ((await db
            .prepare(
              `
        SELECT
          em.document_id AS "messageId",
          em.entity_id AS "entityId",
          e.full_name AS name,
          e.primary_role AS role
        FROM entity_mentions em
        JOIN entities e ON e.id = em.entity_id
        WHERE em.document_id IN (${messageIds.map(() => '?').join(',')})
        ORDER BY em.document_id ASC, e.full_name ASC
        `,
            )
            .all(...messageIds)) as Array<{
            messageId: number;
            entityId: number;
            name: string;
            role: string | null;
          }>)
        : [];

    const entitiesByMessage = new Map<
      number,
      Array<{ entityId: number; name: string; role: string | null }>
    >();
    for (const row of entityRows) {
      if (!entitiesByMessage.has(row.messageId)) {
        entitiesByMessage.set(row.messageId, []);
      }
      entitiesByMessage.get(row.messageId)!.push({
        entityId: row.entityId,
        name: row.name,
        role: row.role,
      });
    }

    const messages = rows.map((row) => ({
      messageId: String(row.messageId),
      threadId: row.threadId,
      subject: row.subject,
      from: row.fromAddress,
      to: normalizeList(row.toAddresses),
      cc: normalizeList(row.ccAddresses),
      date: row.dateCreated,
      snippet: row.snippet,
      flags: {
        hasAttachments: row.hasAttachments === 1,
      },
      attachmentsMeta: safeJsonParse<any[]>(row.attachmentsMetaRaw, []),
      linkedEntities: entitiesByMessage.get(row.messageId) || [],
      ingestRunId: row.ingestRunId,
      pipelineVersion: row.pipelineVersion,
      confidence: row.confidence,
      ladder: row.ladder,
      wasAgentic: Boolean(row.wasAgentic),
      redFlagRating: row.redFlagRating,
    }));

    return res.json(
      mapEmailThreadDetailsDto({
        threadId,
        subject: rows[rows.length - 1].subject,
        messages,
      }),
    );
  } catch (error) {
    next(error);
  }
});

// GET /api/emails/messages/:messageId/body
router.get('/messages/:messageId/body', async (req, res, next) => {
  try {
    const db = getDb();
    const messageId = req.params.messageId;
    const showQuoted = req.query.showQuoted === '1';
    const cacheKey = `emails:message:${messageId}:body:${showQuoted ? 'quoted' : 'collapsed'}`;
    const cached = performanceCache.get<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const row = (await db
      .prepare(
        `
      SELECT
        d.id,
        d.content,
        d.content_refined AS content_preview,
        d.metadata_json,
        NULL AS "ingestRunId",
        NULL AS "pipelineVersion",
        d.date_created AS "dateCreated",
        d.file_name AS "fileName",
        d.file_path AS "filePath"
      FROM documents d
      WHERE d.evidence_type = 'email' AND d.id = ?
      LIMIT 1
      `,
      )
      .get(messageId)) as
      | {
          id: number;
          content: string | null;
          content_preview: string | null;
          metadata_json: string | null;
          ingestRunId: number | null;
          pipelineVersion: string | null;
          dateCreated: string | null;
          fileName: string | null;
          filePath: string | null;
        }
      | undefined;

    if (!row) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const metadata = safeJsonParse<Record<string, any>>(row.metadata_json, {});
    const source = String(row.content || metadata.body_raw || metadata.raw || '').trim();
    const cleaned = source ? await cleanMime(source) : null;

    const cleanedTextInitial =
      cleaned?.body_clean_text ||
      String(metadata.body_clean_text || row.content_preview || '').trim();

    const cleanedText = showQuoted
      ? cleanedTextInitial
      : cleanedTextInitial
          .replace(/\nOn .*wrote:\n[\s\S]*$/im, '\n')
          .replace(/\nFrom:\s.*$/im, '\n')
          .trim();

    const cleanedHtml = cleaned?.body_clean_html || '';
    const links = Array.from(
      new Set([
        ...Array.from(cleanedText.matchAll(/https?:\/\/[^\s<>()"']+/g)).map((m) => m[0]),
        ...Array.from(cleanedHtml.matchAll(/href=["']([^"']+)["']/gi)).map((m) => m[1]),
      ]),
    ).slice(0, 50);

    const payload = {
      messageId,
      cleanedText,
      cleanedHtml,
      extractedLinks: links,
      extractedEntities: normalizeList(metadata.extracted_entities || []),
      mimeWarnings:
        cleaned?.mime_parse_status === 'failed'
          ? [cleaned.mime_parse_reason || 'MIME parse failed']
          : [],
      parseStatus: cleaned?.mime_parse_status || 'partial',
      ingestRunId: row.ingestRunId,
      pipelineVersion: row.pipelineVersion,
      sourceFile: {
        fileName: row.fileName,
        filePath: row.filePath,
      },
      rawAvailable: source.length > 0,
    };

    const dto = mapEmailMessageBodyDto(payload);
    performanceCache.set(cacheKey, dto, BODY_TTL_SECONDS);
    res.json(dto);
  } catch (error) {
    next(error);
  }
});

// GET /api/emails/messages/:messageId/thread
router.get('/messages/:messageId/thread', async (req, res, next) => {
  try {
    const db = getDb();
    const row = (await db
      .prepare(
        `
      SELECT
        id,
        metadata_json
      FROM documents
      WHERE evidence_type = 'email' AND id = ?
      LIMIT 1
      `,
      )
      .get(req.params.messageId)) as { id: number; metadata_json: string | null } | undefined;

    if (!row) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const threadId = normalizeThreadId(row.metadata_json, row.id);
    res.json({ messageId: req.params.messageId, threadId });
  } catch (error) {
    next(error);
  }
});

// GET /api/emails/messages/:messageId/raw
router.get('/messages/:messageId/raw', async (req, res, next) => {
  try {
    const db = getDb();
    const row = (await db
      .prepare(
        `
      SELECT id, content, metadata_json
      FROM documents
      WHERE evidence_type = 'email' AND id = ?
      LIMIT 1
      `,
      )
      .get(req.params.messageId)) as
      | { id: number; content: string | null; metadata_json: string | null }
      | undefined;

    if (!row) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const metadata = safeJsonParse<Record<string, any>>(row.metadata_json, {});
    const raw = String(metadata.body_raw || metadata.raw || row.content || '');

    res.json(
      mapEmailRawMessageDto({
        messageId: req.params.messageId,
        raw,
        warning: 'Raw MIME content can include malformed or unsafe markup. Inspect with caution.',
        determinism:
          'Raw view is a direct source payload and is not transformed except transport encoding.',
      }),
    );
  } catch (error) {
    next(error);
  }
});

// GET /api/emails/search
router.get('/search', async (req, res, next) => {
  try {
    const db = getDb();
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const scope = req.query.scope === 'mailbox' ? 'mailbox' : 'global';
    const mailboxId = String(req.query.mailboxId || 'all');
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || DEFAULT_LIMIT));

    let mailboxClause = '';
    const params: Array<string | number> = [];
    if (scope === 'mailbox' && mailboxId.startsWith('entity:')) {
      const entityId = Number(mailboxId.replace('entity:', ''));
      if (Number.isFinite(entityId) && entityId > 0) {
        mailboxClause = `
          AND EXISTS (
            SELECT 1 FROM entity_mentions em
            WHERE em.document_id = d.id AND em.entity_id = ?
          )
        `;
        params.push(entityId);
      }
    }

    const like = `%${q.toLowerCase()}%`;
    const sql = `
      SELECT
        d.id AS messageId,
        COALESCE(
          json_extract(d.metadata_json, '$.thread_id'),
          json_extract(d.metadata_json, '$.threadId'),
          json_extract(d.metadata_json, '$.conversation_id'),
          json_extract(d.metadata_json, '$.message_id'),
          CAST(d.id AS TEXT)
        ) AS threadId,
        COALESCE(json_extract(d.metadata_json, '$.subject'), d.file_name, d.title, 'No Subject') AS subject,
        COALESCE(json_extract(d.metadata_json, '$.from'), '') AS fromAddress,
        COALESCE(d.date_created, '1970-01-01T00:00:00.000Z') AS dateCreated,
        COALESCE(d.content_refined, '') AS snippet
      FROM documents d
      WHERE d.evidence_type = 'email'
        ${mailboxClause}
        AND (
          lower(COALESCE(json_extract(d.metadata_json, '$.subject'), '')) LIKE ?
          OR lower(COALESCE(json_extract(d.metadata_json, '$.from'), '')) LIKE ?
          OR lower(COALESCE(json_extract(d.metadata_json, '$.to'), '')) LIKE ?
          OR lower(COALESCE(d.content_refined, '')) LIKE ?
        )
      ORDER BY COALESCE(d.date_created, '1970-01-01T00:00:00.000Z') DESC, d.id ASC
      LIMIT ?
    `;

    const rows = (await db.prepare(sql).all(...params, like, like, like, like, limit)) as Array<{
      messageId: number;
      threadId: string;
      subject: string;
      fromAddress: string;
      dateCreated: string;
      snippet: string;
    }>;

    const lowerNeedle = q.toLowerCase();
    const payload = {
      scope,
      q,
      data: rows.map((row) => {
        const haystack = `${row.subject}\n${row.snippet}`.toLowerCase();
        const start = haystack.indexOf(lowerNeedle);
        const end = start >= 0 ? start + q.length : -1;
        return {
          threadId: row.threadId,
          messageId: String(row.messageId),
          subject: row.subject,
          from: row.fromAddress,
          date: row.dateCreated,
          snippet: row.snippet,
          highlights: start >= 0 ? [{ start, end }] : [],
        };
      }),
    };

    res.json(mapEmailSearchResponseDto(payload));
  } catch (error) {
    next(error);
  }
});

// GET /api/emails/categories (legacy support)
router.get('/categories', async (_req, res, next) => {
  try {
    const counts = getEmailCategoriesCounts();
    res.json(counts);
  } catch (error) {
    next(error);
  }
});

// GET /api/emails/:id/entities (legacy + current UI support)
router.get('/:id/entities', async (req, res, next) => {
  try {
    const db = getDb();
    const email = (await db
      .prepare(
        `
      SELECT content FROM documents WHERE id = ? AND evidence_type = 'email'
      `,
      )
      .get(req.params.id)) as { content: string } | undefined;

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const entities = await getEntitiesInEmail(email.content || '');
    res.json({ entities });
  } catch (error) {
    next(error);
  }
});

// GET /api/emails/known-senders (legacy support)
router.get('/known-senders', async (_req, res) => {
  res.json(getKnownEntitySenders());
});

// Legacy aliases to avoid contract breakage
router.get('/thread/:id', async (req, res, next) => {
  try {
    return res.redirect(307, `/api/emails/threads/${encodeURIComponent(req.params.id)}`);
  } catch (error) {
    return next(error);
  }
});

router.get('/message/:id', async (req, res, next) => {
  try {
    return res.redirect(307, `/api/emails/messages/${encodeURIComponent(req.params.id)}/body`);
  } catch (error) {
    return next(error);
  }
});

// Legacy root endpoint maps to thread metadata list
router.get('/', async (req, res, next) => {
  const mailboxId = typeof req.query.mailboxId === 'string' ? req.query.mailboxId : 'all';
  const q =
    typeof req.query.search === 'string'
      ? req.query.search
      : typeof req.query.q === 'string'
        ? req.query.q
        : '';
  const tab = typeof req.query.category === 'string' ? req.query.category : 'all';
  const limit = typeof req.query.limit === 'string' ? req.query.limit : String(DEFAULT_LIMIT);
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

  try {
    const target = `/api/emails/threads?mailboxId=${encodeURIComponent(mailboxId)}&q=${encodeURIComponent(q)}&tab=${encodeURIComponent(tab)}&limit=${encodeURIComponent(limit)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    return res.redirect(307, target);
  } catch (error) {
    return next(error);
  }
});

export default router;
