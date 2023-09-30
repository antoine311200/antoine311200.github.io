import re
import json

def create_dictionary_list(file_path):
    dictionary_list = []

    with open(file_path, 'r', encoding='utf-8') as file:
        lines = file.readlines()

        for line in lines:
            elements = re.split(r'\t+', line.strip())

            japanese_sentence = elements[0]
            english_sentence = elements[1]
            furigana = elements[2]
            level = elements[3]

            dictionary = {
                'japanese': japanese_sentence,
                'english': english_sentence,
                'furigana': furigana,
                'level': level
            }

            dictionary_list.append(dictionary)

    return dictionary_list

# Replace 'your_file.txt' with the actual file path
file_path = 'deck.txt'
result = create_dictionary_list(file_path)

# Save the result to a file
with open('deck.json', 'w', encoding='utf-8') as file:
    json.dump(result, file, ensure_ascii=False, indent=4)