
// Rules for consolidating Top 100 VIP entities into canonical profiles
// This prevents fragmentation (e.g. "Jeffry Epstein" vs "Jeffrey Epstein")

export interface VipRule {
  canonicalName: string;
  aliases: string[];
  patterns: RegExp[]; // Regex for aggressive matching (use with caution)
  type: 'Person' | 'Organization';
}

export const VIP_RULES: VipRule[] = [
  // --- KEY FIGURES ---
  {
    canonicalName: 'Jeffrey Epstein',
    type: 'Person',
    aliases: ['Jeff Epstein', 'Mr. Epstein', 'Jeffry Epstein', 'Jeffrey E. Epstein', 'J. Epstein'],
    patterns: [/Jeffrey\s+Epstein/i, /Jeff\s+Epstein/i],
  },
  {
    canonicalName: 'Ghislaine Maxwell',
    type: 'Person',
    aliases: ['G. Maxwell', 'Ms. Maxwell', 'Miss Maxwell', 'Ghislane Maxwell'],
    patterns: [/Ghislaine\s+Maxwell/i, /Ghislane\s+Maxwell/i],
  },
  {
    canonicalName: 'Donald Trump',
    type: 'Person',
    aliases: ['Donald J. Trump', 'Mr. Trump', 'President Trump', 'The Donald', 'Donald John Trump'],
    patterns: [/Donald\s+Trump/i, /President\s+Trump/i],
  },
  {
    canonicalName: 'Bill Clinton',
    type: 'Person',
    aliases: ['William Jefferson Clinton', 'President Clinton', 'Mr. Clinton', 'William Clinton'],
    patterns: [/Bill\s+Clinton/i, /President\s+Clinton/i, /William\s+Clinton/i],
  },
  {
    canonicalName: 'Prince Andrew',
    type: 'Person',
    aliases: ['Duke of York', 'Andrew Albert Christian Edward', 'HRH Prince Andrew'],
    patterns: [/Prince\s+Andrew/i, /Duke\s+of\s+York/i],
  },
  {
    canonicalName: 'Alan Dershowitz',
    type: 'Person',
    aliases: ['Alan M. Dershowitz', 'Mr. Dershowitz', 'Professor Dershowitz'],
    patterns: [/Alan\s+Dershowitz/i],
  },
  {
    canonicalName: 'Les Wexner',
    type: 'Person',
    aliases: ['Leslie Wexner', 'Mr. Wexner', 'Leslie H. Wexner'],
    patterns: [/Les\s+Wexner/i, /Leslie\s+Wexner/i],
  },
  {
    canonicalName: 'Jean Luc Brunel',
    type: 'Person',
    aliases: ['Jean-Luc Brunel', 'MC2 Model Management', 'J.L. Brunel'],
    patterns: [/Jean\s+Luc\s+Brunel/i, /Jean-Luc\s+Brunel/i],
  },
  {
    canonicalName: 'Sarah Kellen',
    type: 'Person',
    aliases: ['Sarah Kellen Vidal', 'Sarah Vickers', 'Sarah Vidal'],
    patterns: [/Sarah\s+Kellen/i],
  },
   {
    canonicalName: 'Nadia Marcinkova',
    type: 'Person',
    aliases: ['Nadia Marcinko', 'Global Girl'],
    patterns: [/Nadia\s+Marcinkova/i, /Nadia\s+Marcinko/i],
  },

  // --- TRUMP FAMILY ---
  {
    canonicalName: 'Melania Trump',
    type: 'Person',
    aliases: ['Melania Knauss', 'Melania Knauss-Trump', 'Mrs. Trump'],
    patterns: [/Melania\s+Trump/i, /Melania\s+Knauss/i],
  },
  {
    canonicalName: 'Ivanka Trump',
    type: 'Person',
    aliases: ['Ivanka Marie Trump'],
    patterns: [/Ivanka\s+Trump/i],
  },

  // --- POLITICIANS / ASSOCIATES ---
  {
    canonicalName: 'George Mitchell',
    type: 'Person',
    aliases: ['George J. Mitchell', 'Senator Mitchell', 'Mr. Mitchell'],
    patterns: [/George\s+Mitchell/i],
  },
  {
    canonicalName: 'Bill Richardson',
    type: 'Person',
    aliases: ['Governor Richardson', 'William Richardson', 'Gov. Richardson'],
    patterns: [/Bill\s+Richardson/i],
  },
   {
    canonicalName: 'Ehud Barak',
    type: 'Person',
    aliases: ['Prime Minister Barak', 'Mr. Barak'],
    patterns: [/Ehud\s+Barak/i],
  },
  {
    canonicalName: 'Kevin Spacey',
    type: 'Person',
    aliases: ['Kevin Spacey Fowler'],
    patterns: [/Kevin\s+Spacey/i],
  },
  {
    canonicalName: 'Chris Tucker',
    type: 'Person',
    aliases: ['Christopher Tucker'],
    patterns: [/Chris\s+Tucker/i],
  },
  {
    canonicalName: 'Michael Cohen',
    type: 'Person',
    aliases: ['Michael D. Cohen', 'Mr. Cohen', 'Attorney Cohen'],
    patterns: [/Michael\s+Cohen/i],
  },
  
  // --- ORGANIZATIONS ---
  {
      canonicalName: 'The Trump Organization',
      type: 'Organization',
      aliases: ['Trump Org', 'Trump Organization'],
      patterns: [/Trump\s+Org/i, /Trump\s+Organization/i]
  },
  {
      canonicalName: 'Victoria\'s Secret',
      type: 'Organization',
      aliases: ['Victorias Secret', 'Victoria Secret'],
      patterns: [/Victoria'?s\s+Secret/i]
  }
];

export function resolveVip(name: string): string | null {
  const normalized = name.trim();
  
  for (const rule of VIP_RULES) {
    // 1. Exact alias match
    if (rule.aliases.includes(normalized)) return rule.canonicalName;
    
    // 2. Pattern match
    for (const pattern of rule.patterns) {
      if (pattern.test(normalized)) return rule.canonicalName;
    }
  }
  
  return null;
}
