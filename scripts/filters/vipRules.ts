// Rules for consolidating Top 100 VIP entities into canonical profiles
// This prevents fragmentation (e.g. "Jeffry Epstein" vs "Jeffrey Epstein")

export interface VipRule {
  canonicalName: string;
  aliases: string[];
  patterns: RegExp[]; // Regex for aggressive matching (use with caution)
  type: 'Person' | 'Organization' | 'Term' | 'Concept';
  metadata?: {
    category?:
      | 'Perpetrator'
      | 'Complicit'
      | 'Associate'
      | 'Witness'
      | 'Survivor'
      | 'Visitor'
      | 'Reporter'
      | 'Family'
      | 'Codeword';
    riskLevel?: 'high' | 'medium' | 'low';
    deathDate?: string; // YYYY-MM-DD
    birthDate?: string; // YYYY-MM-DD
    notes?: string;
    bio?: string;
  };
}

export const VIP_RULES: VipRule[] = [
  // --- KEY FIGURES (PERPETRATORS / COMPLICIT) ---
  {
    canonicalName: 'Jeffrey Epstein',
    type: 'Person',
    aliases: [
      'Jeff Epstein',
      'Mr. Epstein',
      'Jeffry Epstein',
      'Jeffrey E. Epstein',
      'J. Epstein',
      'Jeffery Epstein',
      'Sam Epstein',
    ],
    patterns: [/Jeffrey\s+Epstein/i, /Jeff\s+Epstein/i, /Jeffery\s+Epstein/i, /Sam\s+Epstein/i],
    metadata: {
      category: 'Perpetrator',
      riskLevel: 'high',
      birthDate: '1953-01-20',
      deathDate: '2019-08-10',
      notes: 'Died in custody at MCC New York.',
      bio: 'American financier and convicted sex offender who trafficked underage girls. Center of the network connecting high-profile figures.',
    },
  },
  {
    canonicalName: 'Ghislaine Maxwell',
    type: 'Person',
    aliases: ['G. Maxwell', 'Ms. Maxwell', 'Miss Maxwell', 'Ghislane Maxwell'],
    patterns: [/Ghislaine\s+Maxwell/i, /Ghislane\s+Maxwell/i],
    metadata: {
      category: 'Perpetrator',
      riskLevel: 'high',
      birthDate: '1961-12-25',
      bio: 'British socialite and daughter of Robert Maxwell. Convicted of sex trafficking and conspiracy to commit sex trafficking ensuring Epstein had a steady supply of victims.',
    },
  },
  {
    canonicalName: 'Jean-Luc Brunel',
    type: 'Person',
    aliases: ['Jean Luc Brunel', 'MC2 Model Management', 'J.L. Brunel'],
    patterns: [/Jean\s+Luc\s+Brunel/i, /Jean-Luc\s+Brunel/i],
    metadata: {
      category: 'Perpetrator',
      riskLevel: 'high',
      birthDate: '1946-01-01', // Approx year
      deathDate: '2022-02-19',
      notes: 'Found dead in cell in La Santé Prison, Paris.',
      bio: 'French modeling agent and scout. Accused of sourcing girls for Epstein and participating in abuse. Founded MC2 Model Management.',
    },
  },
  {
    canonicalName: 'Prince Andrew',
    type: 'Person',
    aliases: ['Duke of York', 'Andrew Albert Christian Edward', 'HRH Prince Andrew'],
    patterns: [/Prince\s+Andrew/i, /Duke\s+of\s+York/i],
    metadata: {
      category: 'Perpetrator',
      riskLevel: 'high',
      birthDate: '1960-02-19',
      bio: 'Member of the British Royal Family. Accused by Virginia Giuffre of sexual assault (settled out of court). Long-time associate of Epstein and Maxwell.',
    },
  },
  {
    canonicalName: 'Bill Clinton',
    type: 'Person',
    aliases: ['William Jefferson Clinton', 'President Clinton', 'Mr. Clinton', 'William Clinton'],
    patterns: [/Bill\s+Clinton/i, /President\s+Clinton/i, /William\s+Clinton/i],
    metadata: {
      category: 'Perpetrator',
      riskLevel: 'high',
      birthDate: '1946-08-19',
      bio: '42nd U.S. President. Flew on Epstein’s plane multiple times. Documented dining with Epstein and Maxwell.',
    },
  },
  {
    canonicalName: 'Donald Trump',
    type: 'Person',
    aliases: [
      'Donald J. Trump',
      'Mr. Trump',
      'President Trump',
      'The Donald',
      'Donald John Trump',
      'Trump, Doinac',
      'President Donald Trump',
    ],
    patterns: [
      /Donald\s+Trump/i,
      /President\s+Trump/i,
      /Trump,\s+Doinac/i,
      /President\s+Donald\s+Trump/i,
    ],
    metadata: {
      category: 'Associate',
      riskLevel: 'high',
      birthDate: '1946-06-14',
      bio: '45th U.S. President. Socialized with Epstein in Palm Beach and NYC in the 90s/00s. Quoted calling Epstein a "terrific guy".',
    },
  },
  {
    canonicalName: 'Mark Epstein',
    type: 'Person',
    aliases: ['izmo'],
    patterns: [/Mark\s+Epstein/i, /izmo/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      bio: 'Brother of Jeffrey Epstein. Real estate developer. Listed in the Black Book as "izmo".',
    },
  },
  {
    canonicalName: 'Sean "Diddy" Combs',
    type: 'Person',
    aliases: ['P Diddy', 'p daddy', 'Sean Combs', 'Puffy', 'Puff Daddy', 'Brother Love'],
    patterns: [/Sean\s+"?Diddy"?\s+Combs/i, /P\s+Diddy/i, /p\s+daddy/i, /Puff\s+Daddy/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1969-11-04',
      bio: 'American rapper and record producer. Associated with Epstein through various social circles.',
    },
  },
  {
    canonicalName: 'Bill Richardson',
    type: 'Person',
    aliases: ['Governor Richardson', 'William Richardson', 'Gov. Richardson'],
    patterns: [/Bill\s+Richardson/i],
    metadata: {
      category: 'Complicit',
      riskLevel: 'high',
      birthDate: '1947-11-15',
      deathDate: '2023-09-01',
      bio: 'Former NM Governor and UN Ambassador. Accused by Virginia Giuffre; named in unsealed documents.',
    },
  },
  {
    canonicalName: 'Benjamin Netanyahu',
    type: 'Person',
    aliases: [
      'Bibi',
      'Bibi Netanyahu',
      'Benjamin Nitay',
      'Binyamin Netanyahu',
      'Mr. Netanyahu',
      'PM Netanyahu',
    ],
    patterns: [/Bibi\s+Netanyahu/i, /Benjamin\s+Nitay/i, /Binyamin\s+Netanyahu/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'high',
      birthDate: '1949-10-21',
      bio: 'Prime Minister of Israel. Introduced to Epstein by Ehud Barak. Met with Epstein on multiple occasions.',
    },
  },
  {
    canonicalName: 'Ehud Barak',
    type: 'Person',
    aliases: ['Prime Minister Barak', 'Mr. Barak'],
    patterns: [/Ehud\s+Barak/i],
    metadata: {
      category: 'Complicit',
      riskLevel: 'high',
      birthDate: '1942-02-12',
      bio: 'Former Prime Minister of Israel. Visited Epstein frequently in NYC. Received investments from Epstein connected entities.',
    },
  },
  {
    canonicalName: 'Les Wexner',
    type: 'Person',
    aliases: ['Leslie Wexner', 'Mr. Wexner', 'Leslie H. Wexner'],
    patterns: [/Les\s+Wexner/i, /Leslie\s+Wexner/i],
    metadata: {
      category: 'Complicit',
      riskLevel: 'high',
      birthDate: '1937-09-08',
      bio: 'Retail billionaire (Victoria’s Secret, The Limited). Epstein’s primary financial patron and power of attorney holder for decades.',
    },
  },
  {
    canonicalName: 'Glenn Dubin',
    type: 'Person',
    aliases: ['Mr. Dubin'],
    patterns: [/Glenn\s+Dubin/i],
    metadata: {
      category: 'Complicit',
      riskLevel: 'high',
      birthDate: '1957-04-13',
      bio: 'Hedge fund manager (Highbridge Capital). Married to Eva Andersson-Dubin (Epstein’s ex). Accused by Virginia Giuffre.',
    },
  },
  {
    canonicalName: 'Leon Black',
    type: 'Person',
    aliases: ['Mr. Black', 'Apollo Global Management'],
    patterns: [/Leon\s+Black/i],
    metadata: {
      category: 'Complicit',
      riskLevel: 'high',
      birthDate: '1951-07-31',
      bio: 'Private equity billionaire (Apollo). Paid Epstein $158m for tax/estate advice after Epstein’s 2008 conviction.',
    },
  },
  {
    canonicalName: 'Jes Staley',
    type: 'Person',
    aliases: ['James Staley', 'Mr. Staley', 'Barclays CEO'],
    patterns: [/Jes\s+Staley/i, /James\s+Staley/i],
    metadata: {
      category: 'Complicit',
      riskLevel: 'high',
      birthDate: '1956-12-27',
      bio: 'Former Barclays CEO and JPMorgan executive. Managed Epstein’s accounts. Exchanged thousands of emails with Epstein.',
    },
  },
  {
    canonicalName: 'Peter Thiel',
    type: 'Person',
    aliases: ['Mr. Thiel'],
    patterns: [/Peter\s+Thiel/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'high',
      birthDate: '1967-10-11',
      bio: 'Tech billionaire/investor. Met Epstein on multiple occasions.',
    },
  },
  {
    canonicalName: 'Alan Dershowitz',
    type: 'Person',
    aliases: ['Alan M. Dershowitz', 'Mr. Dershowitz', 'Professor Dershowitz'],
    patterns: [/Alan\s+Dershowitz/i],
    metadata: {
      category: 'Complicit',
      riskLevel: 'high',
      birthDate: '1938-09-01',
      bio: 'Harvard Law professor. Helped negotiate Epstein’s 2008 non-prosecution agreement. Accused by Virginia Giuffre (later dropped/settled).',
    },
  },
  {
    canonicalName: 'Sarah Kellen',
    type: 'Person',
    aliases: ['Sarah Kellen Vidal', 'Sarah Vickers', 'Sarah Vidal'],
    patterns: [/Sarah\s+Kellen/i],
    metadata: {
      category: 'Complicit',
      riskLevel: 'high',
      birthDate: '1979-01-01', // Approx
      bio: 'Epstein’s scheduler and assistant. Accused of coordinating abuse and managing victims.',
    },
  },
  {
    canonicalName: 'Nadia Marcinkova',
    type: 'Person',
    aliases: ['Nadia Marcinko', 'Global Girl'],
    patterns: [/Nadia\s+Marcinkova/i, /Nadia\s+Marcinko/i],
    metadata: {
      category: 'Complicit',
      riskLevel: 'high',
      birthDate: '1980-01-01', // Approx
      bio: 'Model and pilot. Accused of recruiting girls and participating in abuse.',
    },
  },

  // --- SURVIVORS / VICTIMS (GREEN) ---
  {
    canonicalName: 'Virginia Giuffre',
    type: 'Person',
    aliases: ['Virginia Roberts', 'Virginia Roberts Giuffre', 'Ms. Roberts'],
    patterns: [/Virginia\s+Giuffre/i, /Virginia\s+Roberts/i],
    metadata: {
      category: 'Survivor',
      riskLevel: 'low',
      birthDate: '1983-08-09',
      deathDate: '2025-04-25', // Future date from prompt
      bio: 'Primary whistleblower and survivor. Detailed allegations against Epstein, Maxwell, Prince Andrew, and others.',
    },
  },
  {
    canonicalName: 'Carolyn Andriano',
    type: 'Person',
    aliases: ['Carolyn'],
    patterns: [/Carolyn\s+Andriano/i],
    metadata: {
      category: 'Survivor',
      riskLevel: 'low',
      birthDate: '1986-01-01', // Approx
      deathDate: '2023-05-23',
      bio: 'Survivor who testified at Maxwell’s trial. Died of drug overdose.',
    },
  },
  {
    canonicalName: 'Brad Edwards',
    type: 'Person',
    aliases: ['Bradley Edwards'],
    patterns: [/Bradley\s+Edwards/i, /Brad\s+Edwards/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'low',
      birthDate: '1970-01-01', // Approx
      bio: 'Civil attorney representing many of Epstein’s victims. Author of "Relentless Pursuit".',
    },
  },

  // --- VISITORS / FAMOUS FIGURES (YELLOW) ---
  {
    canonicalName: 'Michael Jackson',
    type: 'Person',
    aliases: ['MJ', 'King of Pop'],
    patterns: [/Michael\s+Jackson/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1958-08-29',
      deathDate: '2009-06-25', // Died before the user provided timeline updates, but valid context
      bio: 'Pop icon. Visited Epstein in Palm Beach and NYC to discuss finances.',
    },
  },
  {
    canonicalName: 'Naomi Campbell',
    type: 'Person',
    aliases: [],
    patterns: [/Naomi\s+Campbell/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1970-05-22',
      bio: 'Supermodel. Photographed with Epstein and Maxwell. Maxwell attended her birthday party.',
    },
  },
  {
    canonicalName: 'Alec Baldwin',
    type: 'Person',
    aliases: [],
    patterns: [/Alec\s+Baldwin/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1958-04-03',
      bio: 'Actor. Name appears in Epstein’s Little Black Book.',
    },
  },
  {
    canonicalName: 'Mick Jagger',
    type: 'Person',
    aliases: ['Sir Mick Jagger'],
    patterns: [/Mick\s+Jagger/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1943-07-26',
      bio: 'Lead singer of the Rolling Stones. Attended events where Epstein/Maxwell were present.',
    },
  },
  {
    canonicalName: 'Cate Blanchett',
    type: 'Person',
    aliases: [],
    patterns: [/Cate\s+Blanchett/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1969-05-14',
      bio: 'Actress. Name appears in Epstein’s contacts.',
    },
  },
  {
    canonicalName: 'Cameron Diaz',
    type: 'Person',
    aliases: [],
    patterns: [/Cameron\s+Diaz/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1972-08-30',
      bio: 'Actress. Name appears in flight logs/contacts, though she has denied meeting him.',
    },
  },
  {
    canonicalName: 'Bruce Willis',
    type: 'Person',
    aliases: [],
    patterns: [/Bruce\s+Willis/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1955-03-19',
      bio: 'Actor. Name appears in Epstein’s contacts.',
    },
  },
  {
    canonicalName: 'Leonardo DiCaprio',
    type: 'Person',
    aliases: ['Leo DiCaprio'],
    patterns: [/Leonardo\s+DiCaprio/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1974-11-11',
      bio: 'Actor. Cited in documents, though reps deny he knew Epstein.',
    },
  },
  {
    canonicalName: 'Chris Tucker',
    type: 'Person',
    aliases: [],
    patterns: [/Chris\s+Tucker/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1971-08-31',
      bio: 'Comedian/Actor. Flew on Epstein’s plane to Africa with Clinton.',
    },
  },
  {
    canonicalName: 'Stephen Hawking',
    type: 'Person',
    aliases: ['Professor Hawking'],
    patterns: [/Stephen\s+Hawking/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1942-01-08',
      deathDate: '2018-03-14',
      bio: "Physicist. Visited Epstein's island for a conference funded by Epstein.",
    },
  },
  {
    canonicalName: 'Noam Chomsky',
    type: 'Person',
    aliases: [],
    patterns: [/Noam\s+Chomsky/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1928-12-07',
      bio: 'Linguist and activist. Confirmed meetings with Epstein to discuss politics/finance.',
    },
  },
  {
    canonicalName: 'Robert F. Kennedy Jr',
    type: 'Person',
    aliases: ['RFK Jr', 'Robert Kennedy Jr'],
    patterns: [/Robert\s+F\.?\s+Kennedy\s+Jr/i, /RFK\s+Jr/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1954-01-17',
      bio: 'Politician/Lawyer. Flew on Epstein’s plane.',
    },
  },
  {
    canonicalName: 'Sarah Ferguson',
    type: 'Person',
    aliases: ['Duchess of York', 'Fergie'],
    patterns: [/Sarah\s+Ferguson/i, /Duchess\s+of\s+York/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1959-10-15',
      bio: 'Duchess of York. Accepted money from Epstein to pay off debts; later apologized.',
    },
  },

  // --- DEATH TIMELINE ENTRIES ---
  {
    canonicalName: 'Robert Maxwell',
    type: 'Person',
    aliases: ['Captain Bob'],
    patterns: [/Robert\s+Maxwell/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'high',
      birthDate: '1923-06-10',
      deathDate: '1991-01-05',
      bio: 'Media proprietor and Ghislaine’s father. Died suspiciously falling off his yacht.',
    },
  },
  {
    canonicalName: 'Alfredo Rodriguez',
    type: 'Person',
    aliases: [],
    patterns: [/Alfredo\s+Rodriguez/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      deathDate: '2015-01-01',
      bio: 'Epstein’s house manager/butler in Palm Beach. Deceased.',
    },
  },
  {
    canonicalName: 'Marvin Minsky',
    type: 'Person',
    aliases: [],
    patterns: [/Marvin\s+Minsky/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1927-08-09',
      deathDate: '2016-01-24',
      bio: 'Cognitive scientist (AI). Organized conferences on Epstein’s island. Accused by Giuffre.',
    },
  },
  {
    canonicalName: 'Wendy Leigh',
    type: 'Person',
    aliases: [],
    patterns: [/Wendy\s+Leigh/i],
    metadata: {
      category: 'Reporter',
      riskLevel: 'medium',
      deathDate: '2016-05-29',
      bio: 'Author and Daily Mail reporter. Investigated Ghislaine Maxwell. Fell from balcony.',
    },
  },
  {
    canonicalName: 'Leigh Skye Patrick',
    type: 'Person',
    aliases: [],
    patterns: [/Leigh\s+Skye\s+Patrick/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      deathDate: '2017-05-30',
      bio: 'Associate mentioned in context of deaths/timeline.',
    },
  },
  {
    canonicalName: 'Mark Salling',
    type: 'Person',
    aliases: [],
    patterns: [/Mark\s+Salling/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1982-08-17',
      deathDate: '2018-01-30',
      bio: 'Actor (Glee). Convicted of possession of child pornography. Suicide.',
    },
  },
  {
    canonicalName: 'Thomas Bowers',
    type: 'Person',
    aliases: [],
    patterns: [/Thomas\s+Bowers/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      deathDate: '2019-11-01',
      bio: 'Deutsche Bank executive who signed off on Epstein loans. Suicide.',
    },
  },
  {
    canonicalName: 'Steve Bing',
    type: 'Person',
    aliases: [],
    patterns: [/Steve\s+Bing/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1965-03-31',
      deathDate: '2020-06-22',
      bio: 'Film producer and financier. Clinton friend. Suicide.',
    },
  },
  {
    canonicalName: 'Efrain Reyes',
    type: 'Person',
    aliases: ['Efrain Stone Reyes', 'Stone'],
    patterns: [/Efrain\s+Reyes/i, /Efrain\s+Stone\s+Reyes/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      deathDate: '2020-11-01',
      bio: 'Epstein’s groundskeeper. Died of COVID-19 complications.',
    },
  },
  {
    canonicalName: 'Mark Middleton',
    type: 'Person',
    aliases: [],
    patterns: [/Mark\s+Middleton/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      deathDate: '2022-05-07',
      bio: 'Special assistant to Bill Clinton. Admitted Epstein to White House 17 times. Suicide.',
    },
  },
  {
    canonicalName: 'Ivana Trump',
    type: 'Person',
    aliases: [],
    patterns: [/Ivana\s+Trump/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1949-02-20',
      deathDate: '2022-07-14',
      bio: 'Businesswoman and Donald Trump’s first wife. Knew Maxwell/Epstein.',
    },
  },
  {
    canonicalName: 'Ken Starr',
    type: 'Person',
    aliases: ['Kenneth Starr'],
    patterns: [/Ken\s+Starr/i, /Kenneth\s+Starr/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1946-07-21',
      deathDate: '2022-09-13',
      bio: 'Lawyer. Joined Epstein’s defense team for the 2008 plea deal.',
    },
  },
  {
    canonicalName: 'Steven Hoffenberg',
    type: 'Person',
    aliases: [],
    patterns: [/Steven\s+Hoffenberg/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'high',
      deathDate: '2022-09-01',
      bio: 'Epstein’s mentor/partner in Towers Financial Ponzi scheme. Later claimed Epstein was a spy.',
    },
  },
  {
    canonicalName: 'Roy Black',
    type: 'Person',
    aliases: [],
    patterns: [/Roy\s+Black/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      deathDate: '2025-07-21', // Future date from prompt
      bio: 'Defense attorney for Epstein in 2008.',
    },
  },
  {
    canonicalName: 'Celina Midelfart',
    type: 'Person',
    aliases: ['Celina Midelfahrt', 'Ms. Midelfart'],
    patterns: [/Celina\s+Midelfart/i, /Celina\s+Midelfahrt/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1973-02-12',
      bio: "Norwegian heir and businesswoman. Dated Donald Trump in the 90s. Flew on Epstein's plane (the 'Lolita Express') in 1996 and 1997 with Trump and Ghislaine Maxwell. Listed in Epstein's Little Black Book.",
    },
  },

  // --- OTHERS ---
  {
    canonicalName: 'The Donald',
    type: 'Person',
    aliases: [],
    patterns: [],
    metadata: {
      category: 'Associate',
      riskLevel: 'high',
      bio: 'Codename/nickname for Donald Trump.',
    },
  },
  {
    canonicalName: 'Melania Trump',
    type: 'Person',
    aliases: ['Melania Knauss', 'Melania Knauss-Trump', 'Mrs. Trump'],
    patterns: [/Melania\s+Trump/i, /Melania\s+Knauss/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1970-04-26',
      bio: 'Wife of Donald Trump. Socialized with Epstein/Maxwell in the 90s.',
    },
  },
  {
    canonicalName: 'Ivanka Trump',
    type: 'Person',
    aliases: ['Ivanka Marie Trump'],
    patterns: [/Ivanka\s+Trump/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1981-10-30',
      bio: 'Daughter of Donald Trump. Socialized with Epstein/Maxwell.',
    },
  },
  {
    canonicalName: 'George Mitchell',
    type: 'Person',
    aliases: ['George J. Mitchell', 'Senator Mitchell', 'Mr. Mitchell'],
    patterns: [/George\s+Mitchell/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1933-08-20',
      bio: 'Former Senator. Named in documents by Giuffre (denied allegation).',
    },
  },
  {
    canonicalName: 'Kevin Spacey',
    type: 'Person',
    aliases: ['Kevin Spacey Fowler'],
    patterns: [/Kevin\s+Spacey/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1959-07-26',
      bio: 'Actor. Flew on Epstein’s plane.',
    },
  },
  {
    canonicalName: 'Michael Cohen',
    type: 'Person',
    aliases: ['Michael D. Cohen', 'Mr. Cohen', 'Attorney Cohen'],
    patterns: [/Michael\s+Cohen/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1966-08-25',
      bio: 'Former Trump attorney. Contact details in Epstein’s book.',
    },
  },
  {
    canonicalName: 'The Trump Organization',
    type: 'Organization',
    aliases: ['Trump Org', 'Trump Organization'],
    patterns: [/Trump\s+Org/i, /Trump\s+Organization/i],
    metadata: { category: 'Associate' },
  },
  {
    canonicalName: "Victoria's Secret",
    type: 'Organization',
    aliases: ['Victorias Secret', 'Victoria Secret'],
    patterns: [/Victoria'?s\s+Secret/i],
    metadata: { category: 'Associate' },
  },

  // --- CODEWORDS / TERMS ---
  {
    canonicalName: 'Hotdog',
    type: 'Term',
    aliases: ['hotdog'],
    patterns: [/\bhotdog\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to a **boy** to evade detection.',
    },
  },
  {
    canonicalName: 'Pizza',
    type: 'Term',
    aliases: ['pizza'],
    patterns: [/\bpizza\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to a **girl** to evade detection.',
    },
  },
  {
    canonicalName: 'Cheese',
    type: 'Term',
    aliases: ['cheese'],
    patterns: [/\bcheese\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to a **little girl** to evade detection.',
    },
  },
  {
    canonicalName: 'Pasta',
    type: 'Term',
    aliases: ['pasta'],
    patterns: [/\bpasta\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to a **little boy** to evade detection.',
    },
  },
  {
    canonicalName: 'Ice Cream',
    type: 'Term',
    aliases: ['ice cream'],
    patterns: [/\bice\s+cream\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to a **male prostitute**.',
    },
  },
  {
    canonicalName: 'Walnut',
    type: 'Term',
    aliases: ['walnut'],
    patterns: [/\bwalnut\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to a **person of colour**.',
    },
  },
  {
    canonicalName: 'Map',
    type: 'Term',
    aliases: ['map'],
    patterns: [/\bmap\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to **semen**.',
    },
  },
  {
    canonicalName: 'Sauce',
    type: 'Term',
    aliases: ['sauce'],
    patterns: [/\bsauce\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to an **orgy**.',
    },
  },
  {
    canonicalName: 'Pizza Party',
    type: 'Term',
    aliases: ['pizza party'],
    patterns: [/\bpizza\s+party\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to a **party with girls/prostitutes**.',
    },
  },
  {
    canonicalName: 'Pizza Slice',
    type: 'Term',
    aliases: ['pizza slice', 'slice'],
    patterns: [/\bpizza\s+slice\b/i, /\bslice\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to a **single girl**.',
    },
  },
  {
    canonicalName: 'Whoops',
    type: 'Term',
    aliases: ['whoops'],
    patterns: [/\bwhoops\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to **killing someone and making it look like suicide**.',
    },
  },
];

export function resolveVip(name: string): string | null {
  const normalized = name.trim();

  for (const rule of VIP_RULES) {
    if (rule.aliases.includes(normalized)) return rule.canonicalName;
    for (const pattern of rule.patterns) {
      if (pattern.test(normalized)) return rule.canonicalName;
    }
  }

  return null;
}
