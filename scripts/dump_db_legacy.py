
import sqlite3
import sys

# Increase field size limit just in case
sqlite3.enable_callback_tracebacks(True)

def dump_db():
    try:
        con = sqlite3.connect('epstein-archive.db')
        
        # Open output file
        with open('epstein-archive-dump-legacy.sql', 'w', encoding='utf-8') as f:
            for line in con.iterdump():
                f.write('%s\n' % line)
                
        print("Dump successful: epstein-archive-dump-legacy.sql")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    dump_db()
