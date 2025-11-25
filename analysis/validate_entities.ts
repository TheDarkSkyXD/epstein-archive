import { databaseService } from '../src/services/DatabaseService';
import { EntityNameService } from '../src/services/EntityNameService';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  id: string;
  name: string;
  isValid: boolean;
  reason?: string;
}

async function validateAllEntities(): Promise<{
  valid: ValidationResult[];
  invalid: ValidationResult[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    validPercentage: number;
    invalidPercentage: number;
  };
}> {
  console.log('Starting entity validation...\n');

  const batchSize = 1000;
  let offset = 0;
  const validEntities: ValidationResult[] = [];
  const invalidEntities: ValidationResult[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await databaseService.getEntities(
      Math.floor(offset / batchSize) + 1,
      batchSize
    );

    if (result.entities.length === 0) break;

    for (const entity of result.entities) {
      const isValid = EntityNameService.isValidEntity(entity.fullName);
      
      const validationResult: ValidationResult = {
        id: entity.id,
        name: entity.fullName,
        isValid
      };

      if (!isValid) {
        // Determine reason for rejection
        const words = entity.fullName.split(/\s+/);
        const lowerWords = words.map(w => w.toLowerCase());
        const firstWord = lowerWords[0];
        const lastWord = lowerWords[lowerWords.length - 1];

        if (words.length < 2) {
          validationResult.reason = 'Too few words';
        } else if (words.length > 5) {
          validationResult.reason = 'Too many words (likely phrase)';
        } else if (firstWord && /^(abandoned|about|according|across|after|against|along|already|also|although|among|announced|appeared|around|arrived|asked|became|before|began|behind|being|believe|below|between|beyond|brought|called|came|cannot|certainly|clearly|close|come|coming|considered|continued|could|created|decided|despite|different|directly|discovered|does|doing|done|down|during|ended|enough|especially|even|eventually|expected|explained|felt|finally|finished|first|followed|following|former|found|from|further|gave|generally|getting|given|goes|going|gone|great|happened|hardly|having|held|help|helped|helping|hence|higher|highest|however|immediately|important|including|indeed|instead|into|involved|just|keep|kept|knew|know|known|large|largely|last|later|latest|least|left|less|like|likely|little|long|longer|looked|looking|lost|made|mainly|make|making|many|maybe|mean|means|meanwhile|might|more|moreover|most|mostly|moved|much|must|near|nearly|need|needed|neither|never|next|none|nothing|nowhere|obtained|often|once|only|onto|opened|other|others|otherwise|outside|over|particular|particularly|past|perhaps|placed|possible|possibly|present|presented|previously|probably|quite|rather|reached|really|recent|recently|regarding|related|relatively|remained|reported|required|resulted|said|same|saying|says|second|seeing|seem|seemed|seems|seen|sent|several|should|showed|shown|shows|significant|significantly|similar|similarly|since|some|someone|something|sometimes|somewhat|somewhere|soon|sought|spent|started|still|stopped|such|suddenly|suggested|taken|taking|than|that|their|theirs|them|themselves|then|there|therefore|these|they|thing|things|think|third|this|those|though|thought|three|through|throughout|thus|together|told|took|toward|towards|tried|tries|trying|turned|under|unless|unlike|until|upon|used|useful|using|usually|various|very|wanted|well|went|were|what|whatever|when|whenever|where|whereas|wherever|whether|which|while|whole|whom|whose|widely|will|with|within|without|would|your|yours|yourself|yourselves)$/i.test(firstWord)) {
          validationResult.reason = 'Starts with common verb/word';
        } else if (firstWord && /^(about|according|across|after|against|along|although|among|around|at|because|before|behind|below|beneath|beside|besides|between|beyond|but|by|concerning|considering|despite|down|during|except|for|from|if|in|including|inside|into|like|near|of|off|on|onto|out|outside|over|past|regarding|since|through|throughout|to|toward|towards|under|underneath|unlike|until|up|upon|via|with|within|without)$/i.test(firstWord)) {
          validationResult.reason = 'Starts with preposition';
        } else if (lastWord && /^(of|from|in|at|on|to|for|with|by|about|against|among|between|into|through|during|before|after|above|below|under|over|and|or|but|directly|immediately|quickly|slowly|carefully|easily|hardly|nearly|really|simply|truly|actually|basically|certainly|clearly|completely|definitely|especially|exactly|extremely|finally|fully|generally|greatly|highly|largely|likely|mainly|mostly|naturally|normally|obviously|particularly|possibly|potentially|previously|primarily|probably|properly|quite|rarely|recently|regularly|relatively|seriously|significantly|similarly|slightly|specifically|strongly|successfully|suddenly|supposedly|surely|totally|typically|ultimately|unfortunately|usually|virtually|widely)$/i.test(lastWord)) {
          validationResult.reason = 'Ends with preposition/conjunction/adverb';
        } else if (/\s+(may|might|can|could|will|would|shall|should|must)\s+(be|have|do|make|get|take|give|go|come|see|know|think|want|use|find|tell|ask|work|seem|feel|try|leave|call|keep|let|begin|help|show|hear|play|run|move|live|believe|bring|happen|write|provide|sit|stand|lose|pay|meet|include|continue|set|learn|change|lead|understand|watch|follow|stop|create|speak|read|allow|add|spend|grow|open|walk|win|offer|remember|love|consider|appear|buy|wait|serve|die|send|expect|build|stay|fall|cut|reach|kill|remain|suggest|raise|pass|sell|require|report|decide|pull|choose)\s+/i.test(entity.fullName)) {
          validationResult.reason = 'Contains modal verb + infinitive pattern';
        } else if (/^(president|senator|governor|professor|prince|princess|king|queen|duke|duchess|lord|lady|sir|dr|mr|mrs|ms|miss)\s+(of|from|in|at|on|to|for|with|by|and|or|but|finished|going|made|watched|praising|ended|started|began|said|told|asked|wanted|needed|felt|thought|knew|believed|hoped|tried|attempted|decided|chose|selected|picked|named|called|titled|labeled|marked|noted|mentioned|stated|declared|announced|proclaimed|revealed|disclosed|exposed|showed|demonstrated|proved|confirmed|verified|validated|established|determined|concluded|found|discovered|learned|realized|understood|recognized|acknowledged|admitted|accepted|agreed|approved|endorsed|supported|backed|favored|preferred|liked|loved|enjoyed|appreciated|valued|treasured|cherished|adored|worshipped|honored|respected|admired|praised|commended|complimented|congratulated|celebrated|commemorated|remembered|recalled|recollected|reminisced|reflected|pondered|considered|contemplated|meditated|mused|wondered|questioned|doubted|suspected|assumed|presumed|supposed|imagined|envisioned|pictured|visualized|conceived|created|invented|devised|designed|planned|plotted|schemed|strategized|organized|arranged|prepared|readied|equipped|armed|fortified|strengthened|reinforced|bolstered|enhanced|improved|upgraded|updated|modernized|renovated|refurbished|restored|repaired|fixed|mended|patched|corrected|rectified|remedied|resolved|solved|settled|concluded|ended|finished|completed|accomplished|achieved|attained|reached|arrived|came|went|left|departed|exited|escaped|fled|ran|rushed|hurried|hastened|sped|raced|dashed|sprinted|bolted|charged|attacked|assaulted|struck|hit|beat|pounded|smashed|crashed|collided|bumped|knocked|tapped|touched|felt|grabbed|grasped|gripped|held|clutched|seized|snatched|caught|captured|trapped|ensnared|entangled|tangled|twisted|turned|rotated|spun|whirled|twirled|swirled|circled|orbited|revolved|rolled|tumbled|fell|dropped|plunged|plummeted|descended|sank|submerged|dived|dove|jumped|leaped|hopped|skipped|bounced|rebounded|ricocheted|deflected|reflected|refracted|bent|curved|arched|bowed|stooped|crouched|knelt|kneeled|squatted|sat|seated|perched|rested|relaxed|reclined|lay|laid|sprawled|stretched|extended|reached|expanded|grew|increased|multiplied|doubled|tripled|quadrupled|quintupled|sextupled|septupled|octupled|nonupled|decupled|rose|raised|lifted|elevated|hoisted|heaved|hauled|pulled|tugged|yanked|jerked|dragged|towed|trawled|fished|hunted|searched|sought|looked|scanned|surveyed|examined|inspected|investigated|explored|probed|delved|dug|excavated|unearthed|uncovered|revealed|exposed|disclosed|divulged|leaked|spilled|poured|flowed|streamed|gushed|spurted|sprayed|splashed|spattered|splattered|scattered|dispersed|spread|distributed|allocated|assigned|designated|appointed|nominated|elected|selected|chose|picked|opted|decided|determined|resolved|concluded|judged|ruled|decreed|ordained|commanded|ordered|directed|instructed|guided|led|conducted|managed|controlled|regulated|governed|administered|supervised|oversaw|monitored|watched|observed|noticed|noted|marked|highlighted|emphasized|stressed|underscored|underlined|italicized|bolded|capitalized|uppercased|lowercased|titled|headed|captioned|labeled|tagged|categorized|classified|grouped|sorted|organized|arranged|ordered|sequenced|ranked|rated|graded|scored|evaluated|assessed|appraised|estimated|calculated|computed|figured|reckoned|counted|numbered|enumerated|tallied|totaled|summed|added|subtracted|multiplied|divided|split|separated|parted|divorced|severed|cut|sliced|diced|chopped|minced|ground|crushed|smashed|pulverized|powdered|atomized|vaporized|evaporated|condensed|liquefied|solidified|froze|melted|thawed|heated|warmed|cooled|chilled|refrigerated|iced|glazed|coated|covered|wrapped|enveloped|enclosed|encased|packaged|boxed|crated|containerized|bottled|canned|jarred|bagged|sacked|pouched|pocketed|pockmarked|scarred|marked|branded|stamped|sealed|signed|initialed|autographed|endorsed|inscribed|engraved|etched|carved|sculpted|molded|shaped|formed|fashioned|crafted|made|built|constructed|erected|assembled|compiled|composed|wrote|authored|penned|drafted|scripted|typed|printed|published|issued|released|launched|introduced|unveiled|debuted|premiered|opened|started|began|initiated|commenced|originated|founded|established|instituted|created|formed|organized|set|setup|installed|implemented|executed|performed|conducted|carried|did|done|doing|does)\s+/i.test(entity.fullName)) {
          validationResult.reason = 'Title + non-name word';
        } else if (/\s+(of|from|in|at|on|to|for|with|by|about|against|among|between|into|through|during|before|after|above|below|under|over)\s+(the|a|an|this|that|these|those|his|her|their|our|my|your|its)\s+/i.test(entity.fullName)) {
          validationResult.reason = 'Preposition + article pattern';
        } else if (/\s+(and|or|but)\s+.*\s+(and|or|but)\s+/i.test(entity.fullName)) {
          validationResult.reason = 'Multiple conjunctions';
        } else {
          validationResult.reason = 'Failed validation (improper structure)';
        }

        invalidEntities.push(validationResult);
      } else {
        validEntities.push(validationResult);
      }
    }

    offset += batchSize;
    console.log(`Processed ${offset} entities... (Valid: ${validEntities.length}, Invalid: ${invalidEntities.length})`);

    if (result.entities.length < batchSize) break;
  }

  const total = validEntities.length + invalidEntities.length;
  const stats = {
    total,
    valid: validEntities.length,
    invalid: invalidEntities.length,
    validPercentage: (validEntities.length / total) * 100,
    invalidPercentage: (invalidEntities.length / total) * 100
  };

  console.log('\n=== Validation Complete ===');
  console.log(`Total entities: ${stats.total}`);
  console.log(`Valid entities: ${stats.valid} (${stats.validPercentage.toFixed(2)}%)`);
  console.log(`Invalid entities: ${stats.invalid} (${stats.invalidPercentage.toFixed(2)}%)`);

  return { valid: validEntities, invalid: invalidEntities, stats };
}

async function generateReport(results: Awaited<ReturnType<typeof validateAllEntities>>) {
  const reportDir = path.join(process.cwd(), 'validation_reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Save invalid entities list
  const invalidEntitiesPath = path.join(reportDir, `invalid_entities_${timestamp}.json`);
  fs.writeFileSync(invalidEntitiesPath, JSON.stringify(results.invalid, null, 2));
  console.log(`\nInvalid entities saved to: ${invalidEntitiesPath}`);

  // Save valid entities list
  const validEntitiesPath = path.join(reportDir, `valid_entities_${timestamp}.json`);
  fs.writeFileSync(validEntitiesPath, JSON.stringify(results.valid, null, 2));
  console.log(`Valid entities saved to: ${validEntitiesPath}`);

  // Generate summary report
  const reasonCounts: { [key: string]: number } = {};
  for (const entity of results.invalid) {
    const reason = entity.reason || 'Unknown';
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  }

  const summaryReport = {
    timestamp: new Date().toISOString(),
    stats: results.stats,
    invalidReasons: reasonCounts,
    sampleInvalid: results.invalid.slice(0, 100),
    sampleValid: results.valid.slice(0, 100)
  };

  const summaryPath = path.join(reportDir, `validation_summary_${timestamp}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(summaryReport, null, 2));
  console.log(`Summary report saved to: ${summaryPath}`);

  // Generate human-readable report
  const readableReport = `
# Entity Validation Report
Generated: ${new Date().toISOString()}

## Statistics
- Total Entities: ${results.stats.total.toLocaleString()}
- Valid Entities: ${results.stats.valid.toLocaleString()} (${results.stats.validPercentage.toFixed(2)}%)
- Invalid Entities: ${results.stats.invalid.toLocaleString()} (${results.stats.invalidPercentage.toFixed(2)}%)

## Invalid Entity Reasons
${Object.entries(reasonCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([reason, count]) => `- ${reason}: ${count.toLocaleString()} (${((count / results.invalid.length) * 100).toFixed(2)}%)`)
  .join('\n')}

## Sample Invalid Entities (First 50)
${results.invalid.slice(0, 50).map(e => `- "${e.name}" (${e.reason})`).join('\n')}

## Sample Valid Entities (First 50)
${results.valid.slice(0, 50).map(e => `- "${e.name}"`).join('\n')}
`;

  const readablePath = path.join(reportDir, `validation_report_${timestamp}.md`);
  fs.writeFileSync(readablePath, readableReport);
  console.log(`Readable report saved to: ${readablePath}`);

  return {
    invalidEntitiesPath,
    validEntitiesPath,
    summaryPath,
    readablePath
  };
}

async function main() {
  try {
    console.log('=== Entity Validation Script ===\n');
    
    const results = await validateAllEntities();
    const reportPaths = await generateReport(results);

    console.log('\n=== Next Steps ===');
    console.log('1. Review the validation report');
    console.log('2. Check sample invalid entities for false positives');
    console.log('3. If satisfied, run cleanup script with the invalid entities JSON');
    console.log(`\nCleanup command:`);
    console.log(`npx tsx analysis/cleanup_invalid_entities.ts ${reportPaths.invalidEntitiesPath}`);

  } catch (error) {
    console.error('Error during validation:', error);
    process.exit(1);
  }
}

main();
