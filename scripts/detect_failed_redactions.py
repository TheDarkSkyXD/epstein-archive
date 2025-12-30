#!/usr/bin/env python3
"""
Detect failed PDF redactions using x-ray library.
Finds text hidden under black boxes that wasn't properly removed.
"""

import os
import sys
import json
import sqlite3
from pathlib import Path

try:
    import xray
except ImportError:
    print("Installing x-ray library...")
    os.system("pip install x-ray")
    import xray

# Configuration
DB_PATH = os.environ.get('DB_PATH', './epstein-archive.db')
DATA_DIR = os.environ.get('DATA_DIR', './data/originals')

def get_pdf_files(data_dir: str) -> list:
    """Find all PDF files in the data directory."""
    pdf_files = []
    for root, dirs, files in os.walk(data_dir):
        for file in files:
            if file.lower().endswith('.pdf'):
                pdf_files.append(os.path.join(root, file))
    return pdf_files

def detect_failed_redactions(pdf_path: str) -> dict:
    """
    Detect failed redactions in a PDF file.
    Returns dict with redaction data or None if no issues found.
    """
    try:
        # xray.inspect returns a Document object with bad_redactions
        doc = xray.inspect(pdf_path)
        bad_redactions = doc.get("bad_redactions", [])
        
        if not bad_redactions:
            return None
            
        redactions = []
        for item in bad_redactions:
            redactions.append({
                'page': item.get('page', 0),
                'text': item.get('text', ''),
                'bbox': item.get('bbox', []),
            })
        
        return {
            'count': len(redactions),
            'redactions': redactions
        }
    except Exception as e:
        print(f"  Error processing {pdf_path}: {e}")
        return None

def get_document_by_path(conn: sqlite3.Connection, file_path: str) -> dict:
    """Find document in database by file path."""
    cursor = conn.cursor()
    
    # Normalize path for matching
    filename = os.path.basename(file_path)
    
    # Try to match by filename in file_path or source_file
    cursor.execute("""
        SELECT id, title, file_path 
        FROM documents 
        WHERE file_path LIKE ? OR source_file LIKE ?
        LIMIT 1
    """, (f'%{filename}%', f'%{filename}%'))
    
    row = cursor.fetchone()
    if row:
        return {'id': row[0], 'title': row[1], 'file_path': row[2]}
    return None

def update_document_redactions(conn: sqlite3.Connection, doc_id: int, redaction_data: dict):
    """Update document with failed redaction data."""
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE documents 
        SET has_failed_redactions = 1,
            failed_redaction_count = ?,
            failed_redaction_data = ?
        WHERE id = ?
    """, (redaction_data['count'], json.dumps(redaction_data['redactions']), doc_id))
    conn.commit()

def main():
    print("=" * 60)
    print("FAILED REDACTION DETECTION SCANNER")
    print("=" * 60)
    print(f"\nDB Path: {DB_PATH}")
    print(f"Data Dir: {DATA_DIR}\n")
    
    # Find all PDFs
    pdf_files = get_pdf_files(DATA_DIR)
    print(f"Found {len(pdf_files)} PDF files to scan\n")
    
    if not pdf_files:
        print("No PDF files found. Check DATA_DIR path.")
        return
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    
    # Process each PDF
    total_with_issues = 0
    total_redactions = 0
    
    for i, pdf_path in enumerate(pdf_files, 1):
        print(f"[{i}/{len(pdf_files)}] Scanning: {os.path.basename(pdf_path)}", end="")
        
        redaction_data = detect_failed_redactions(pdf_path)
        
        if redaction_data:
            print(f" -> ⚠️  {redaction_data['count']} failed redaction(s) found!")
            total_with_issues += 1
            total_redactions += redaction_data['count']
            
            # Try to find and update document in database
            doc = get_document_by_path(conn, pdf_path)
            if doc:
                update_document_redactions(conn, doc['id'], redaction_data)
                print(f"    Updated document ID: {doc['id']}")
                
                # Print the hidden text
                for r in redaction_data['redactions']:
                    text_preview = r['text'][:100] + '...' if len(r['text']) > 100 else r['text']
                    print(f"    📄 Page {r['page']}: \"{text_preview}\"")
            else:
                print(f"    ⚠️  Document not found in database")
        else:
            print(" -> ✓ Clean")
    
    conn.close()
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total PDFs scanned: {len(pdf_files)}")
    print(f"Documents with failed redactions: {total_with_issues}")
    print(f"Total failed redactions found: {total_redactions}")
    print("=" * 60)

if __name__ == '__main__':
    main()
