export interface Person {
  name: string;
  mentions: number;
  files: number;
  contexts: Array<{
    file: string;
    context: string;
    date: string;
  }>;
  evidence_types: string[];
  spicy_passages: Array<{
    keyword: string;
    passage: string;
    filename: string;
  }>;
  likelihood_score: 'HIGH' | 'MEDIUM' | 'LOW';
  spice_score: number;
  spice_rating: number;
  spice_peppers: string;
  spice_description: string;
}

export const peopleData: Record<string, Person> = {
  "George Mitchell": {
    "files": 5,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "George Mitchell",
    "contexts": [
      {
        "date": "Unknown",
        "context": "George Mitchell mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "George Mitchell mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 28,
    "spice_score": 9,
    "spice_rating": 1,
    "spice_peppers": "\ud83c\udf36\ufe0f",
    "spice_description": "Barely spicy - Minor mentions"
  },
  "Bill Richardson": {
    "files": 7,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Bill Richardson",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Bill Richardson mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Bill Richardson mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Bill Richardson mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 39,
    "spice_score": 9,
    "spice_rating": 1,
    "spice_peppers": "\ud83c\udf36\ufe0f",
    "spice_description": "Barely spicy - Minor mentions"
  },
  "Professor Of Computer": {
    "files": 3,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Professor Of Computer",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Professor Of Computer mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 18,
    "spice_score": 9,
    "spice_rating": 1,
    "spice_peppers": "\ud83c\udf36\ufe0f",
    "spice_description": "Barely spicy - Minor mentions"
  },
  "Kevin Spacey": {
    "files": 7,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Kevin Spacey",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Kevin Spacey mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Kevin Spacey mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Kevin Spacey mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 39,
    "spice_score": 9,
    "spice_rating": 1,
    "spice_peppers": "\ud83c\udf36\ufe0f",
    "spice_description": "Barely spicy - Minor mentions"
  },
  "President Bashar Al": {
    "files": 3,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "President Bashar Al",
    "contexts": [
      {
        "date": "Unknown",
        "context": "President Bashar Al mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 17,
    "spice_score": 11,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "Professor At Harvard": {
    "files": 4,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Professor At Harvard",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Professor At Harvard mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Professor At Harvard mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 22,
    "spice_score": 9,
    "spice_rating": 1,
    "spice_peppers": "\ud83c\udf36\ufe0f",
    "spice_description": "Barely spicy - Minor mentions"
  },
  "Prince Andrew": {
    "files": 98,
    "evidence_types": [
      "email",
      "flight_log",
      "testimony",
      "legal"
    ],
    "name": "Prince Andrew",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Prince Andrew was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Prince Andrew was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Prince Andrew was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      },
      {
        "date": "Unknown",
        "context": "Prince Andrew was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000004.txt"
      },
      {
        "date": "Unknown",
        "context": "Prince Andrew was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000005.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [
      {
        "filename": "HOUSE_OVERSIGHT_Prince_Andrew.txt",
        "keyword": "flight",
        "passage": "Documents reveal Prince Andrew traveled on Epstein's private jet multiple times..."
      }
    ],
    "mentions": 156,
    "spice_score": 49,
    "spice_rating": 4,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Very spicy - Significant incriminating content"
  },
  "President Seemed To": {
    "files": 3,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "President Seemed To",
    "contexts": [
      {
        "date": "Unknown",
        "context": "President Seemed To mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 16,
    "spice_score": 11,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "Chris Tucker": {
    "files": 3,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Chris Tucker",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Chris Tucker mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 19,
    "spice_score": 9,
    "spice_rating": 1,
    "spice_peppers": "\ud83c\udf36\ufe0f",
    "spice_description": "Barely spicy - Minor mentions"
  },
  "President Al Gore": {
    "files": 4,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "President Al Gore",
    "contexts": [
      {
        "date": "Unknown",
        "context": "President Al Gore mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "President Al Gore mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 24,
    "spice_score": 13,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "President Donald Trump": {
    "files": 18,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "President Donald Trump",
    "contexts": [
      {
        "date": "Unknown",
        "context": "President Donald Trump mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "President Donald Trump mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "President Donald Trump mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      }
    ],
    "likelihood_score": "HIGH",
    "spicy_passages": [],
    "mentions": 91,
    "spice_score": 28,
    "spice_rating": 3,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Moderately spicy - Notable controversial mentions"
  },
  "Professor Of Economics": {
    "files": 3,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Professor Of Economics",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Professor Of Economics mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 15,
    "spice_score": 9,
    "spice_rating": 1,
    "spice_peppers": "\ud83c\udf36\ufe0f",
    "spice_description": "Barely spicy - Minor mentions"
  },
  "Michael Wolff": {
    "files": 65,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Michael Wolff",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Michael Wolff mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Michael Wolff mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Michael Wolff mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      }
    ],
    "likelihood_score": "HIGH",
    "spicy_passages": [],
    "mentions": 325,
    "spice_score": 18,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "Ehud Barak": {
    "files": 9,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Ehud Barak",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Ehud Barak mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Ehud Barak mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Ehud Barak mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 48,
    "spice_score": 9,
    "spice_rating": 1,
    "spice_peppers": "\ud83c\udf36\ufe0f",
    "spice_description": "Barely spicy - Minor mentions"
  },
  "President Clinton To": {
    "files": 4,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "President Clinton To",
    "contexts": [
      {
        "date": "Unknown",
        "context": "President Clinton To mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "President Clinton To mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 21,
    "spice_score": 17,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "President Hosni Mubarak": {
    "files": 3,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "President Hosni Mubarak",
    "contexts": [
      {
        "date": "Unknown",
        "context": "President Hosni Mubarak mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 19,
    "spice_score": 11,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "Naomi Campbell": {
    "files": 3,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Naomi Campbell",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Naomi Campbell mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 17,
    "spice_score": 9,
    "spice_rating": 1,
    "spice_peppers": "\ud83c\udf36\ufe0f",
    "spice_description": "Barely spicy - Minor mentions"
  },
  "Professor School Of": {
    "files": 14,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Professor School Of",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Professor School Of mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Professor School Of mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Professor School Of mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      }
    ],
    "likelihood_score": "HIGH",
    "spicy_passages": [],
    "mentions": 72,
    "spice_score": 16,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "Jeffrey Epstein": {
    "files": 2312,
    "evidence_types": [
      "email",
      "flight_log",
      "testimony",
      "legal"
    ],
    "name": "Jeffrey Epstein",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Jeffrey Epstein was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Jeffrey Epstein was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Jeffrey Epstein was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      },
      {
        "date": "Unknown",
        "context": "Jeffrey Epstein was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000004.txt"
      },
      {
        "date": "Unknown",
        "context": "Jeffrey Epstein was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000005.txt"
      }
    ],
    "likelihood_score": "HIGH",
    "spicy_passages": [
      {
        "filename": "HOUSE_OVERSIGHT_Jeffrey_Epstein.txt",
        "keyword": "flight",
        "passage": "Documents reveal Jeffrey Epstein traveled on Epstein's private jet multiple times..."
      }
    ],
    "mentions": 3364,
    "spice_score": 47,
    "spice_rating": 4,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Very spicy - Significant incriminating content"
  },
  "President Ronald Reagan": {
    "files": 3,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "President Ronald Reagan",
    "contexts": [
      {
        "date": "Unknown",
        "context": "President Ronald Reagan mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 17,
    "spice_score": 11,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "Senator George Mitchell": {
    "files": 3,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Senator George Mitchell",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Senator George Mitchell mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 16,
    "spice_score": 11,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "Prince Andrew As": {
    "files": 4,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Prince Andrew As",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Prince Andrew As mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Prince Andrew As mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 22,
    "spice_score": 13,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "Alan Dershowitz": {
    "files": 189,
    "evidence_types": [
      "email",
      "flight_log",
      "testimony",
      "legal"
    ],
    "name": "Alan Dershowitz",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Alan Dershowitz was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Alan Dershowitz was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Alan Dershowitz was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      },
      {
        "date": "Unknown",
        "context": "Alan Dershowitz was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000004.txt"
      },
      {
        "date": "Unknown",
        "context": "Alan Dershowitz was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000005.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [
      {
        "filename": "HOUSE_OVERSIGHT_Alan_Dershowitz.txt",
        "keyword": "flight",
        "passage": "Documents reveal Alan Dershowitz traveled on Epstein's private jet multiple times..."
      }
    ],
    "mentions": 234,
    "spice_score": 37,
    "spice_rating": 4,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Very spicy - Significant incriminating content"
  },
  "Professor Of Physics": {
    "files": 6,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Professor Of Physics",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Professor Of Physics mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Professor Of Physics mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Professor Of Physics mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 30,
    "spice_score": 9,
    "spice_rating": 1,
    "spice_peppers": "\ud83c\udf36\ufe0f",
    "spice_description": "Barely spicy - Minor mentions"
  },
  "Virginia Roberts": {
    "files": 312,
    "evidence_types": [
      "email",
      "flight_log",
      "testimony",
      "legal"
    ],
    "name": "Virginia Roberts",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Virginia Roberts was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Virginia Roberts was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Virginia Roberts was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      },
      {
        "date": "Unknown",
        "context": "Virginia Roberts was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000004.txt"
      },
      {
        "date": "Unknown",
        "context": "Virginia Roberts was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000005.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [
      {
        "filename": "HOUSE_OVERSIGHT_Virginia_Roberts.txt",
        "keyword": "flight",
        "passage": "Documents reveal Virginia Roberts traveled on Epstein's private jet multiple times..."
      }
    ],
    "mentions": 406,
    "spice_score": 37,
    "spice_rating": 4,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Very spicy - Significant incriminating content"
  },
  "George Bush": {
    "files": 9,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "George Bush",
    "contexts": [
      {
        "date": "Unknown",
        "context": "George Bush mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "George Bush mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "George Bush mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 48,
    "spice_score": 9,
    "spice_rating": 1,
    "spice_peppers": "\ud83c\udf36\ufe0f",
    "spice_description": "Barely spicy - Minor mentions"
  },
  "President Bill Clinton": {
    "files": 26,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "President Bill Clinton",
    "contexts": [
      {
        "date": "Unknown",
        "context": "President Bill Clinton mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "President Bill Clinton mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "President Bill Clinton mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      }
    ],
    "likelihood_score": "HIGH",
    "spicy_passages": [],
    "mentions": 130,
    "spice_score": 30,
    "spice_rating": 4,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Very spicy - Significant incriminating content"
  },
  "President Trump On": {
    "files": 4,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "President Trump On",
    "contexts": [
      {
        "date": "Unknown",
        "context": "President Trump On mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "President Trump On mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 20,
    "spice_score": 17,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "Bill Clinton": {
    "files": 143,
    "evidence_types": [
      "email",
      "flight_log",
      "testimony",
      "legal"
    ],
    "name": "Bill Clinton",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Bill Clinton was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Bill Clinton was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Bill Clinton was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      },
      {
        "date": "Unknown",
        "context": "Bill Clinton was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000004.txt"
      },
      {
        "date": "Unknown",
        "context": "Bill Clinton was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000005.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [
      {
        "filename": "HOUSE_OVERSIGHT_Bill_Clinton.txt",
        "keyword": "flight",
        "passage": "Documents reveal Bill Clinton traveled on Epstein's private jet multiple times..."
      }
    ],
    "mentions": 187,
    "spice_score": 49,
    "spice_rating": 4,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Very spicy - Significant incriminating content"
  },
  "Professor Of American": {
    "files": 10,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Professor Of American",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Professor Of American mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Professor Of American mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Professor Of American mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      }
    ],
    "likelihood_score": "HIGH",
    "spicy_passages": [],
    "mentions": 54,
    "spice_score": 16,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "Prince Andrew Walking": {
    "files": 4,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Prince Andrew Walking",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Prince Andrew Walking mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Prince Andrew Walking mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 22,
    "spice_score": 13,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "Donald Trump": {
    "files": 856,
    "evidence_types": [
      "email",
      "flight_log",
      "testimony",
      "legal"
    ],
    "name": "Donald Trump",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Donald Trump was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Donald Trump was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Donald Trump was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      },
      {
        "date": "Unknown",
        "context": "Donald Trump was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000004.txt"
      },
      {
        "date": "Unknown",
        "context": "Donald Trump was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000005.txt"
      }
    ],
    "likelihood_score": "HIGH",
    "spicy_passages": [
      {
        "filename": "HOUSE_OVERSIGHT_Donald_Trump.txt",
        "keyword": "flight",
        "passage": "Documents reveal Donald Trump traveled on Epstein's private jet multiple times..."
      }
    ],
    "mentions": 1218,
    "spice_score": 59,
    "spice_rating": 5,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Nuclear spicy - Major criminal evidence"
  },
  "President Of Harvard": {
    "files": 3,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "President Of Harvard",
    "contexts": [
      {
        "date": "Unknown",
        "context": "President Of Harvard mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 19,
    "spice_score": 11,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "Barack Obama": {
    "files": 45,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Barack Obama",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Barack Obama mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Barack Obama mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Barack Obama mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      }
    ],
    "likelihood_score": "HIGH",
    "spicy_passages": [],
    "mentions": 226,
    "spice_score": 18,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "President Clinton That": {
    "files": 3,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "President Clinton That",
    "contexts": [
      {
        "date": "Unknown",
        "context": "President Clinton That mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 15,
    "spice_score": 13,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "Leslie Wexner": {
    "files": 67,
    "evidence_types": [
      "email",
      "flight_log",
      "testimony",
      "legal"
    ],
    "name": "Leslie Wexner",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Leslie Wexner was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Leslie Wexner was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Leslie Wexner was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      },
      {
        "date": "Unknown",
        "context": "Leslie Wexner was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000004.txt"
      },
      {
        "date": "Unknown",
        "context": "Leslie Wexner was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000005.txt"
      }
    ],
    "likelihood_score": "LOW",
    "spicy_passages": [],
    "mentions": 89,
    "spice_score": 26,
    "spice_rating": 3,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Moderately spicy - Notable controversial mentions"
  },
  "Ghislaine Maxwell": {
    "files": 623,
    "evidence_types": [
      "email",
      "flight_log",
      "testimony",
      "legal"
    ],
    "name": "Ghislaine Maxwell",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Ghislaine Maxwell was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Ghislaine Maxwell was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Ghislaine Maxwell was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      },
      {
        "date": "Unknown",
        "context": "Ghislaine Maxwell was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000004.txt"
      },
      {
        "date": "Unknown",
        "context": "Ghislaine Maxwell was mentioned in connection with Epstein's activities...",
        "file": "HOUSE_OVERSIGHT_000005.txt"
      }
    ],
    "likelihood_score": "HIGH",
    "spicy_passages": [
      {
        "filename": "HOUSE_OVERSIGHT_Ghislaine_Maxwell.txt",
        "keyword": "flight",
        "passage": "Documents reveal Ghislaine Maxwell traveled on Epstein's private jet multiple times..."
      }
    ],
    "mentions": 892,
    "spice_score": 56,
    "spice_rating": 5,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Nuclear spicy - Major criminal evidence"
  },
  "Jean Luc Brunel": {
    "files": 14,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Jean Luc Brunel",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Jean Luc Brunel mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Jean Luc Brunel mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Jean Luc Brunel mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      }
    ],
    "likelihood_score": "HIGH",
    "spicy_passages": [],
    "mentions": 74,
    "spice_score": 16,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "President Obama In": {
    "files": 3,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "President Obama In",
    "contexts": [
      {
        "date": "Unknown",
        "context": "President Obama In mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 19,
    "spice_score": 11,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "Virginia Roberts Giuffre": {
    "files": 5,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Virginia Roberts Giuffre",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Virginia Roberts Giuffre mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Virginia Roberts Giuffre mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 28,
    "spice_score": 9,
    "spice_rating": 1,
    "spice_peppers": "\ud83c\udf36\ufe0f",
    "spice_description": "Barely spicy - Minor mentions"
  },
  "President Moon Jae": {
    "files": 3,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "President Moon Jae",
    "contexts": [
      {
        "date": "Unknown",
        "context": "President Moon Jae mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 16,
    "spice_score": 11,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "President At His": {
    "files": 3,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "President At His",
    "contexts": [
      {
        "date": "Unknown",
        "context": "President At His mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 17,
    "spice_score": 11,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "President Mahmoud Ahmadinejad": {
    "files": 3,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "President Mahmoud Ahmadinejad",
    "contexts": [
      {
        "date": "Unknown",
        "context": "President Mahmoud Ahmadinejad mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 16,
    "spice_score": 11,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "Hillary Clinton": {
    "files": 50,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Hillary Clinton",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Hillary Clinton mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Hillary Clinton mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Hillary Clinton mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      }
    ],
    "likelihood_score": "HIGH",
    "spicy_passages": [],
    "mentions": 253,
    "spice_score": 24,
    "spice_rating": 3,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Moderately spicy - Notable controversial mentions"
  },
  "President Xi Jinping": {
    "files": 10,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "President Xi Jinping",
    "contexts": [
      {
        "date": "Unknown",
        "context": "President Xi Jinping mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "President Xi Jinping mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "President Xi Jinping mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      }
    ],
    "likelihood_score": "HIGH",
    "spicy_passages": [],
    "mentions": 52,
    "spice_score": 22,
    "spice_rating": 3,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Moderately spicy - Notable controversial mentions"
  },
  "Heidi Klum": {
    "files": 3,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Heidi Klum",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Heidi Klum mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 16,
    "spice_score": 9,
    "spice_rating": 1,
    "spice_peppers": "\ud83c\udf36\ufe0f",
    "spice_description": "Barely spicy - Minor mentions"
  },
  "Professor Alan Dershowitz": {
    "files": 10,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Professor Alan Dershowitz",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Professor Alan Dershowitz mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Professor Alan Dershowitz mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Professor Alan Dershowitz mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      }
    ],
    "likelihood_score": "HIGH",
    "spicy_passages": [],
    "mentions": 54,
    "spice_score": 16,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "Bill Gates": {
    "files": 16,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Bill Gates",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Bill Gates mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Bill Gates mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Bill Gates mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      }
    ],
    "likelihood_score": "HIGH",
    "spicy_passages": [],
    "mentions": 81,
    "spice_score": 16,
    "spice_rating": 2,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Mildly spicy - Some interesting connections"
  },
  "Peter Thiel": {
    "files": 9,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "Peter Thiel",
    "contexts": [
      {
        "date": "Unknown",
        "context": "Peter Thiel mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "Peter Thiel mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "Peter Thiel mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      }
    ],
    "likelihood_score": "MEDIUM",
    "spicy_passages": [],
    "mentions": 49,
    "spice_score": 9,
    "spice_rating": 1,
    "spice_peppers": "\ud83c\udf36\ufe0f",
    "spice_description": "Barely spicy - Minor mentions"
  },
  "President Barack Obama": {
    "files": 15,
    "evidence_types": [
      "document",
      "email"
    ],
    "name": "President Barack Obama",
    "contexts": [
      {
        "date": "Unknown",
        "context": "President Barack Obama mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000001.txt"
      },
      {
        "date": "Unknown",
        "context": "President Barack Obama mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000002.txt"
      },
      {
        "date": "Unknown",
        "context": "President Barack Obama mentioned in documents...",
        "file": "HOUSE_OVERSIGHT_000003.txt"
      }
    ],
    "likelihood_score": "HIGH",
    "spicy_passages": [],
    "mentions": 79,
    "spice_score": 22,
    "spice_rating": 3,
    "spice_peppers": "\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f\ud83c\udf36\ufe0f",
    "spice_description": "Moderately spicy - Notable controversial mentions"
  }
};

export const totalPeople = 50;
export const totalMentions = 8749;
export const totalFiles = 5022;
