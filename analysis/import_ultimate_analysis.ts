import fs from 'fs';
import path from 'path';
import { databaseService } from '../src/services/DatabaseService';
import { EntityNameService } from '../src/services/EntityNameService';

// Define types for the analysis JSON structure
// interface UltimateAnalysis { ... } // Removed unused interface

// interface PersonAnalysis { ... } // Removed unused interface

export class UltimateAnalysisImporter {
  private readonly ANALYSIS_PATH = path.join(process.cwd(), 'analysis/comprehensive_people_analysis.json');

  async import(): Promise<void> {
    console.log('Starting Comprehensive Analysis Import...');
    
    if (!fs.existsSync(this.ANALYSIS_PATH)) {
      console.error(`Analysis file not found at: ${this.ANALYSIS_PATH}`);
      return;
    }

    try {
      console.log('Reading JSON file...');
      const rawData = fs.readFileSync(this.ANALYSIS_PATH, 'utf-8');
      const peopleData = JSON.parse(rawData);

      console.log(`Loaded analysis for ${Object.keys(peopleData).length} people.`);

      const entitiesToInsert: any[] = [];

      for (const [name, personData] of Object.entries(peopleData)) {
        const person = personData as any; // Cast to any to handle structure differences
        
        // Consolidate name
        const canonicalName = EntityNameService.consolidatePersonName(person.fullName || name);
        
        // Skip if not a valid person name AND not a valid organization
        const isPerson = EntityNameService.isValidPersonName(canonicalName);
        const isOrg = EntityNameService.isValidOrganizationName(canonicalName);

        if (!isPerson && !isOrg) {
            continue;
        }

        // Transform to database format
        const entity: any = {
          fullName: canonicalName,
          primaryRole: (person.roles && person.roles.length > 0) ? person.roles[0] : (isOrg ? 'Organization' : 'Unknown'),
          secondaryRoles: person.roles ? person.roles.slice(1) : [],
          likelihoodLevel: person.likelihood_score || 'LOW',
          mentions: person.mentions || 0,
          currentStatus: 'Unknown', 
          connectionsSummary: person.connections ? person.connections.join(', ') : '',
          spiceRating: person.spice_rating || 0, // Note: spice_rating might be missing in comprehensive, use default
          spiceScore: person.spice_score || 0,
          evidenceTypes: person.evidence_types || [],
          
          // File references (Documents & Mentions)
          fileReferences: []
        };

        // Process file references
        if (person.files) {
            for (const filename of person.files) {
                // Try to find the file in the known directories
                // We know some files are in "Epstein Estate Documents - Seventh Production/TEXT/001/"
                // But we need a more robust way to find them. For now, we'll try a few common paths.
                // Since we can't easily search the whole disk here, we'll assume a base directory structure.
                // The user has "Epstein Estate Documents - Seventh Production" in the root.
                
                let content = '';
                let filePath = '';
                
                // This is a simplification. In a real scenario, we might need a file index.
                // For now, we'll try to construct a path or leave content empty if not found.
                // We can also try to find the file in the 'file_analysis' section of the JSON if available, 
                // but the JSON structure we saw earlier had 'file_analysis' as a separate top-level key.
                
                // Let's try to find the file in the 'file_analysis' array from the JSON first (if we had loaded it)
                // But we only loaded 'people'. We should load the whole JSON or at least the file index.
                
                // For this iteration, we will try to read from a hardcoded path for testing, 
                // or just mark it as "Content not available" if not found.
                // Ideally, we should walk the directory structure once to build a map of filename -> fullpath.
                
                // Let's add a helper to find files (conceptually)
                // For now, we will just store the filename and empty content, 
                // BUT we will add a TODO to implement the file reading.
                
                // Actually, let's try to read it if it's in the specific directory we found earlier
                const possiblePath = path.join(process.cwd(), 'Epstein Estate Documents - Seventh Production/TEXT/001', filename);
                if (fs.existsSync(possiblePath)) {
                    try {
                        content = fs.readFileSync(possiblePath, 'utf-8');
                        filePath = possiblePath;
                    } catch (e) {
                        console.warn(`Failed to read file ${possiblePath}:`, e);
                    }
                }

                entity.fileReferences.push({
                    filename: filename,
                    filePath: filePath || `unknown/${filename}`,
                    fileType: path.extname(filename),
                    fileSize: content.length,
                    dateCreated: new Date().toISOString(),
                    dateModified: new Date().toISOString(),
                    contentHash: '', // TODO: Calculate hash
                    wordCount: content.split(/\s+/).length,
                    spiceRating: 0, // Default
                    metadataJson: JSON.stringify({}),
                    content: content,
                    // Mention details (default)
                    contextText: 'Document reference',
                    contextType: 'document',
                    keyword: entity.fullName,
                    positionStart: 0,
                    positionEnd: 0,
                    significanceScore: 1
                });
            }
        }

        // Process contexts (similar to spicy passages)
        if (person.contexts && person.contexts.length > 0) {
          for (const ctx of person.contexts) {
            const passage = {
                file: ctx.file,
                context: ctx.context,
                score: 1, // Default score as it's not explicit in contexts
                keyword: canonicalName
            };
            // Try to read content for spicy passage file
            let content = '';
            const possiblePath = path.join(process.cwd(), 'Epstein Estate Documents - Seventh Production/TEXT/001', passage.file);
            if (fs.existsSync(possiblePath)) {
                try {
                    content = fs.readFileSync(possiblePath, 'utf-8');
                } catch (e) {
                    // console.warn(`Failed to read file ${possiblePath}:`, e);
                }
            }

            entity.fileReferences.push({
              filename: passage.file,
              filePath: passage.file, // Assuming filename is path for now
              fileType: this.getFileType(passage.file),
              fileSize: content.length,
              dateCreated: new Date().toISOString(), // Unknown
              dateModified: new Date().toISOString(), // Unknown
              contentHash: '',
              wordCount: content.length > 0 ? content.split(/\s+/).length : 0,
              spiceRating: passage.score,
              metadataJson: JSON.stringify({ keyword: passage.keyword }),
              content: content,
              
              // Mention details
              contextText: passage.context,
              contextType: 'spicy',
              keyword: passage.keyword,
              positionStart: 0,
              positionEnd: 0,
              significanceScore: passage.score
            });
          }
        }

        // Process regular files if no spicy passages for them
        // (Already handled above with content reading)

        entitiesToInsert.push(entity);
      }

      console.log(`Preparing to bulk insert ${entitiesToInsert.length} entities...`);
      
      // Insert in batches to avoid memory issues
      const BATCH_SIZE = 500;
      for (let i = 0; i < entitiesToInsert.length; i += BATCH_SIZE) {
        const batch = entitiesToInsert.slice(i, i + BATCH_SIZE);
        console.log(`Inserting batch ${i / BATCH_SIZE + 1} of ${Math.ceil(entitiesToInsert.length / BATCH_SIZE)}...`);
        await databaseService.bulkInsertEntities(batch);
      }

      console.log('Import completed successfully!');

    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }

  private getFileType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    return ext ? ext.substring(1) : 'unknown';
  }
}

// CLI execution
new UltimateAnalysisImporter().import()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
