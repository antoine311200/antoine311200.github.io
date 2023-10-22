# def hiragana_to_katakana(hiragana_text):
#     katakana_text = ""
#     for char in hiragana_text:
#         # Check if the character is in the range of hiragana characters
#         if 'ぁ' <= char <= 'ん':
#             # Convert hiragana to katakana by adding the difference in Unicode code points
#             katakana_char = chr(ord(char) + (ord('ァ') - ord('ぁ')))
#         else:
#             # Keep non-hiragana characters unchanged
#             katakana_char = char
#         katakana_text += katakana_char
#     return katakana_text

import json
import os
from tqdm import tqdm

hira_start = int("3041", 16)
hira_end = int("3096", 16)
kata_start = int("30a1", 16)

kana = dict()
for i in range(hira_start, hira_end+1):
    kana[chr(i)] = chr(i-hira_start+kata_start)

def hiragana2katakana(text):
    return "".join([kana.get(char, char) for char in text])

folder_path = "C:\Antoine\Coding\Web\Pages\portfolio\src\data"
def read_json(file_path):
    with open(os.path.join(folder_path, file_path), 'r', encoding='utf-8') as file:
        data = json.load(file)
    return data

kanjis = read_json("kanji_updated.json")

for kanji in tqdm(kanjis):
    kanji["readings_on"] = [hiragana2katakana(reading) for reading in kanji["readings_on"]]

with open(os.path.join(folder_path,"kanji_updated_2.json"), 'w', encoding='utf-8') as kanji_file:
    json.dump(kanjis, kanji_file, ensure_ascii=False, indent=4)