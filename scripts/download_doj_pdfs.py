import requests
import os
import time
import json
from bs4 import BeautifulSoup
from urllib.parse import urljoin, unquote

# Configuration
BASE_URL = "https://www.justice.gov"
OUTPUT_DIR = "doj_epstein_pdfs"
DELAY_BETWEEN_REQUESTS = 1.0  # Seconds
DATA_SETS = [
    # {"name": "data-set-9", "url": "https://www.justice.gov/epstein/doj-disclosures/data-set-9-files", "json": None},
    {"name": "data-set-10", "url": "https://www.justice.gov/epstein/doj-disclosures/data-set-10-files", "json": "dataset_10_links.json"},
    {"name": "data-set-11", "url": "https://www.justice.gov/epstein/doj-disclosures/data-set-11-video-files", "json": "dataset_11_links.json"},
    # {"name": "data-set-12", "url": "https://www.justice.gov/epstein/doj-disclosures/data-set-12-files", "json": "dataset_12_links.json"},
]

# Captured from Browser Agent (2026-02-01)
CAPTURED_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Cookie": "QueueITAccepted-SDFrts345E-V3_usdojsearch=EventId%3Dusdojsearch%26RedirectType%3Dsafetynet%26IssueTime%3D1769871744%26Hash%3D554cdd87e35c1e0bbe3d52e0772431502c6cc1cdd6aba364b5e546cc19270bd1; nmstat=4a5e72c3-3f06-4dc0-3655-65b562cb48b9; _ga=GA1.1.498949710.1769871746; justiceGovAgeVerified=true; _ga_CSLL4ZEK4L=GS2.1.s1769871746$o1$g1$t1769871904$j60$l0$h0"
}

def create_session():
    """Create a session with captured browser headers."""
    session = requests.Session()
    session.headers.update(CAPTURED_HEADERS)
    return session

def download_file(session, url, output_path):
    filename = os.path.basename(unquote(url))
    # Sanitize
    filename = "".join([c for c in filename if c.isalpha() or c.isdigit() or c in (' ', '.', '_', '-')]).rstrip()
    filepath = os.path.join(output_path, filename)

    if os.path.exists(filepath):
        # Basic check
        if os.path.getsize(filepath) > 1000:
             try:
                 with open(filepath, 'rb') as f:
                     if f.read(4) == b'%PDF':
                         return True
             except:
                 pass

    try:
        response = session.get(url, stream=True)
        response.raise_for_status()

        content_type = response.headers.get("Content-Type", "").lower()
        if "html" in content_type:
            print(f"  ⚠️ Warning: Got HTML for {filename} (Possible Auth/Rate Limit issue)")
            return False

        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                
        # Validate header
        with open(filepath, 'rb') as f:
            if f.read(4) != b'%PDF':
                 print(f"  ❌ Downloaded file {filename} is NOT a PDF.")
                 os.remove(filepath)
                 return False
                 
        print(f"  Downloaded: {filename}")
        time.sleep(DELAY_BETWEEN_REQUESTS)
        return True
    except Exception as e:
        print(f"  Error downloading {url}: {e}")
        return False

def process_data_set(session, data_set):
    print(f"\nProcessing {data_set['name']}...")
    ds_dir = os.path.join(OUTPUT_DIR, data_set['name'])
    os.makedirs(ds_dir, exist_ok=True)
    
    json_filename = data_set.get('json')
    if not json_filename:
        print(f"  ❌ No JSON file configured for {data_set['name']}")
        return

    # Check local dir first, then Downloads
    json_path = json_filename
    if not os.path.exists(json_path):
        # Fallback to checking Downloads folder
        downloads_path = os.path.expanduser(f"~/Downloads/{json_filename}")
        if os.path.exists(downloads_path):
            json_path = downloads_path
        else:
             print(f"  ❌ {json_filename} not found in current dir or Downloads!")
             return

    with open(json_path, 'r') as f:
        links = json.load(f)
        
    print(f"  Loaded {len(links)} links from {json_path}")
    
    total = len(links)
    for i, pdf_url in enumerate(links):
        filename = unquote(pdf_url.split('/')[-1])
        filepath = os.path.join(ds_dir, filename)
        
        if os.path.exists(filepath):
            continue
            
        if (i+1) % 100 == 0:
            print(f"  [{i+1}/{total}] Processing...")
            
        download_file(session, pdf_url, ds_dir)


def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    session = create_session()
    
    for data_set in DATA_SETS:
        process_data_set(session, data_set)

    print("\nAll downloads complete.")

if __name__ == "__main__":
    main()
