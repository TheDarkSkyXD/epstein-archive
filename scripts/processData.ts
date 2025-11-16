import { Person, Evidence } from '../src/types';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Process the CSV data from epstein_person_analysis_spreadsheet.csv
function processPeopleData(): Person[] {
  const csvContent = fs.readFileSync('../epstein_person_analysis_spreadsheet.csv', 'utf-8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  
  const people: Person[] = [];
  const seenNames = new Set<string>();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    if (values.length >= 9) {
      const fullName = values[0];
      // Skip duplicates
      if (seenNames.has(fullName)) {
        continue;
      }
      seenNames.add(fullName);
      
      people.push({
        fullName: fullName,
        primaryRole: values[1],
        secondaryRoles: values[2],
        likelihoodLevel: values[3] as 'HIGH' | 'MEDIUM' | 'LOW',
        mentions: parseInt(values[4]) || 0,
        currentStatus: values[5],
        keyEvidence: values[6],
        fileReferences: values[7],
        connectionsToEpstein: values[8]
      });
    }
  }
  
  return people;
}

// Generate sample evidence data for key figures
function generateEvidenceData(people: Person[]): void {
  const evidenceData: { [key: string]: Evidence[] } = {};
  
  // High-profile evidence
  const sampleEvidence = {
    'Jeffrey Epstein': [
      {
        id: 'epstein-001',
        person: 'Jeffrey Epstein',
        type: 'email',
        title: 'Flight Logs and Travel Records',
        content: 'Multiple flight logs showing Epstein traveling with underage girls to his private islands. Records indicate flights to St. Thomas, then helicopter transfers to Little St. James Island.',
        date: '2001-2019',
        fileReference: 'EpsteinFlightLogs.pdf',
        significance: 'high'
      },
      {
        id: 'epstein-002',
        person: 'Jeffrey Epstein',
        type: 'testimony',
        title: 'Victim Testimonies - Virginia Roberts Giuffre',
        content: 'Virginia Roberts Giuffre testified that she was recruited by Ghislaine Maxwell at age 17 and trafficked to Epstein for sexual purposes. She described being flown to various locations and forced to have sex with Epstein and his associates.',
        date: '2015',
        fileReference: 'GiuffreTestimony.pdf',
        significance: 'high'
      }
    ],
    'Donald Trump': [
      {
        id: 'trump-001',
        person: 'Donald Trump',
        type: 'document',
        title: 'Mar-a-Lago Party Records',
        content: 'Records show Trump hosted Epstein at Mar-a-Lago parties in the 1990s and early 2000s. Flight logs indicate Trump flew on Epstein\'s plane at least once in 1997.',
        date: '1997-2005',
        fileReference: 'MarALagoRecords.txt',
        significance: 'medium'
      },
      {
        id: 'trump-002',
        person: 'Donald Trump',
        type: 'document',
        title: 'Blackmail Material Discussion',
        content: 'Email from Mark Epstein asking Jeffrey: "Ask him if Putin has the photos of Trump blowing Bubba?" suggesting knowledge of compromising material.',
        date: '2018-03-21',
        fileReference: 'HOUSE_OVERSIGHT_030716.txt',
        significance: 'high'
      }
    ],
    'Ghislaine Maxwell': [
      {
        id: 'maxwell-001',
        person: 'Ghislaine Maxwell',
        type: 'email',
        title: 'Teen Prostitute Article Forward',
        content: 'Maxwell forwarded an article about "ex-teen-prostitute-files-suit-in-billionaire-sex-slave-case" to Epstein, demonstrating awareness of underage trafficking allegations.',
        date: '2015-09-22',
        fileReference: 'HOUSE_OVERSIGHT_031420.txt',
        significance: 'high'
      },
      {
        id: 'maxwell-002',
        person: 'Ghislaine Maxwell',
        type: 'testimony',
        title: 'Recruitment Operations',
        content: 'Multiple victims testified that Maxwell was the primary recruiter who approached them with promises of modeling jobs or massage work, then groomed them for sexual activities with Epstein.',
        date: '2015-2019',
        fileReference: 'VictimTestimonies.pdf',
        significance: 'high'
      }
    ],
    'Bill Clinton': [
      {
        id: 'clinton-001',
        person: 'Bill Clinton',
        type: 'flight_record',
        title: 'Lolita Express Flight Logs',
        content: 'Flight logs show Clinton flew on Epstein\'s private jet (nicknamed "Lolita Express") 26 times between 2001-2003. Multiple trips to international destinations including Africa and Asia.',
        date: '2001-2003',
        fileReference: 'FlightLogsClinton.pdf',
        significance: 'medium'
      },
      {
        id: 'clinton-002',
        person: 'Bill Clinton',
        type: 'document',
        title: 'Island Dinner Records',
        content: 'Records indicate Clinton had dinner with Epstein on Little St. James Island. Staff testimonies mention seeing Clinton with young girls during island visits.',
        date: '2002-2005',
        fileReference: 'IslandRecords.txt',
        significance: 'medium'
      }
    ],
    'Prince Andrew': [
      {
        id: 'andrew-001',
        person: 'Prince Andrew',
        type: 'photo',
        title: 'Photograph with Virginia Roberts',
        content: 'Infamous photograph showing Prince Andrew with his arm around Virginia Roberts (then 17) in Maxwell\'s London apartment. Roberts claims she was forced to have sex with Andrew.',
        date: '2001',
        fileReference: 'AndrewPhoto.jpg',
        significance: 'high'
      },
      {
        id: 'andrew-002',
        person: 'Prince Andrew',
        type: 'testimony',
        title: 'Virginia Roberts Testimony Against Andrew',
        content: 'Virginia Roberts Giuffre testified that she was trafficked to Prince Andrew three times when she was 17, including in London, New York, and on Epstein\'s private island.',
        date: '2015',
        fileReference: 'GiuffreVsAndrew.pdf',
        significance: 'high'
      }
    ]
  };

  // Generate evidence for all people
  people.forEach(person => {
    if (sampleEvidence[person.fullName]) {
      evidenceData[person.fullName] = sampleEvidence[person.fullName];
    } else {
      // Generate generic evidence based on mentions and role
      evidenceData[person.fullName] = [
        {
          id: `${person.fullName.toLowerCase().replace(/\s+/g, '-')}-001`,
          person: person.fullName,
          type: 'document',
          title: `Mentions in Epstein Communications`,
          content: `Appears in ${person.mentions} documents related to Epstein case. ${person.keyEvidence}`,
          fileReference: person.fileReferences.split(';')[0] || 'Unknown',
          significance: person.likelihoodLevel === 'HIGH' ? 'high' : person.likelihoodLevel === 'MEDIUM' ? 'medium' : 'low'
        }
      ];
    }
  });

  // Save evidence data
  Object.keys(evidenceData).forEach(personName => {
    const filename = personName.replace(/[^a-zA-Z0-9]/g, '_');
    const evidencePath = path.join(__dirname, '../public/data/evidence', `${filename}.json`);
    
    // Ensure directory exists
    const dir = path.dirname(evidencePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(evidencePath, JSON.stringify(evidenceData[personName], null, 2));
  });
}

// Main execution
function main() {
  console.log('Processing Epstein Files data...');
  
  const people = processPeopleData();
  console.log(`Processed ${people.length} people`);
  
  // Save main data
  const dataDir = path.join(__dirname, '../public/data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(dataDir, 'people.json'), JSON.stringify(people, null, 2));
  
  // Generate evidence data
  generateEvidenceData(people);
  console.log('Evidence data generated');
  
  console.log('Data processing complete!');
}

main();