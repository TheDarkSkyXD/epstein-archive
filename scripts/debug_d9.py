
import requests

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Cookie": "QueueITAccepted-SDFrts345E-V3_usdojsearch=EventId%3Dusdojsearch%26RedirectType%3Dsafetynet%26IssueTime%3D1770081097%26Hash%3D0b2dfccfa093f4c3fcb0ed84d44d23c2b52026247975138d1f64ad734c38357a; justiceGovAgeVerified=true"
}

url = "https://www.justice.gov/epstein/doj-disclosures/data-set-9-files?page=1"
response = requests.get(url, headers=HEADERS)
print(f"Status: {response.status_code}")
print(f"Content Length: {len(response.text)}")
if "EFTA" in response.text:
    print("Found EFTA links!")
else:
    print("NO EFTA links found.")
    # Print snippet of body to see if it's the age verification page
    if "Verify" in response.text or "Age" in response.text:
        print("Age verification or Queue-IT detected in body.")
    print(response.text[:1000])
