import { db, evidenceQueries } from '@epstein/db';

export const evidenceRepository = {
  // Get evidence summary for a specific entity
  getEntityEvidence: async (entityId: string) => {
    // Get entity details
    const [entity] = await evidenceQueries.getEntitySummary.run({ entityId }, db);

    if (!entity) {
      return null;
    }

    // Get evidence linked to this entity
    const evidenceRecords = await evidenceQueries.getEntityEvidence.run(
      { entityId, limit: 100, offset: 0 },
      db,
    );

    // Get evidence type breakdown
    const typeBreakdown = await evidenceQueries.getEvidenceTypeBreakdownByEntity.run(
      { entityId },
      db,
    );

    // Get role breakdown
    const roleBreakdown = await evidenceQueries.getRoleBreakdownByEntity.run({ entityId }, db);

    // Get red flag distribution
    const redFlagDistribution = await evidenceQueries.getRedFlagDistributionByEntity.run(
      { entityId },
      db,
    );

    // Get related entities (entities that appear in same evidence)
    const relatedEntities = await evidenceQueries.getRelatedEntitiesByEntity.run(
      { entityId, limit: 20 },
      db,
    );

    return {
      entity,
      evidence: evidenceRecords,
      stats: {
        totalEvidence: Number(evidenceRecords.length),
        typeBreakdown,
        roleBreakdown,
        redFlagDistribution,
        relatedEntities,
        highRiskCount: evidenceRecords.filter((e: any) => (e.redFlagRating || 0) >= 4).length,
        averageConfidence:
          evidenceRecords.reduce((sum: number, e: any) => sum + (e.confidence || 0), 0) /
            evidenceRecords.length || 0,
      },
    };
  },
  addSnippetToInvestigation: async (
    investigationId: string,
    documentId: string,
    snippetText: string,
    notes: string,
    relevance: string,
  ) => {
    const [doc] = await evidenceQueries.getDocumentDetailsForEvidence.run({ id: documentId }, db);
    if (!doc) {
      throw new Error('Document not found');
    }
    const sourcePath = doc.file_path || `doc:${doc.id}`;
    const [evidenceIdRow] = await evidenceQueries.createEvidenceFull.run(
      {
        evidenceType: doc.evidence_type || 'investigative_report',
        sourcePath,
        originalFilename: doc.file_name || `Document ${doc.id}`,
        title: `Snippet from ${doc.file_name || 'Document'} (${doc.id})`,
        description: notes || '',
        extractedText: snippetText || '',
        redFlagRating: doc.red_flag_rating || 0,
        evidenceTags: '[]',
        metadata: JSON.stringify({ document_id: doc.id }),
      },
      db,
    );
    const evidenceId = String(evidenceIdRow.id);

    const [link] = await evidenceQueries.addEvidenceToInvestigation.run(
      {
        investigationId,
        evidenceId,
        notes: notes || '',
        relevance: relevance || 'medium',
      },
      db,
    );

    const [evidence] = await evidenceQueries.getEvidenceByIdDetailed.run({ id: evidenceId }, db);
    return {
      investigationEvidenceId: link.id,
      evidence,
    };
  },

  // Add evidence to an investigation session
  addEvidenceToInvestigation: async (
    investigationId: string,
    evidenceId: string,
    notes: string,
    relevance: string,
  ) => {
    // Get evidence details
    const [evidence] = await evidenceQueries.getEvidenceByIdDetailed.run({ id: evidenceId }, db);

    if (!evidence) {
      throw new Error('Evidence not found');
    }

    // Get entities linked to this evidence
    const entities = await evidenceQueries.getEvidenceEntities.run({ evidenceId }, db);

    // Insert into investigation_evidence table
    const [result] = await evidenceQueries.addEvidenceToInvestigation.run(
      {
        investigationId,
        evidenceId,
        notes: notes || '',
        relevance: relevance || 'medium',
      },
      db,
    );

    return {
      investigationEvidenceId: result.id,
      evidence,
      entities,
    };
  },
  addMediaToInvestigation: async (
    investigationId: string,
    mediaItemId: string,
    notes: string,
    relevance: string,
  ) => {
    const [media] = await evidenceQueries.getMediaItemForEvidence.run({ id: mediaItemId }, db);
    if (!media) {
      throw new Error('Media not found');
    }
    const sourcePath = media.filePath;
    const [existing] = await evidenceQueries.getEvidenceBySourcePath.run({ sourcePath }, db);

    let evidenceId: string;
    if (existing) {
      evidenceId = String(existing.id);
    } else {
      let metadata: any = {};
      try {
        metadata =
          typeof media.metadataJson === 'string'
            ? JSON.parse(media.metadataJson)
            : media.metadataJson || {};
      } catch {
        metadata = {};
      }
      const transcriptText =
        metadata.external_transcript_text ||
        (Array.isArray(metadata.transcript)
          ? metadata.transcript.map((s: any) => s.text).join('\n')
          : null);
      const evidenceType =
        media.fileType === 'audio' ? 'audio' : media.fileType === 'video' ? 'video' : 'media_scan';

      const tags = await evidenceQueries.getMediaItemTags.run({ mediaItemId }, db);
      const evidenceTags = JSON.stringify(tags.map((t) => t.name));

      const [ins] = await evidenceQueries.createEvidenceFull.run(
        {
          evidenceType,
          sourcePath,
          originalFilename: sourcePath ? sourcePath.split('/').pop()! : `media_${media.id}`,
          title: media.title || `Media ${media.id}`,
          description: media.description || '',
          extractedText: transcriptText || '',
          redFlagRating: Number(media.redFlagRating || 0),
          evidenceTags,
          metadata: JSON.stringify({
            media_item_id: media.id,
            file_type: media.fileType,
            duration: metadata.duration,
            chapters: metadata.chapters,
          }),
        },
        db,
      );
      evidenceId = String(ins.id);

      const people = await evidenceQueries.getMediaItemPeople.run({ mediaItemId }, db);
      for (const p of people) {
        await evidenceQueries.insertEvidenceEntity.run(
          {
            evidenceId,
            entityId: String(p.entity_id),
            role: String(p.role || 'participant'),
            confidence: 0.8,
            mentionContext: '',
          },
          db,
        );
      }
    }

    const [res] = await evidenceQueries.addEvidenceToInvestigation.run(
      {
        investigationId,
        evidenceId,
        notes: notes || '',
        relevance: relevance || 'medium',
      },
      db,
    );

    const [evidence] = await evidenceQueries.getEvidenceByIdDetailed.run({ id: evidenceId }, db);
    return {
      investigationEvidenceId: res.id,
      evidence,
    };
  },

  // Get evidence summary for an investigation
  getInvestigationEvidenceSummary: async (investigationId: string) => {
    // Get all evidence for this investigation
    const evidence = await evidenceQueries.getInvestigationEvidenceSummary.run(
      { investigationId },
      db,
    );

    // Get entity coverage
    const entityCoverage = await evidenceQueries.getInvestigationEntityCoverage.run(
      { investigationId, limit: 50 },
      db,
    );

    return {
      totalEvidence: evidence.length,
      evidence,
      entityCoverage,
      typeBreakdown: evidence.reduce((acc: any, e: any) => {
        acc[e.evidenceType!] = (acc[e.evidenceType!] || 0) + 1;
        return acc;
      }, {}),
      relevanceBreakdown: evidence.reduce((acc: any, e: any) => {
        acc[e.relevance || 'medium'] = (acc[e.relevance || 'medium'] || 0) + 1;
        return acc;
      }, {}),
    };
  },

  // Remove evidence from an investigation
  removeEvidenceFromInvestigation: async (investigationEvidenceId: string) => {
    const result = await evidenceQueries.removeEvidenceFromInvestigation.run(
      { id: investigationEvidenceId },
      db,
    );
    return result.length > 0;
  },

  // Search evidence with filtering and pagination
  searchEvidence: async (params: {
    q?: string;
    type?: string;
    entityId?: string;
    dateFrom?: string;
    dateTo?: string;
    redFlagMin?: string;
    tags?: string;
    page?: string;
    limit?: string;
  }) => {
    const {
      q = '',
      type,
      entityId,
      dateFrom,
      dateTo,
      redFlagMin,
      tags,
      page = '1',
      limit = '20',
    } = params;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const results = await evidenceQueries.searchEvidenceFull.run(
      {
        query: q || '',
        type: type || null,
        entityId: entityId ? String(entityId) : null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        redFlagMin: redFlagMin ? Number(redFlagMin) : null,
        limit: limitNum,
        offset: offset,
      },
      db,
    );

    const [{ total }] = await evidenceQueries.countSearchEvidenceFull.run(
      {
        query: q || '',
        type: type || null,
        entityId: entityId ? String(entityId) : null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        redFlagMin: redFlagMin ? Number(redFlagMin) : null,
      },
      db,
    );

    // Enrich with entities
    const finalResults = await Promise.all(
      results.map(async (result: any) => {
        const entities = await evidenceQueries.getEvidenceEntities.run(
          { evidenceId: result.id },
          db,
        );
        return {
          ...result,
          entities: entities.map((e) => ({
            id: e.id,
            name: e.full_name,
            category: e.primary_role,
            role: e.role,
          })),
          tags: result.evidenceTags ? JSON.parse(result.evidenceTags) : [],
        };
      }),
    );

    const totalNum = Number(total || 0);
    const totalPages = Math.ceil(totalNum / limitNum);

    return {
      results: finalResults,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalNum,
        totalPages,
      },
    };
  },

  // Get single evidence record with full details
  getEvidenceById: async (id: string) => {
    const [evidence] = await evidenceQueries.getEvidenceByIdDetailed.run({ id }, db);

    if (!evidence) {
      return null;
    }

    // Get linked entities
    const entities = await evidenceQueries.getEvidenceEntities.run({ evidenceId: id }, db);

    // Get timeline events if any
    const events = await evidenceQueries.getEvidenceTimelineEvents.run({ evidenceId: id }, db);

    return {
      ...evidence,
      entities,
      events,
      tags: evidence.evidenceTags ? JSON.parse(evidence.evidenceTags) : [],
    };
  },

  // List all evidence types with counts
  getEvidenceTypes: async () => {
    const types = await evidenceQueries.getEvidenceTypeCounts.run(undefined, db);

    // Add descriptions
    const typeDescriptions: Record<string, string> = {
      court_deposition: 'Legal depositions and sworn testimony',
      court_filing: 'Indictments, motions, court exhibits',
      contact_directory: 'Address books, contact lists',
      correspondence: 'Emails, messages',
      financial_record: 'Flight logs, cash ledgers, expense records',
      investigative_report: 'House Oversight Committee productions',
      testimony: 'Victim testimony and witness statements',
      timeline_data: 'Chronological event records',
      media_scan: 'Image scans of documents',
      evidence_list: 'Catalogued evidence inventories',
    };

    const enrichedTypes = types.map((t: any) => ({
      ...t,
      description: typeDescriptions[t.type || ''] || '',
    }));

    return enrichedTypes;
  },

  // Get all evidence associated with an entity
  getEntityEvidenceList: async (
    entityId: string,
    params: { page?: string; limit?: string; type?: string },
  ) => {
    const { page = '1', limit = '20', type } = params;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const results = await evidenceQueries.getEntityEvidenceDetailed.run(
      {
        entityId,
        type: type || null,
        limit: limitNum,
        offset: offset,
      },
      db,
    );

    const [{ total }] = await evidenceQueries.countEntityEvidenceDetailed.run(
      {
        entityId,
        type: type || null,
      },
      db,
    );

    const totalNum = Number(total || 0);
    const totalPages = Math.ceil(totalNum / limitNum);

    return {
      results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalNum,
        totalPages,
      },
    };
  },
};
