
import requests
import json
import time
import os
import hashlib
import argparse

# Configuration
BASE_URL = "https://www.justice.gov"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "ingest")
DELAY_BETWEEN_REQUESTS = 0.1  # Seconds (Optimized for bulk)
DATA_SETS = [
    {"name": "DOJVOL00009", "url": "https://www.justice.gov/epstein/doj-disclosures/data-set-9-files", "json": os.path.join(OUTPUT_DIR, "dataset_9_links.json")},
    {"name": "DOJVOL00010", "url": "https://www.justice.gov/epstein/doj-disclosures/data-set-10-files", "json": os.path.join(OUTPUT_DIR, "dataset_10_links.json")},
    {"name": "DOJVOL00011", "url": "https://www.justice.gov/epstein/doj-disclosures/data-set-11-video-files", "json": os.path.join(OUTPUT_DIR, "dataset_11_links.json")},
    {"name": "DOJVOL00012", "url": "https://www.justice.gov/epstein/doj-disclosures/data-set-12-files", "json": os.path.join(OUTPUT_DIR, "dataset_12_links.json")},
]

# Captured from scraper/browser (2026-02-03)
CAPTURED_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Cookie": "QueueITAccepted-SDFrts345E-V3_usdojsearch=EventId%3Dusdojsearch%26RedirectType%3Dsafetynet%26IssueTime%3D1770081097%26Hash%3D0b2dfccfa093f4c3fcb0ed84d44d23c2b52026247975138d1f64ad734c38357a; justiceGovAgeVerified=true"
}

def calculate_hash(filepath):
    """Calculate SHA256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        # Read and update hash string value in blocks of 4K
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def download_file(url, output_dir, session):
    filename = url.split('/')[-1]
    # Remove query string if present
    if "?" in filename:
        filename = filename.split("?")[0]
        
    filepath = os.path.join(output_dir, filename)
    tmp_filepath = filepath + ".tmp"
    
    # Ensure dir exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print(f"  Downloading {filename}...", end="\r")
    try:
        response = session.get(url, stream=True, timeout=30)
        if response.status_code == 200:
            with open(tmp_filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            # Check for existing file collision
            if os.path.exists(filepath):
                existing_hash = calculate_hash(filepath)
                new_hash = calculate_hash(tmp_filepath)
                
                if existing_hash == new_hash:
                    # True duplicate, discard
                    if os.path.exists(tmp_filepath):
                        os.remove(tmp_filepath)
                    print(f"  Skipping {filename} (identical file exists)          ")
                else:
                    # Content differs! Save as conflict
                    conflict_filename = f"{os.path.splitext(filename)[0]}_conflict_{new_hash[:8]}{os.path.splitext(filename)[1]}"
                    conflict_path = os.path.join(output_dir, conflict_filename)
                    if os.path.exists(conflict_path):
                        if os.path.exists(tmp_filepath):
                            os.remove(tmp_filepath)
                        print(f"  Skipping duplicate conflict {conflict_filename}        ")
                    else:
                        os.rename(tmp_filepath, conflict_path)
                        print(f"  ⚠️  CONFLICT: {filename} exists with different content! Saved as {conflict_filename}")
            else:
                # New file
                os.rename(tmp_filepath, filepath)
                print(f"  Saved {filename}                                     ")
                
        else:
            print(f"  ❌ Failed to download {url}: Status {response.status_code}")
            if os.path.exists(tmp_filepath):
                os.remove(tmp_filepath)
    except Exception as e:
        print(f"  Error downloading {url}: {e}")
        if os.path.exists(tmp_filepath):
            os.remove(tmp_filepath)

def process_dataset(dataset):
    print(f"\nProcessing {dataset['name']}...")
    
    if not dataset['json'] or not os.path.exists(dataset['json']):
        print(f"  Links file not found: {dataset['json']}")
        return

    with open(dataset['json'], 'r') as f:
        links = json.load(f)
    
    print(f"  Loaded {len(links)} links from {dataset['json']}")
    
    output_dir = os.path.join(OUTPUT_DIR, dataset['name'])
    
    session = requests.Session()
    session.headers.update(CAPTURED_HEADERS)
    
    for link in links:
        download_file(link, output_dir, session)
        time.sleep(DELAY_BETWEEN_REQUESTS)

def main():
    parser = argparse.ArgumentParser(description='Download DOJ datasets.')
    parser.add_argument('--dataset', help='Specific dataset name to process (e.g., DOJVOL00012)')
    args = parser.parse_args()

    print("Starting optimized download pipeline...")
    
    datasets_to_process = DATA_SETS
    if args.dataset:
        datasets_to_process = [d for d in DATA_SETS if d['name'] == args.dataset]
        if not datasets_to_process:
            print(f"Error: Dataset {args.dataset} not found.")
            return

    for dataset in datasets_to_process:
        process_dataset(dataset)
    print("\nAll downloads complete.")

if __name__ == "__main__":
    main()
