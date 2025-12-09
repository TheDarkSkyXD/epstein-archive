import Database from 'better-sqlite3';

export interface EvidenceLink {
  id: number;
  uuid: string;
  hypothesis_id: number;
  evidence_type: 'document' | 'entity' | 'relationship' | 'event';
  evidence_id: string;
  role: 'supporting' | 'contradicting' | 'contextual' | 'speculative';
  note?: string;
  added_by: string;
  added_at: string;
}

export interface CreateEvidenceLinkInput {
  hypothesisId: number;
  evidenceType: 'document' | 'entity' | 'relationship' | 'event';
  evidenceId: string;
  role: 'supporting' | 'contradicting' | 'contextual' | 'speculative';
  note?: string;
  addedBy: string;
}

export class EvidenceLinkService {
  constructor(private db: Database.Database) {}

  async getEvidenceLinks(hypothesisId: number): Promise<EvidenceLink[]> {
    const links = this.db.prepare(`
      SELECT id, uuid, hypothesis_id, evidence_type, evidence_id, role, note, added_by, added_at
      FROM hypothesis_evidence_links
      WHERE hypothesis_id = ?
      ORDER BY added_at DESC
    `).all(hypothesisId) as any[];
    
    return links.map(l => this.mapEvidenceLink(l));
  }

  async createEvidenceLink(data: CreateEvidenceLinkInput): Promise<EvidenceLink> {
    const stmt = this.db.prepare(`
      INSERT INTO hypothesis_evidence_links (hypothesis_id, evidence_type, evidence_id, role, note, added_by)
      VALUES (@hypothesisId, @evidenceType, @evidenceId, @role, @note, @addedBy)
    `);
    
    const result = stmt.run({
      hypothesisId: data.hypothesisId,
      evidenceType: data.evidenceType,
      evidenceId: data.evidenceId,
      role: data.role,
      note: data.note || null,
      addedBy: data.addedBy
    });
    
    const link = await this.getEvidenceLinkById(result.lastInsertRowid as number);
    if (!link) {
      throw new Error('Failed to create evidence link');
    }
    
    return link;
  }

  async getEvidenceLinkById(id: number): Promise<EvidenceLink | null> {
    const link = this.db.prepare(`
      SELECT id, uuid, hypothesis_id, evidence_type, evidence_id, role, note, added_by, added_at
      FROM hypothesis_evidence_links WHERE id = ?
    `).get(id) as any;
    
    if (!link) return null;
    
    return this.mapEvidenceLink(link);
  }

  async deleteEvidenceLink(id: number): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM hypothesis_evidence_links WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private mapEvidenceLink(row: any): EvidenceLink {
    return {
      id: row.id,
      uuid: row.uuid,
      hypothesis_id: row.hypothesis_id,
      evidence_type: row.evidence_type,
      evidence_id: row.evidence_id,
      role: row.role,
      note: row.note,
      added_by: row.added_by,
      added_at: row.added_at
    };
  }
}
