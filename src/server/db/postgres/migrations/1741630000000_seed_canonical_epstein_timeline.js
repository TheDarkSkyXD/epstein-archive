/* eslint-disable no-undef */

function sqlEscape(value) {
  return String(value || '').replace(/'/g, "''");
}

export async function up(pgm) {
  const events = [
    {
      title: 'First Known Allegations Against Epstein',
      date: '1994-01-01',
      type: 'investigation',
      significance: 'high',
      source: 'Public Record',
      description:
        'Early allegations of sexual abuse surface against Jeffrey Epstein in Palm Beach, Florida, involving underage girls recruited from local schools and neighborhoods.',
      entities: ['Jeffrey Epstein'],
    },
    {
      title: 'Palm Beach Police Begin Investigation',
      date: '2005-03-15',
      type: 'investigation',
      significance: 'high',
      source: 'Palm Beach Police',
      description:
        "Palm Beach Police Department opens investigation into Jeffrey Epstein after a parent reports that her 14-year-old daughter was taken to Epstein's mansion and paid for sexual acts.",
      entities: ['Jeffrey Epstein'],
    },
    {
      title: 'FBI Opens Federal Investigation',
      date: '2006-05-01',
      type: 'investigation',
      significance: 'high',
      source: 'FBI',
      description:
        'The FBI opens a federal investigation into Jeffrey Epstein for sex trafficking of minors across state lines after the Palm Beach Police Department refers the case.',
      entities: ['Jeffrey Epstein', 'FBI'],
    },
    {
      title: 'Controversial Non-Prosecution Agreement Signed',
      date: '2007-09-24',
      type: 'legal',
      significance: 'high',
      source: 'DOJ Filing',
      description:
        'U.S. Attorney Alexander Acosta signs a controversial non-prosecution agreement with Epstein, granting him immunity from federal sex trafficking charges and extending immunity to unnamed co-conspirators.',
      entities: ['Jeffrey Epstein', 'Alexander Acosta'],
    },
    {
      title: 'Crime Victims Rights Act Lawsuit Filed',
      date: '2008-01-01',
      type: 'legal',
      significance: 'high',
      source: 'Federal Court',
      description:
        "Attorneys Brad Edwards and Paul Cassell file a lawsuit under the Crime Victims' Rights Act on behalf of Epstein's victims, arguing that the NPA violated victims' rights by not consulting them.",
      entities: ['Jeffrey Epstein', 'Brad Edwards', 'Paul Cassell'],
    },
    {
      title: 'Epstein Pleads Guilty in Florida',
      date: '2008-06-30',
      type: 'legal',
      significance: 'high',
      source: 'Florida Court',
      description:
        'Jeffrey Epstein pleads guilty to two state charges of soliciting prostitution, including one involving a minor.',
      entities: ['Jeffrey Epstein'],
    },
    {
      title: 'Epstein Begins Jail Sentence',
      date: '2008-07-01',
      type: 'incarceration',
      significance: 'medium',
      source: 'Palm Beach County',
      description:
        'Epstein begins serving his sentence at the Palm Beach County Stockade with work release privileges.',
      entities: ['Jeffrey Epstein'],
    },
    {
      title: 'Virginia Giuffre Files First Lawsuit',
      date: '2009-04-01',
      type: 'legal',
      significance: 'high',
      source: 'Federal Court',
      description:
        'Virginia Roberts (later Giuffre) files a lawsuit against Epstein describing a pattern of abuse and alleged trafficking.',
      entities: ['Virginia Giuffre', 'Jeffrey Epstein'],
    },
    {
      title: 'Epstein Released from Jail',
      date: '2009-07-22',
      type: 'legal',
      significance: 'medium',
      source: 'Florida Corrections',
      description:
        'Jeffrey Epstein is released from the Palm Beach County Stockade after serving 13 months and registers as a sex offender.',
      entities: ['Jeffrey Epstein'],
    },
    {
      title: 'Virginia Giuffre Files Defamation Suit Against Ghislaine Maxwell',
      date: '2015-01-05',
      type: 'legal',
      significance: 'high',
      source: 'Federal Court',
      description:
        'Virginia Giuffre files a defamation lawsuit against Ghislaine Maxwell after Maxwell publicly called Giuffre a liar.',
      entities: ['Virginia Giuffre', 'Ghislaine Maxwell'],
    },
    {
      title: 'Miami Herald Publishes "Perversion of Justice" Series',
      date: '2018-11-28',
      type: 'media',
      significance: 'high',
      source: 'Miami Herald',
      description:
        'Julie K. Brown publishes the investigative series that re-exposes the scope of Epstein crimes and plea-deal failures.',
      entities: ['Jeffrey Epstein', 'Julie K. Brown'],
    },
    {
      title: 'Jeffrey Epstein Arrested on Federal Charges',
      date: '2019-07-06',
      type: 'arrest',
      significance: 'high',
      source: 'SDNY',
      description:
        'Jeffrey Epstein is arrested at Teterboro Airport on federal charges of sex trafficking of minors in New York and Florida.',
      entities: ['Jeffrey Epstein'],
    },
    {
      title: 'Epstein Indictment Unsealed',
      date: '2019-07-08',
      type: 'legal',
      significance: 'high',
      source: 'SDNY',
      description:
        'The indictment against Epstein is unsealed, charging him with sex trafficking of minors and conspiracy.',
      entities: ['Jeffrey Epstein'],
    },
    {
      title: 'Labor Secretary Alexander Acosta Resigns',
      date: '2019-07-12',
      type: 'political',
      significance: 'high',
      source: 'U.S. Department of Labor',
      description:
        'Labor Secretary Alexander Acosta resigns amid scrutiny of his role in negotiating the 2007 non-prosecution agreement.',
      entities: ['Alexander Acosta', 'Jeffrey Epstein'],
    },
    {
      title: 'Epstein Denied Bail',
      date: '2019-07-18',
      type: 'legal',
      significance: 'high',
      source: 'SDNY',
      description:
        'Judge Richard Berman denies bail, citing danger to the community and flight risk.',
      entities: ['Jeffrey Epstein'],
    },
    {
      title: 'Giuffre v. Maxwell Documents Unsealed',
      date: '2019-08-09',
      type: 'document-release',
      significance: 'high',
      source: 'Federal Appeals Court',
      description:
        'A federal appeals court orders release of approximately 2,000 pages from the Giuffre v. Maxwell case.',
      entities: ['Virginia Giuffre', 'Ghislaine Maxwell'],
    },
    {
      title: 'Jeffrey Epstein Found Dead in Cell',
      date: '2019-08-10',
      type: 'death',
      significance: 'high',
      source: 'NYC Medical Examiner',
      description:
        'Jeffrey Epstein is found dead in his Manhattan cell. The death is ruled suicide by hanging.',
      entities: ['Jeffrey Epstein'],
    },
    {
      title: 'Ghislaine Maxwell Arrested by FBI',
      date: '2020-07-02',
      type: 'arrest',
      significance: 'high',
      source: 'DOJ',
      description:
        'Ghislaine Maxwell is arrested in New Hampshire on charges including conspiracy and sex trafficking of a minor.',
      entities: ['Ghislaine Maxwell'],
    },
    {
      title: 'Ghislaine Maxwell Trial Begins',
      date: '2021-11-29',
      type: 'legal',
      significance: 'high',
      source: 'SDNY',
      description:
        'The federal trial of Ghislaine Maxwell begins in the Southern District of New York.',
      entities: ['Ghislaine Maxwell'],
    },
    {
      title: 'Ghislaine Maxwell Found Guilty',
      date: '2021-12-29',
      type: 'legal',
      significance: 'high',
      source: 'SDNY Jury Verdict',
      description:
        'Ghislaine Maxwell is found guilty on five of six counts, including sex trafficking of a minor.',
      entities: ['Ghislaine Maxwell'],
    },
    {
      title: 'Jean-Luc Brunel Found Dead in Paris Cell',
      date: '2022-02-19',
      type: 'death',
      significance: 'high',
      source: 'French Prison Authority',
      description:
        'Jean-Luc Brunel is found dead in prison while awaiting trial in France. Death is ruled suicide.',
      entities: ['Jean-Luc Brunel'],
    },
    {
      title: 'Ghislaine Maxwell Sentenced to 20 Years',
      date: '2022-06-28',
      type: 'legal',
      significance: 'high',
      source: 'SDNY',
      description:
        'Judge Alison Nathan sentences Ghislaine Maxwell to 20 years in federal prison.',
      entities: ['Ghislaine Maxwell'],
    },
    {
      title: 'Deutsche Bank Settles for $75M',
      date: '2023-05-17',
      type: 'financial',
      significance: 'high',
      source: 'Federal Court Settlement',
      description:
        "Deutsche Bank agrees to pay $75 million to settle a lawsuit alleging facilitation of Epstein's trafficking operation.",
      entities: ['Deutsche Bank', 'Jeffrey Epstein'],
    },
    {
      title: 'JPMorgan Settles Epstein-Related Lawsuit for $290M',
      date: '2023-06-12',
      type: 'financial',
      significance: 'high',
      source: 'Federal Court Settlement',
      description:
        "JPMorgan Chase agrees to pay $290 million to settle claims tied to maintaining Epstein's accounts despite red flags.",
      entities: ['JPMorgan Chase', 'Jeffrey Epstein'],
    },
    {
      title: 'US Virgin Islands Settles with JPMorgan for $75M',
      date: '2023-09-26',
      type: 'financial',
      significance: 'high',
      source: 'USVI Attorney General',
      description:
        'The U.S. Virgin Islands settles its separate lawsuit against JPMorgan for $75 million.',
      entities: ['JPMorgan Chase', 'Jeffrey Epstein'],
    },
    {
      title: 'Epstein Court Documents Released (The "Epstein List")',
      date: '2024-01-03',
      type: 'document-release',
      significance: 'high',
      source: 'Federal Court',
      description:
        'A federal judge orders release of court documents from the Giuffre v. Maxwell case.',
      entities: ['Ghislaine Maxwell', 'Virginia Giuffre', 'Jeffrey Epstein'],
    },
    {
      title: 'DOJ OIG Report on Non-Prosecution Agreement',
      date: '2024-07-02',
      type: 'investigation',
      significance: 'high',
      source: 'DOJ OIG',
      description:
        'DOJ Office of the Inspector General publishes findings on the 2007 non-prosecution agreement.',
      entities: ['Jeffrey Epstein', 'Alexander Acosta'],
    },
    {
      title: 'AG Nominee Pam Bondi Pledges Epstein Investigation Review',
      date: '2025-01-20',
      type: 'political',
      significance: 'medium',
      source: 'U.S. Senate Hearing',
      description:
        "During confirmation hearings, AG nominee Pam Bondi pledges to review Epstein case files and remaining co-conspirator leads.",
      entities: ['Pam Bondi', 'Jeffrey Epstein'],
    },
    {
      title: 'DOJ Releases Epstein Records Online',
      date: '2025-01-24',
      type: 'document-release',
      significance: 'high',
      source: 'DOJ',
      description:
        'The U.S. Department of Justice releases thousands of pages of records from its Epstein investigation online.',
      entities: ['DOJ', 'Jeffrey Epstein'],
    },
    {
      title: 'FBI Releases Additional Epstein Files',
      date: '2025-02-01',
      type: 'document-release',
      significance: 'high',
      source: 'FBI Vault',
      description:
        'The FBI releases additional files and records related to the Jeffrey Epstein investigation.',
      entities: ['FBI', 'Jeffrey Epstein'],
    },
  ];

  for (const event of events) {
    const title = sqlEscape(event.title);
    const date = sqlEscape(event.date);
    const description = sqlEscape(event.description);
    const type = sqlEscape(event.type);
    const significance = sqlEscape(event.significance);
    const source = sqlEscape(event.source);
    const entities = sqlEscape(JSON.stringify(event.entities || []));

    pgm.sql(`
      INSERT INTO global_timeline_events (
        title,
        date,
        description,
        type,
        significance,
        entities,
        related_document_id,
        source
      )
      SELECT
        '${title}',
        '${date}'::date,
        '${description}',
        '${type}',
        '${significance}',
        '${entities}',
        NULL,
        '${source}'
      WHERE NOT EXISTS (
        SELECT 1
        FROM global_timeline_events g
        WHERE LOWER(g.title) = LOWER('${title}')
          AND g.date = '${date}'::date
      );
    `);
  }
}

export async function down(_pgm) {
  // Historical canonical seed; intentionally no-op.
}

