import requests
from bs4 import BeautifulSoup
import json
import time
import os
import random

# Configuration
BASE_URL = "https://www.justice.gov"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    # "Cookie": "justiceGovAgeVerified=true" # Often better to let the session set cookies
}

DATASETS = [
    {
        "name": "dataset_10",
        "url_base": "https://www.justice.gov/epstein/doj-disclosures/data-set-10-files?page=",
        "output_file": "dataset_10_links.json",
        "link_pattern": "/files/DataSet%2010/"
    },
    {
        "name": "dataset_11",
        "url_base": "https://www.justice.gov/epstein/doj-disclosures/data-set-11-files?page=",
        "output_file": "dataset_11_links.json",
        "link_pattern": "/files/DataSet%2011/"
    }
]

def get_random_delay():
    return random.uniform(2.5, 5.5)

def scrape_dataset(dataset):
    print(f"Scraping {dataset['name']}...")
    
    # Load existing links if any to avoid total loss
    if os.path.exists(dataset['output_file']):
        with open(dataset['output_file'], 'r') as f:
            try:
                existing = json.load(f)
                all_links = set(existing)
                print(f"  Loaded {len(all_links)} existing links.")
            except:
                all_links = set()
    else:
        all_links = set()

    page = 0
    empty_pages_consecutive = 0
    # User Intel: Dataset 10 has gaps (104 -> 1020+). increase tolerance.
    max_empty_pages = 50 
    max_retries = 3
    
    # Loop detection
    last_page_links = set()
    
    session = requests.Session()
    session.headers.update(HEADERS)

    while True:
        url = f"{dataset['url_base']}{page}"
        print(f"  Fetching page {page}...", end="\r")
        
        success = False
        for attempt in range(max_retries):
            try:
                response = session.get(url, timeout=20)
                
                if response.status_code == 200:
                    success = True
                    break
                elif response.status_code == 403 or response.status_code == 429:
                    wait_time = 30 + (attempt * 30) + random.uniform(0, 10)
                    print(f"\n  ⚠️  Got {response.status_code} on page {page}. Sleeping {wait_time:.1f}s...")
                    time.sleep(wait_time)
                    # Rotate user agent slightly?
                    session.headers.update({"User-Agent": HEADERS["User-Agent"] + str(random.randint(0, 9))})
                else:
                    print(f"\n  ❌ Failed to fetch page {page}: Status {response.status_code}")
                    break
            except Exception as e:
                print(f"\n  Error on page {page}: {e}")
                time.sleep(5)
        
        if not success:
            print(f"\n  ❌ Could not fetch page {page} after retries. Saving progress and stopping.")
            break

        soup = BeautifulSoup(response.text, 'html.parser')
        current_page_links_set = set()
        links_on_page = []
        for a in soup.find_all('a', href=True):
            href = a['href']
            if dataset['link_pattern'] in href:
                full_url = requests.compat.urljoin(BASE_URL, href)
                links_on_page.append(full_url)
                current_page_links_set.add(full_url)
        
        # Check for Loops (User Intel: Dataset 11 loops)
        if current_page_links_set and current_page_links_set == last_page_links:
             print(f"\n  🔄 Loop detected at page {page} (same links as previous). Stopping.")
             break
        last_page_links = current_page_links_set

        if not links_on_page:
            empty_pages_consecutive += 1
            if empty_pages_consecutive >= max_empty_pages:
                    print(f"\n  No links found for {max_empty_pages} consecutive pages. Stopping at page {page}.")
                    break
        else:
            if empty_pages_consecutive > 0:
                 print(f"\n  Found links after {empty_pages_consecutive} empty pages!")
            empty_pages_consecutive = 0
            new_count = 0
            for link in links_on_page:
                if link not in all_links:
                    all_links.add(link)
                    new_count += 1
            
            # Save incrementally
            if new_count > 0:
                links_list = sorted(list(all_links))
                with open(dataset['output_file'], 'w') as f:
                    json.dump(links_list, f, indent=2)
        
        # Safety break - limit bumped to 20k per user intel
        if page > 20000: 
            print("\n  Reached page 20000, stopping for safety.")
            break
            
        page += 1
        time.sleep(get_random_delay()) 

    print(f"\n✅ Finished {dataset['name']}. Total links: {len(all_links)}")

def main():
    for dataset in DATASETS:
        scrape_dataset(dataset)

if __name__ == "__main__":
    main()
