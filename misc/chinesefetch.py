import time
import requests
from bs4 import BeautifulSoup
import random
import atexit, signal, sys, json

def get_hanzicraft_meaning(char):
    url = f"https://hanzicraft.com/character/{char}"
    resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    header = soup.find("div", {"class": "meaning"})

    if not header:
        return None
    meanings = []
    for li in header.find_all("li"):
        text = li.get_text(strip=True)
        meanings.append(text)
    return meanings

def fetch_many(chars, results, delay_min=0.15, delay_max=0.35):
    for ch in chars:
        try:
            meanings = get_hanzicraft_meaning(ch)
            results[ch] = meanings
        except Exception as e:
            results[ch] = None
        print(f"Fetched {ch} [{len(results)} / {len(chars)}]")
        delay = random.uniform(delay_min, delay_max)
        time.sleep(delay)

import json


def save_data(filename="C:\\Antoine\\Coding\\Web\\Pages\\portfolio\\src\\data\\hanzicraft_meanings.json"):
    try:
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"✅ Data saved to {filename}")
    except Exception as e:
        print(f"❌ Failed saving data: {e}")

def shutdown(signum=None, frame=None):
    print(f"Signal {signum} received, saving data before exit...")
    save_data()
    sys.exit(0)

results = {}
with open('C:\\Antoine\\Coding\\Web\\Pages\\portfolio\\src\\data\\hanzicraft_meanings.json', 'r', encoding='utf-8') as f:
    try:
        results = json.load(f)
    except json.JSONDecodeError:
        print("⚠️ Failed to load existing data, starting fresh.")

def main():

    # Register exit handlers
    atexit.register(save_data)
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:# Load characters from a JSON file
        with open('C:\\Antoine\\Coding\\Web\\Pages\\portfolio\\src\\data\\freq_mandarin.json', 'r', encoding='utf-8') as f:
            chars = json.load(f)[2000:6000]
            fetch_many(chars, results)
    except Exception as e:
        print(f"Exception: {e}")
    finally:
        # extra safety: ensure data saved
        save_data()

if __name__ == "__main__":
    main()