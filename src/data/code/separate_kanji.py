import json

# Read in the kanji data and create a list of kanji for each jlpt_new level
with open('data/kanji_updated_2.json', 'r', encoding='utf-8') as f:
    kanjis = json.load(f)

jlpt_new = {}
levels = [0, 1, 2, 3, 4, 5]
for level in levels:
    jlpt_new[level] = []

for content in kanjis:
    if 'jlpt_new' in content:
        if content['jlpt_new'] in levels:
            jlpt_new[content['jlpt_new']].append(content)
        else:
            jlpt_new[0].append(content)

# Write the kanji data to separate files for each jlpt_new level
for level in levels:
    with open(f'data/kanji_{level}.json', 'w', encoding='utf-8') as f:
        json.dump(jlpt_new[level], f, indent=4, ensure_ascii=False)