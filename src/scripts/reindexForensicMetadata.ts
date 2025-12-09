import { databaseService } from '../services/DatabaseService';

function computeFKGL(text: string) {
  const sentences = text.split(/[.!?]+/).filter(s=>s.trim().length>0).length || 1;
  const wordsArr = (text.match(/\b[\w']+\b/g) || []);
  const words = wordsArr.length || 1;
  const syllables = wordsArr.reduce((acc,w)=>{
    const m = (w.toLowerCase().match(/[aeiouy]+/g) || []).length;
    return acc + Math.max(1, m);
  },0);
  return Math.round((0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59) * 10) / 10;
}

function simpleSentiment(text: string) {
  const pos = ['good','excellent','positive','beneficial','success','credibility'];
  const neg = ['bad','poor','negative','fraud','crime','risk','issue','problem'];
  const t = text.toLowerCase();
  const score = pos.reduce((s,w)=>s + (t.includes(w)?1:0),0) - neg.reduce((s,w)=>s + (t.includes(w)?1:0),0);
  return score > 1 ? 'positive' : score < -1 ? 'negative' : 'neutral';
}

async function reindex() {
  const db = databaseService.getDatabase();
  const ids = db.prepare('SELECT id FROM documents').all() as { id: number }[];
  for (const row of ids) {
    const id = row.id;
    const doc = await databaseService.getDocumentById(String(id));
    const meta: any = doc?.metadata || {};
    const content: string = doc?.content || '';
    const wordCount = doc?.wordCount || (content ? (content.match(/\b[\w']+\b/g) || []).length : 0);
    const fkgl = computeFKGL(content);
    const ttr = (()=>{ const words = (content.match(/\b[\w']+\b/g) || []).map(w=>w.toLowerCase()); const uniq = new Set(words); return words.length ? Math.round((uniq.size/words.length)*1000)/10 : 0; })();
    const sentiment = simpleSentiment(content);
    const created = doc?.dateCreated ? new Date(doc.dateCreated) : new Date();
    const businessHours = created.getHours() >= 9 && created.getHours() <= 17;
    const dayOfWeek = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][created.getUTCDay()];
    const mentionRows = db.prepare('SELECT e.red_flag_rating as r FROM entity_mentions em JOIN entities e ON e.id = em.entity_id WHERE em.document_id = ?').all(id) as any[];
    const entityMentions = mentionRows.length;
    const entityDensity = wordCount ? Math.round((entityMentions / Math.max(1, wordCount) * 100000)) / 100 : 0;
    const riskScore = mentionRows.length ? Math.round((mentionRows.reduce((s,m)=>s + (m.r || 0),0) / (mentionRows.length * 5)) * 100) : 0;
    const technical = { producer: meta.producer || meta.pdf_producer || undefined, creator: meta.creator || meta.pdf_creator || undefined, creationDate: meta.creationDate || doc?.dateCreated || undefined, modificationDate: meta.modificationDate || doc?.dateModified || undefined, gps: meta.gps || null };
    const structural = { containsJavascript: meta.containsJavascript ?? false, fontCount: meta.fontCount ?? null, pdfVersion: meta.pdfVersion ?? null };
    const metrics = { technical, structural, linguistic: { readabilityFKGL: fkgl, sentiment, typeTokenRatio: ttr }, temporal: { businessHours, dayOfWeek }, network: { entityDensityPer1000Words: entityDensity, riskScore } };
    db.prepare('INSERT INTO document_forensic_metrics (document_id, metrics_json, updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(document_id) DO UPDATE SET metrics_json=excluded.metrics_json, updated_at=CURRENT_TIMESTAMP').run(id, JSON.stringify(metrics));
  }
  console.log(`Reindexed ${ids.length} documents.`);
}

reindex().catch(err => { console.error(err); process.exit(1); });
