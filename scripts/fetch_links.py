
import requests
import json
import time
from bs4 import BeautifulSoup

# Captured headers with verified cookies
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Cookie": "QueueITAccepted-SDFrts345E-V3_usdojsearch=EventId%3Dusdojsearch%26RedirectType%3Dsafetynet%26IssueTime%3D1769871744%26Hash%3D554cdd87e35c1e0bbe3d52e0772431502c6cc1cdd6aba364b5e546cc19270bd1; nmstat=4a5e72c3-3f06-4dc0-3655-65b562cb48b9; _ga=GA1.1.498949710.1769871746; justiceGovAgeVerified=true; _ga_CSLL4ZEK4L=GS2.1.s1769871746$o1$g1$t1769871904$j60$l0$h0"
}

def fetch_links(base_url, filter_str):
    all_links = []
    page = 0
    session = requests.Session()
    session.headers.update(HEADERS)
    
    print(f"Scraping {base_url}...")
    
    while True:
        url = f"{base_url}?page={page}"
        print(f"  Fetching page {page}...")
        try:
            r = session.get(url, timeout=10)
            if r.status_code != 200:
                print(f"    Failed with status {r.status_code}")
                break
                
            soup = BeautifulSoup(r.text, 'html.parser')
            links = []
            for a in soup.find_all('a', href=True):
                href = a['href']
                if filter_str in href and (href.endswith('.pdf') or href.endswith('.mp4') or href.endswith('.mov')):
                     links.append(href)
                     
            if not links:
                print("    No matching links found on this page. Stopping.")
                # Double check if it's just an empty page or end of list
                if page > 0: 
                    break
            
            # Avoid dupes immediately in this chunk? No, just add all
            all_links.extend(links)
            page += 1
            time.sleep(0.5) # Be nice
            
            if page > 100: # Safety check
                break
                
        except Exception as e:
            print(f"    Error: {e}")
            break
            
    return sorted(list(set(all_links)))

def main():
    # Data Set 10
    ds10_links = fetch_links("https://www.justice.gov/epstein/doj-disclosures/data-set-10-files", "/dataset-10/")
    # Note: filter string might need adjustment based on actual URLs. 
    # Subagent saw: /epstein/files/DataSet%2010/
    # Let's try more generic filter if specific fails, or rely on extensions?
    # Actually, browsing the site manually or recalling subagent logs:
    # They usually contain "DataSet" or just be the only PDFs on the page.
    # Let's refine the filter:
    
    # Re-running logic with broader filters but strict extensions
    
    print("--- Starting Scraping ---")
    
    # DS 10
    ds10 = fetch_links("https://www.justice.gov/epstein/doj-disclosures/data-set-10-files", "/epstein/files/")
    print(f"Found {len(ds10)} links for Data Set 10")
    with open("full_links_10.json", "w") as f:
        json.dump(ds10, f, indent=2)
        
    # DS 11
    ds11 = fetch_links("https://www.justice.gov/epstein/doj-disclosures/data-set-11-files", "/epstein/files/")
    # Also BOP videos?
    # BOP videos are on /bop-video-footage, but subagent found them linked from DS11 page? 
    # Or requested separately?
    # User asked for "rest of files in set 10 & 11". Set 11 includes "video files".
    # I will also check the BOP page just in case.
    bop = fetch_links("https://www.justice.gov/epstein/doj-disclosures/bop-video-footage", "/multimedia/")
    
    ds11_total = sorted(list(set(ds11 + bop)))
    print(f"Found {len(ds11_total)} links for Data Set 11 (including BOP)")
    with open("full_links_11.json", "w") as f:
        json.dump(ds11_total, f, indent=2)

if __name__ == "__main__":
    main()
