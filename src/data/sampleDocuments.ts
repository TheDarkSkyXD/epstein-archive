import { Document } from '../types/documents';

// Sample documents that represent realistic Epstein files content
export const sampleDocuments: Omit<Document, 'id'>[] = [
  {
    filename: "EPSTEIN_EMAIL_001.txt",
    title: "Re: Meeting with Prince Andrew",
    content: `From: jeffrey.epstein@epstein.com
To: ghislaine.maxwell@maxwell.com
Date: March 15, 2005
Subject: Re: Meeting with Prince Andrew

Ghislaine,

The meeting with Prince Andrew went very well. He's quite interested in our "special services" and has already booked another flight to Little St. James for next month. Virginia Roberts will be joining us again - she seems to have made quite an impression on him during their last encounter.

I've arranged for the usual accommodations and have made sure all the girls are aware of the "special requirements" for royal guests. The massage table has been set up in the usual location, and I've instructed the staff to ensure complete privacy during his stay.

Please make sure the NDA forms are ready for signature. We can't afford any leaks about these visits, especially given the media attention surrounding the Prince lately.

Best,
Jeffrey

P.S. - Don't forget to have the flight logs updated to reflect the "official" passenger manifest. We need to be careful about these records.`,
    fileType: "email",
    fileSize: 892,
    dateCreated: "2005-03-15",
    metadata: {
      author: "jeffrey.epstein@epstein.com",
      recipient: "ghislaine.maxwell@maxwell.com",
      subject: "Re: Meeting with Prince Andrew",
      tags: ["royalty", "flight", "island", "massage"],
      categories: ["email", "royal-connections"],
      confidentiality: "confidential",
      source: "Email Archive"
    },
    entities: [
      { name: "Jeffrey Epstein", type: "person", mentions: 2, contexts: [], significance: "high", relatedEntities: ["Ghislaine Maxwell", "Prince Andrew", "Virginia Roberts"] },
      { name: "Ghislaine Maxwell", type: "person", mentions: 1, contexts: [], significance: "high", relatedEntities: ["Jeffrey Epstein"] },
      { name: "Prince Andrew", type: "person", mentions: 2, contexts: [], significance: "high", relatedEntities: ["Jeffrey Epstein", "Virginia Roberts"] },
      { name: "Virginia Roberts", type: "person", mentions: 1, contexts: [], significance: "high", relatedEntities: ["Prince Andrew"] },
      { name: "Little St. James", type: "location", mentions: 1, contexts: [], significance: "high", relatedEntities: [] }
    ],
    passages: [],
    redFlagScore: 28,
    redFlagRating: 3,
    redFlagPeppers: "🌶️🌶️🌶️",
    redFlagDescription: "Moderately spicy - Notable controversial mentions"
  },
  
  {
    filename: "FLIGHT_LOG_2005_03.txt",
    title: "Flight Log - March 2005",
    content: `FLIGHT LOG - LITTLE ST. JAMES AIRPORT
N-Number: N909JE
Tail Number: N909JE

Date: March 20, 2005
Flight: LSJ-2005-0320
From: Palm Beach International (PBI)
To: Little St. James Island (LSJ)

PASSENGER MANIFEST:
1. Jeffrey Epstein (Owner)
2. Ghislaine Maxwell
3. Prince Andrew
4. Virginia Roberts
5. Sarah Kellen
6. Nadia Marcinkova
7. Adriana Ross

FLIGHT CREW:
Captain: Larry Visoski
Co-Pilot: David Rodgers

SPECIAL NOTES:
- VIP passenger requires enhanced privacy protocols
- All standard security procedures to be followed
- Ground transportation arranged for St. Thomas arrival
- Return flight scheduled for March 22, 2005

MAINTENANCE NOTES:
- Aircraft serviced and inspected per schedule
- All systems operational
- Fuel capacity confirmed for return journey

This flight log is the official record of all passengers and crew aboard aircraft N909JE for the date specified above.

Signature: ________________
Date: March 20, 2005`,
    fileType: "txt",
    fileSize: 756,
    dateCreated: "2005-03-20",
    metadata: {
      flightNumber: "LSJ-2005-0320",
      flightDate: "March 20, 2005",
      flightFrom: "Palm Beach International (PBI)",
      flightTo: "Little St. James Island (LSJ)",
      tags: ["flight", "prince", "virginia", "island"],
      categories: ["flight-log", "travel-records"],
      confidentiality: "public",
      source: "Flight Logs"
    },
    entities: [
      { name: "Jeffrey Epstein", type: "person", mentions: 1, contexts: [], significance: "high", relatedEntities: [] },
      { name: "Ghislaine Maxwell", type: "person", mentions: 1, contexts: [], significance: "high", relatedEntities: [] },
      { name: "Prince Andrew", type: "person", mentions: 1, contexts: [], significance: "high", relatedEntities: [] },
      { name: "Virginia Roberts", type: "person", mentions: 1, contexts: [], significance: "high", relatedEntities: [] },
      { name: "Sarah Kellen", type: "person", mentions: 1, contexts: [], significance: "medium", relatedEntities: [] },
      { name: "Nadia Marcinkova", type: "person", mentions: 1, contexts: [], significance: "medium", relatedEntities: [] },
      { name: "Adriana Ross", type: "person", mentions: 1, contexts: [], significance: "medium", relatedEntities: [] },
      { name: "Larry Visoski", type: "person", mentions: 1, contexts: [], significance: "low", relatedEntities: [] },
      { name: "David Rodgers", type: "person", mentions: 1, contexts: [], significance: "low", relatedEntities: [] },
      { name: "Little St. James Island", type: "location", mentions: 2, contexts: [], significance: "high", relatedEntities: [] },
      { name: "Palm Beach International", type: "location", mentions: 1, contexts: [], significance: "medium", relatedEntities: [] }
    ],
    passages: [],
    redFlagScore: 32,
    redFlagRating: 4,
    redFlagPeppers: "🌶️🌶️🌶️🌶️",
    redFlagDescription: "Very spicy - Significant incriminating content"
  },

  {
    filename: "DEPOSITION_VIRGINIA_001.txt",
    title: "Deposition of Virginia Roberts - January 2015",
    content: `DEPOSITION OF VIRGINIA ROBERTS
Case No. 15-CV-07433-RWS

Date: January 20, 2015
Location: Federal Courthouse, New York
Taken by: Attorney Bradley Edwards

Q: Please state your name for the record.
A: Virginia Giuffre, formerly Virginia Roberts.

Q: How old were you when you first met Jeffrey Epstein?
A: I was 16 years old.

Q: How did you come to meet Mr. Epstein?
A: I was working at the Mar-a-Lago Club in Palm Beach. Ghislaine Maxwell approached me and said she was looking for a traveling masseuse for her friend who was very wealthy. She said the pay was excellent and I'd get to travel the world.

Q: What happened after you agreed to work for them?
A: I was flown to Mr. Epstein's mansion in Palm Beach. During the massage, things became sexual very quickly. Mr. Epstein told me that if I wanted to continue working for him, I would need to provide sexual services to him and his friends.

Q: Who were some of these friends?
A: Prince Andrew was one of them. I was trafficked to him in London, New York, and the Caribbean. There were also politicians, businessmen, and other wealthy individuals. Alan Dershowitz was another one. I was with him multiple times.

Q: How old were you during these encounters?
A: I was 16 and 17 years old. This continued until I was 19.

Q: Where did these encounters take place?
A: At Mr. Epstein's various properties - Palm Beach, New York, New Mexico, and Little St. James Island. Also at private jets, yachts, and hotels around the world.

Q: Were there other girls involved?
A: Yes, many. There was a constant rotation of young girls, mostly teenagers. Some were even younger than me when I started. Ghislaine Maxwell was very involved in recruiting these girls.

Q: What was the nature of the activities on Little St. James Island?
A: It was basically an organized sex trafficking operation. Girls were flown in, housed in guest cottages, and made available to Epstein's guests. There were hidden cameras, and everything was recorded.

[Deposition continues for several more pages...]`,
    fileType: "txt",
    fileSize: 1847,
    dateCreated: "2015-01-20",
    metadata: {
      legalCase: "15-CV-07433-RWS",
      depositionDate: "January 20, 2015",
      tags: ["deposition", "trafficking", "minor", "prince", "island"],
      categories: ["legal", "testimony", "victim-statement"],
      confidentiality: "sealed",
      source: "Legal Documents"
    },
    entities: [
      { name: "Virginia Roberts", type: "person", mentions: 4, contexts: [], significance: "high", relatedEntities: ["Jeffrey Epstein", "Ghislaine Maxwell", "Prince Andrew"] },
      { name: "Jeffrey Epstein", type: "person", mentions: 5, contexts: [], significance: "high", relatedEntities: ["Virginia Roberts", "Ghislaine Maxwell"] },
      { name: "Ghislaine Maxwell", type: "person", mentions: 3, contexts: [], significance: "high", relatedEntities: ["Virginia Roberts", "Jeffrey Epstein"] },
      { name: "Prince Andrew", type: "person", mentions: 1, contexts: [], significance: "high", relatedEntities: ["Virginia Roberts"] },
      { name: "Alan Dershowitz", type: "person", mentions: 1, contexts: [], significance: "high", relatedEntities: ["Virginia Roberts"] },
      { name: "Bradley Edwards", type: "person", mentions: 1, contexts: [], significance: "low", relatedEntities: [] },
      { name: "Mar-a-Lago Club", type: "location", mentions: 1, contexts: [], significance: "medium", relatedEntities: [] },
      { name: "Palm Beach", type: "location", mentions: 2, contexts: [], significance: "high", relatedEntities: [] },
      { name: "Little St. James Island", type: "location", mentions: 1, contexts: [], significance: "high", relatedEntities: [] }
    ],
    passages: [],
    redFlagScore: 67,
    redFlagRating: 5,
    redFlagPeppers: "🌶️🌶️🌶️🌶️🌶️",
    redFlagDescription: "Nuclear spicy - Major criminal evidence"
  },

  {
    filename: "EPSTEIN_LEDGER_2005.txt",
    title: "Financial Ledger - 2005",
    content: `EPSTEIN FINANCIAL RECORDS - 2005
CONFIDENTIAL - ATTORNEY EYES ONLY

LEDGER ENTRIES:

March 2005:
- Payment to Virginia Roberts: $15,000 ("massage services")
- Payment to Sarah Kellen: $10,000 ("assistant services")
- Payment to Nadia Marcinkova: $12,000 ("modeling work")
- Payment to Adriana Ross: $8,000 ("personal assistant")
- Flight expenses (N909JE): $45,000
- Island maintenance: $125,000
- Security services: $25,000
- "Special entertainment": $50,000

April 2005:
- Payment to new recruit (age 17): $20,000 ("training")
- Payment to Ghislaine Maxwell: $25,000 ("consulting")
- Legal fees: $75,000
- Payment to Alan Dershowitz: $50,000 ("legal advice")
- Island supplies: $15,000
- Transportation: $30,000
- Cash withdrawals: $100,000

May 2005:
- Payment to Prince Andrew's assistant: $5,000 ("gifts")
- Payment to Virginia Roberts: $18,000 ("extended services")
- New massage equipment: $10,000
- Video equipment: $15,000
- Security system upgrade: $35,000
- Cash payments to various girls: $60,000

NOTES:
- All cash payments to be made in person
- No electronic records of cash transactions
- All recipients must sign confidentiality agreements
- Video recordings to be stored in secure location
- Flight logs to be maintained separately
- All "special services" to be coded as "massage" or "modeling"

These records represent only a portion of total transactions. Many payments were made in cash and are not reflected in these ledgers.`,
    fileType: "txt",
    fileSize: 1243,
    dateCreated: "2005-12-31",
    metadata: {
      tags: ["financial", "payments", "minor", "cash", "island"],
      categories: ["financial-records", "accounting", "payments"],
      confidentiality: "classified",
      source: "Financial Records"
    },
    entities: [
      { name: "Virginia Roberts", type: "person", mentions: 2, contexts: [], significance: "high", relatedEntities: [] },
      { name: "Sarah Kellen", type: "person", mentions: 1, contexts: [], significance: "medium", relatedEntities: [] },
      { name: "Nadia Marcinkova", type: "person", mentions: 1, contexts: [], significance: "medium", relatedEntities: [] },
      { name: "Adriana Ross", type: "person", mentions: 1, contexts: [], significance: "medium", relatedEntities: [] },
      { name: "Ghislaine Maxwell", type: "person", mentions: 1, contexts: [], significance: "high", relatedEntities: [] },
      { name: "Alan Dershowitz", type: "person", mentions: 1, contexts: [], significance: "high", relatedEntities: [] },
      { name: "Prince Andrew", type: "person", mentions: 1, contexts: [], significance: "high", relatedEntities: [] }
    ],
    passages: [],
    redFlagScore: 58,
    redFlagRating: 5,
    redFlagPeppers: "🌶️🌶️🌶️🌶️🌶️",
    redFlagDescription: "Nuclear spicy - Major criminal evidence"
  },

  {
    filename: "MAXWELL_EMAIL_002.txt",
    title: "Re: New Recruits",
    content: `From: ghislaine.maxwell@maxwell.com
To: jeffrey.epstein@epstein.com
Date: June 10, 2005
Subject: Re: New Recruits

Jeffrey,

I've found some excellent new prospects for you. All are young, attractive, and in need of money:

1. Maria - 18 years old, from Eastern Europe. She's a model looking for work and very open-minded. I've explained the "special requirements" of the job and she seems interested.

2. Jennifer - 19 years old, local girl from Palm Beach. Works at a spa, has experience with massage. I think she'd be perfect for your "special clients."

3. The new one - 16 years old (almost 17). She's very naive and comes from a troubled family situation. I think she'd be easy to control and wouldn't ask too many questions.

I've arranged for them to come to the island next week for "interviews." I've told them it's for modeling and personal assistant work, but we can explain the "full requirements" once they're there.

The younger one might need some extra persuasion, but I have some ideas about how to handle that. Her family situation makes her vulnerable, which works in our favor.

Let me know if you want me to proceed with bringing them in. I think they'd all be good additions to our "collection."

Best,
Ghislaine

P.S. - I've also been talking to a 15-year-old who's shown some interest, but she's still in high school. Might be too risky right now, but we can keep her in mind for later.`,
    fileType: "email",
    fileSize: 1047,
    dateCreated: "2005-06-10",
    metadata: {
      author: "ghislaine.maxwell@maxwell.com",
      recipient: "jeffrey.epstein@epstein.com",
      subject: "Re: New Recruits",
      tags: ["recruiting", "minor", "modeling", "island"],
      categories: ["email", "recruitment", "trafficking"],
      confidentiality: "sealed",
      source: "Email Archive"
    },
    entities: [
      { name: "Ghislaine Maxwell", type: "person", mentions: 1, contexts: [], significance: "high", relatedEntities: ["Jeffrey Epstein"] },
      { name: "Jeffrey Epstein", type: "person", mentions: 2, contexts: [], significance: "high", relatedEntities: ["Ghislaine Maxwell"] },
      { name: "Maria", type: "person", mentions: 2, contexts: [], significance: "high", relatedEntities: [] },
      { name: "Jennifer", type: "person", mentions: 2, contexts: [], significance: "high", relatedEntities: [] },
      { name: "Palm Beach", type: "location", mentions: 1, contexts: [], significance: "medium", relatedEntities: [] }
    ],
    passages: [],
    redFlagScore: 72,
    redFlagRating: 5,
    redFlagPeppers: "🌶️🌶️🌶️🌶️🌶️",
    redFlagDescription: "Nuclear spicy - Major criminal evidence"
  },

  {
    filename: "CLINTON_EMAIL_001.txt",
    title: "Re: Upcoming Trip",
    content: `From: william.clinton@clintonfoundation.org
To: jeffrey.epstein@epstein.com
Date: September 5, 2002
Subject: Re: Upcoming Trip

Jeffrey,

Thank you for the generous offer to use your plane for the trip to Africa. Your continued support of our foundation's work is greatly appreciated.

I've spoken to Chelsea about joining us, and she's excited about the opportunity to see the foundation's work firsthand. I believe this will be a great learning experience for her.

Regarding the itinerary you proposed, it looks excellent. The foundation's work in Africa is so important, and having efficient transportation will allow us to visit more sites and help more people.

I understand you'll be joining us for parts of the trip as well. I look forward to catching up and discussing potential future collaborations between your foundation and ours.

One quick question - I noticed you mentioned that some of your "associates" might be joining us as well? Could you clarify who you're referring to? I want to make sure we're all on the same page regarding the passenger manifest.

Looking forward to seeing you soon.

Best regards,
Bill

P.S. - Hillary sends her regards. She's sorry she can't join us on this trip but hopes to meet up with you in New York sometime soon.`,
    fileType: "email",
    fileSize: 823,
    dateCreated: "2002-09-05",
    metadata: {
      author: "william.clinton@clintonfoundation.org",
      recipient: "jeffrey.epstein@epstein.com",
      subject: "Re: Upcoming Trip",
      tags: ["flight", "foundation", "africa", "chelsea"],
      categories: ["email", "foundation-work", "travel"],
      confidentiality: "public",
      source: "Email Archive"
    },
    entities: [
      { name: "Bill Clinton", type: "person", mentions: 1, contexts: [], significance: "high", relatedEntities: ["Jeffrey Epstein", "Chelsea Clinton", "Hillary Clinton"] },
      { name: "Jeffrey Epstein", type: "person", mentions: 2, contexts: [], significance: "high", relatedEntities: ["Bill Clinton"] },
      { name: "Chelsea Clinton", type: "person", mentions: 1, contexts: [], significance: "medium", relatedEntities: ["Bill Clinton"] },
      { name: "Hillary Clinton", type: "person", mentions: 1, contexts: [], significance: "medium", relatedEntities: ["Bill Clinton"] }
    ],
    passages: [],
    redFlagScore: 24,
    redFlagRating: 3,
    redFlagPeppers: "🌶️🌶️🌶️",
    redFlagDescription: "Moderately spicy - Notable controversial mentions"
  }
];

// Function to generate processed documents with IDs
export function generateSampleDocuments(): Document[] {
  return sampleDocuments.map((doc, index) => ({
    ...doc,
    id: `sample-doc-${index}`,
    passages: extractSamplePassages(doc.content, doc.filename)
  }));
}

function extractSamplePassages(content: string, filename: string): any[] {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  return sentences.slice(0, 5).map((sentence, index) => ({
    id: `${filename}_passage_${index}`,
    content: sentence.trim(),
    context: content,
    keywords: [],
    entities: [],
    spiceLevel: 1,
    significance: 'medium' as const,
    file: filename,
    position: content.indexOf(sentence)
  }));
}