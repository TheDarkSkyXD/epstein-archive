import { getDb } from './connection.js';

export interface CommunicationEvent {
  documentId: string;
  threadId: string;
  subject: string;
  date: string | null;
  from: string;
  to: string[];
  cc: string[];
  topic: string;
  evidenceType: string;
  snippet: string;
}

export interface EntityCommunicationsFilters {
  topic?: string;
  from?: string;
  to?: string;
  start?: string; // ISO date string
  end?: string; // ISO date string
  limit?: number;
}

function deriveTopic(subject: string, snippet: string): string {
  const text = `${subject} ${snippet}`.toLowerCase();

  if (/flight|airport|arriv(e|al)|depart|ticket|itinerary|plane|jet|pilot/.test(text)) {
    return 'flight_logistics';
  }
  if (/wire|transfer|payment|bank|account|usd|invoice|fee|amount|funds|transaction/.test(text)) {
    return 'financial_transfers';
  }
  if (/lawsuit|court|hearing|affidavit|deposition|subpoena|attorney|motion/.test(text)) {
    return 'legal_strategy';
  }
  if (/press|media|article|reporter|journalist|interview|headline|coverage|statement/.test(text)) {
    return 'public_relations';
  }
  if (/schedule|meeting|call|zoom|appointment|calendar|availability|reschedul/.test(text)) {
    return 'scheduling';
  }
  if (/victim|girl|minor|massage|recruit|testimony|abuse|traffick|allegation/.test(text)) {
    return 'victims_handling';
  }

  return 'misc';
}

function normalizeList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((v) => String(v))
      .join(',')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const communicationsRepository = {
  getCommunicationsForEntity(
    entityId: string,
    filters: EntityCommunicationsFilters = {},
  ): CommunicationEvent[] {
    const db = getDb();

    const baseSql = `
      SELECT d.id, d.content, d.date_created, d.evidence_type, d.metadata_json
      FROM entity_mentions em
      JOIN documents d ON em.document_id = d.id
      WHERE em.entity_id = ? AND d.evidence_type = 'email'
    `;

    const rows = db.prepare(baseSql).all(entityId) as any[];

    const events: CommunicationEvent[] = rows.map((row) => {
      let metadata: any = {};
      try {
        if (row.metadata_json) {
          metadata =
            typeof row.metadata_json === 'string'
              ? JSON.parse(row.metadata_json)
              : row.metadata_json;
        }
      } catch {
        metadata = {};
      }

      const subject = metadata.subject || metadata.Subject || row.file_name || 'No Subject';
      const from = metadata.from || metadata.From || metadata.sender || 'Unknown Sender';
      const to = normalizeList(metadata.to || metadata.To || metadata.recipients);
      const cc = normalizeList(metadata.cc || metadata.Cc);
      const snippetSource: string = row.content || '';
      const snippet =
        snippetSource.length > 240 ? `${snippetSource.slice(0, 240)}...` : snippetSource;
      const threadId = metadata.thread_id || metadata.emailThread || String(row.id);
      const topic = deriveTopic(String(subject || ''), snippetSource || '');

      return {
        documentId: String(row.id),
        threadId,
        subject: String(subject || 'No Subject'),
        date: row.date_created || metadata.sent || metadata.date || null,
        from: String(from || 'Unknown Sender'),
        to,
        cc,
        topic,
        evidenceType: row.evidence_type || 'email',
        snippet,
      };
    });

    let filtered = events;

    if (filters.topic) {
      const t = filters.topic.toLowerCase();
      filtered = filtered.filter((e) => e.topic.toLowerCase() === t);
    }
    if (filters.from) {
      const f = filters.from.toLowerCase();
      filtered = filtered.filter((e) => e.from.toLowerCase().includes(f));
    }
    if (filters.to) {
      const t = filters.to.toLowerCase();
      filtered = filtered.filter((e) => e.to.some((addr) => addr.toLowerCase().includes(t)));
    }
    if (filters.start) {
      filtered = filtered.filter((e) => !e.date || e.date >= filters.start!);
    }
    if (filters.end) {
      filtered = filtered.filter((e) => !e.date || e.date <= filters.end!);
    }

    filtered.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const dbTime = b.date ? new Date(b.date).getTime() : 0;
      return dbTime - da;
    });

    const limit = filters.limit && filters.limit > 0 ? filters.limit : 500;
    return filtered.slice(0, limit);
  },

  getThreadForDocument(
    documentId: string,
  ): { threadId: string; messages: CommunicationEvent[] } | null {
    const db = getDb();

    const docRow = db
      .prepare(
        'SELECT id, content, date_created, evidence_type, metadata_json FROM documents WHERE id = ?',
      )
      .get(documentId) as any;
    if (!docRow) return null;
    if (docRow.evidence_type !== 'email') {
      return null;
    }

    let metadata: any = {};
    try {
      if (docRow.metadata_json) {
        metadata =
          typeof docRow.metadata_json === 'string'
            ? JSON.parse(docRow.metadata_json)
            : docRow.metadata_json;
      }
    } catch {
      metadata = {};
    }

    const baseSubjectRaw = metadata.subject || metadata.Subject || docRow.file_name || '';
    const baseSubject = String(baseSubjectRaw)
      .replace(/^(re|fw|fwd):\s*/i, '')
      .trim();
    const threadId = metadata.thread_id || metadata.emailThread || String(docRow.id);

    const candidateRows = db
      .prepare(
        "SELECT id, content, date_created, evidence_type, metadata_json FROM documents WHERE evidence_type = 'email'",
      )
      .all() as any[];

    const messages: CommunicationEvent[] = [];

    for (const row of candidateRows) {
      let m: any = {};
      try {
        if (row.metadata_json) {
          m =
            typeof row.metadata_json === 'string'
              ? JSON.parse(row.metadata_json)
              : row.metadata_json;
        }
      } catch {
        m = {};
      }

      const subject = m.subject || m.Subject || row.file_name || 'No Subject';
      const normalized = String(subject)
        .replace(/^(re|fw|fwd):\s*/i, '')
        .trim();
      const sameThreadId = m.thread_id && m.thread_id === metadata.thread_id;
      const sameSubject = normalized && normalized === baseSubject;

      if (!sameThreadId && !sameSubject) continue;

      const from = m.from || m.From || m.sender || 'Unknown Sender';
      const to = normalizeList(m.to || m.To || m.recipients);
      const cc = normalizeList(m.cc || m.Cc);
      const snippetSource: string = row.content || '';
      const snippet =
        snippetSource.length > 240 ? `${snippetSource.slice(0, 240)}...` : snippetSource;
      const topic = deriveTopic(String(subject || ''), snippetSource || '');

      messages.push({
        documentId: String(row.id),
        threadId,
        subject: String(subject || 'No Subject'),
        date: row.date_created || m.sent || m.date || null,
        from: String(from || 'Unknown Sender'),
        to,
        cc,
        topic,
        evidenceType: row.evidence_type || 'email',
        snippet,
      });
    }

    messages.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const dbTime = b.date ? new Date(b.date).getTime() : 0;
      return da - dbTime;
    });

    return { threadId, messages };
  },
};
