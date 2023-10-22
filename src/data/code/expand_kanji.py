import json
import os
from tqdm import tqdm, trange

# Function to read and parse JSON files
folder_path = "C:\Antoine\Coding\Web\Pages\portfolio\src\data"
def read_json(file_path):
    with open(os.path.join(folder_path, file_path), 'r', encoding='utf-8') as file:
        data = json.load(file)
    return data

# Read JLPT files
jlpt_files = ["jlpt5.json", "jlpt4.json", "jlpt3.json", "jlpt2.json", "jlpt1.json"]
jlpt_data = [read_json(file) for file in jlpt_files]

# Read kanji.json
kanji_data = read_json("kanji.json")
kanji_list = []

# Extract kanji from JLPT files and expand kanji.json
for kanji, kanji_info in tqdm(kanji_data.items()):
    # Extract kanji information
    strokes = kanji_info["strokes"]
    grade = kanji_info["grade"]
    freq = kanji_info["freq"]
    jlpt_new = kanji_info["jlpt_new"]
    meanings = kanji_info["meanings"]
    readings_on = kanji_info["readings_on"]
    readings_kun = kanji_info["readings_kun"]

    # Remove keys jlpt_old, wk_level, wk_meanings, wk_readings_on, wk_readings_kun, wk_radicals
    kanji_data[kanji].pop("jlpt_old", None)
    kanji_data[kanji].pop("wk_level", None)
    kanji_data[kanji].pop("wk_meanings", None)
    kanji_data[kanji].pop("wk_readings_on", None)
    kanji_data[kanji].pop("wk_readings_kun", None)
    kanji_data[kanji].pop("wk_radicals", None)

    # Add kanji key
    kanji_data[kanji]["kanji"] = kanji

    # Add words property to kanji.json
    if "words" not in kanji_data[kanji]:
        kanji_data[kanji]["words"] = []

    for jlpt in jlpt_data:
        for word in jlpt:
            if kanji in word["kanji"]:
                kanji_data[kanji]["words"].append({
                    "kanji": word["kanji"],
                    "kana": word["kana"],
                    "english": word["english"],
                    "jlpt": word["jlpt"]
                })

    # Add kanji to kanji_list
    kanji_list.append(kanji_data[kanji])

# Save the updated kanji.json
with open(os.path.join(folder_path,"kanji_updated.json"), 'w', encoding='utf-8') as kanji_file:
    json.dump(kanji_list, kanji_file, ensure_ascii=False, indent=4)