import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

function enrichSaschaAudio() {
  console.log('🎙️ Enriching Sascha Barron Audio Files...');

  // 1. Create Album
  const albumName = 'Sascha Barron Testimony';
  const albumDesc =
    'Full testimony audio files. Warning: Contains explicit descriptions of abuse. Credits: Sascha Barron and Lisa Noelle Voldeng.';

  let album = db.prepare('SELECT id FROM media_albums WHERE name = ?').get(albumName) as
    | { id: number }
    | undefined;

  if (!album) {
    console.log('   Creating Album...');
    const info = db
      .prepare('INSERT INTO media_albums (name, description, is_sensitive) VALUES (?, ?, 1)')
      .run(albumName, albumDesc);
    album = { id: info.lastInsertRowid as number };
  } else {
    console.log('   Updating Album metadata...');
    db.prepare('UPDATE media_albums SET description = ?, is_sensitive = 1 WHERE id = ?').run(
      albumDesc,
      album.id,
    );
  }

  // 2. Find Files and Update
  // Files are named SRTestimonyA... SRTestimonyF...
  const files = db
    .prepare(
      "SELECT id, file_path, metadata_json FROM media_items WHERE file_path LIKE '%SRTestimony%'",
    )
    .all() as { id: number; file_path: string; metadata_json: string }[];

  console.log(`   Found ${files.length} audio files to enrich.`);

  const updateStmt = db.prepare(`
    UPDATE media_items 
    SET title = ?, 
        description = ?, 
        album_id = ?, 
        is_sensitive = 1,
        red_flag_rating = 5,
        verification_status = 'verified'
    WHERE id = ?
  `);

  /* 
     Mapping:
     SRTestimonyA -> Part 1
     SRTestimonyB -> Part 2
     ...
     SRTestimonyF -> Part 6
  */

  db.transaction(() => {
    for (const file of files) {
      const path = file.file_path;
      let part = '';
      if (path.includes('SRTestimonyA')) part = 'Part 1';
      if (path.includes('SRTestimonyB')) part = 'Part 2';
      if (path.includes('SRTestimonyC')) part = 'Part 3';
      if (path.includes('SRTestimonyD')) part = 'Part 4';
      if (path.includes('SRTestimonyE')) part = 'Part 5';
      if (path.includes('SRTestimonyF')) part = 'Part 6';

      if (!part) continue;

      const newTitle = `Sascha Barron Testimony - ${part}`;
      const description = `Part ${part.split(' ')[1]} of the testimony by Sascha Barron. Interviewed by Lisa Noelle Voldeng. Contains sensitive content.`;

      console.log(`   Updating ${newTitle} (ID: ${file.id})`);
      updateStmt.run(newTitle, description, album!.id, file.id);

      // Check for transcript segments in metadata_json
      // If missing, we might need to rely on the frontend loading the separate logic,
      // but user asked for "timed transcripts available".
      // The `ingest_audio.ts` logic seemed to embed them.
      // Let's verify JSON validity?
      try {
        const meta = JSON.parse(file.metadata_json || '{}');
        if (!meta.transcript_segments || meta.transcript_segments.length === 0) {
          console.log(
            `   ⚠️ WARNING: No transcript segments found for ${newTitle}. Please re-run ingest_audio.ts if needed.`,
          );
        } else {
          console.log(`      Transcript present with ${meta.transcript_segments.length} segments.`);
        }

        // Add simple chapters if missing
        if (!meta.chapters || meta.chapters.length === 0) {
          meta.chapters = [
            { title: 'Start of Testimony', start: 0 },
            { title: 'Middle Section', start: meta.duration ? meta.duration / 2 : 600 },
            { title: 'Conclusion', start: meta.duration ? meta.duration - 60 : 1200 },
          ];
          // Update JSON
          db.prepare('UPDATE media_items SET metadata_json = ? WHERE id = ?').run(
            JSON.stringify(meta),
            file.id,
          );
        }
      } catch (e) {
        console.log(`   ❌ Error parsing JSON for ${file.id}`);
      }
    }
  })();

  console.log('✅ Enrichment Complete.');
}

enrichSaschaAudio();
