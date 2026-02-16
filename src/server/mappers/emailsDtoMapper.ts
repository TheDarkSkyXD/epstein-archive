import type {
  EmailMailboxDto,
  EmailMailboxesResponseDto,
  EmailMessageBodyDto,
  EmailRawMessageDto,
  EmailSearchResponseDto,
  EmailThreadDetailsDto,
  EmailThreadListItemDto,
  EmailThreadsResponseDto,
} from '@shared/dto/emails';

export const mapEmailMailboxDto = (row: any): EmailMailboxDto => ({
  mailboxId: String(row.mailboxId || 'all'),
  entityId: row.entityId == null ? null : Number(row.entityId),
  displayName: String(row.displayName || 'Unknown'),
  totalThreads: Number(row.totalThreads || 0),
  totalMessages: Number(row.totalMessages || 0),
  lastActivityAt: row.lastActivityAt || null,
  riskSummary: row.riskSummary ?? null,
  isJunkSuppressed: Boolean(row.isJunkSuppressed),
});

export const mapEmailMailboxesResponseDto = (payload: any): EmailMailboxesResponseDto => ({
  revisionKey: String(payload?.revisionKey || 'default:v1'),
  data: Array.isArray(payload?.data) ? payload.data.map(mapEmailMailboxDto) : [],
});

export const mapEmailThreadListItemDto = (row: any): EmailThreadListItemDto => ({
  threadId: String(row.threadId || ''),
  subject: String(row.subject || 'No Subject'),
  participants: Array.isArray(row.participants) ? row.participants.map(String) : [],
  participantCount: Number(row.participantCount || 0),
  lastMessageAt: String(row.lastMessageAt || ''),
  snippet: String(row.snippet || ''),
  messageCount: Number(row.messageCount || 0),
  hasAttachments: Boolean(row.hasAttachments),
  linkedEntityIds: Array.isArray(row.linkedEntityIds)
    ? row.linkedEntityIds
        .map((id: unknown) => Number(id))
        .filter((id: number) => Number.isFinite(id))
    : [],
  risk: row.risk == null ? null : Number(row.risk),
  ladder: row.ladder ? String(row.ladder) : null,
  confidence: row.confidence == null ? null : Number(row.confidence),
});

export const mapEmailThreadsResponseDto = (payload: any): EmailThreadsResponseDto => ({
  data: Array.isArray(payload?.data) ? payload.data.map(mapEmailThreadListItemDto) : [],
  meta: {
    total: Number(payload?.meta?.total || 0),
    limit: Number(payload?.meta?.limit || 0),
    hasMore: Boolean(payload?.meta?.hasMore),
    nextCursor: payload?.meta?.nextCursor ? String(payload.meta.nextCursor) : null,
  },
});

export const mapEmailThreadDetailsDto = (payload: any): EmailThreadDetailsDto => ({
  threadId: String(payload?.threadId || ''),
  subject: String(payload?.subject || 'No Subject'),
  messages: Array.isArray(payload?.messages)
    ? payload.messages.map((msg: any) => ({
        messageId: String(msg.messageId || ''),
        threadId: String(msg.threadId || ''),
        subject: String(msg.subject || 'No Subject'),
        from: String(msg.from || ''),
        to: Array.isArray(msg.to) ? msg.to.map(String) : [],
        cc: Array.isArray(msg.cc) ? msg.cc.map(String) : [],
        date: String(msg.date || ''),
        snippet: String(msg.snippet || ''),
        flags: { hasAttachments: Boolean(msg?.flags?.hasAttachments) },
        attachmentsMeta: Array.isArray(msg.attachmentsMeta) ? msg.attachmentsMeta : [],
        linkedEntities: Array.isArray(msg.linkedEntities)
          ? msg.linkedEntities.map((entity: any) => ({
              entityId: Number(entity.entityId || 0),
              name: String(entity.name || ''),
              role: entity.role ? String(entity.role) : null,
            }))
          : [],
        ingestRunId: msg.ingestRunId == null ? null : Number(msg.ingestRunId),
        pipelineVersion: msg.pipelineVersion ? String(msg.pipelineVersion) : null,
        confidence: msg.confidence == null ? null : Number(msg.confidence),
        ladder: msg.ladder ? String(msg.ladder) : null,
        wasAgentic: Boolean(msg.wasAgentic),
        redFlagRating: msg.redFlagRating == null ? null : Number(msg.redFlagRating),
      }))
    : [],
});

export const mapEmailMessageBodyDto = (payload: any): EmailMessageBodyDto => ({
  messageId: String(payload?.messageId || ''),
  cleanedText: String(payload?.cleanedText || ''),
  cleanedHtml: String(payload?.cleanedHtml || ''),
  extractedLinks: Array.isArray(payload?.extractedLinks) ? payload.extractedLinks.map(String) : [],
  extractedEntities: Array.isArray(payload?.extractedEntities)
    ? payload.extractedEntities.map(String)
    : [],
  mimeWarnings: Array.isArray(payload?.mimeWarnings) ? payload.mimeWarnings.map(String) : [],
  parseStatus: String(payload?.parseStatus || 'partial'),
  ingestRunId: payload?.ingestRunId == null ? null : Number(payload.ingestRunId),
  pipelineVersion: payload?.pipelineVersion ? String(payload.pipelineVersion) : null,
  sourceFile: {
    fileName: payload?.sourceFile?.fileName ? String(payload.sourceFile.fileName) : null,
    filePath: payload?.sourceFile?.filePath ? String(payload.sourceFile.filePath) : null,
  },
  rawAvailable: Boolean(payload?.rawAvailable),
});

export const mapEmailRawMessageDto = (payload: any): EmailRawMessageDto => ({
  messageId: String(payload?.messageId || ''),
  raw: String(payload?.raw || ''),
  warning: String(payload?.warning || ''),
  determinism: String(payload?.determinism || ''),
});

export const mapEmailSearchResponseDto = (payload: any): EmailSearchResponseDto => ({
  scope: payload?.scope === 'mailbox' ? 'mailbox' : 'global',
  q: String(payload?.q || ''),
  data: Array.isArray(payload?.data)
    ? payload.data.map((row: any) => ({
        threadId: String(row.threadId || ''),
        messageId: String(row.messageId || ''),
        subject: String(row.subject || ''),
        from: String(row.from || ''),
        date: String(row.date || ''),
        snippet: String(row.snippet || ''),
        highlights: Array.isArray(row.highlights)
          ? row.highlights
              .map((h: any) => ({
                start: Number(h.start || 0),
                end: Number(h.end || 0),
              }))
              .filter(
                (h: { start: number; end: number }) =>
                  Number.isFinite(h.start) && Number.isFinite(h.end),
              )
          : [],
      }))
    : [],
});
