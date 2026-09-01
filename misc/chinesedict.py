import json
import tqdm

def load_chinese_dict(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            chinese_dict = json.load(file)
        return chinese_dict
    except FileNotFoundError:
        print(f"Error: The file {file_path} does not exist.")
        return {}
    except json.JSONDecodeError:
        print(f"Error: The file {file_path} is not a valid JSON file.")
        return {}

def process_chinese_dict(chinese_dict):
    processed_data = {}
    print(f"Processing {len(chinese_dict)} entries from the Chinese dictionary")
    for entry in tqdm.tqdm(chinese_dict, desc="Processing Chinese Dictionary", unit="entry"):
        if 'simplified' not in entry:
            print(f"Warning: Entry missing 'simplified' key: {entry}")
            continue
        processed_data[entry['simplified']] = {
            'p': entry.get('pinyinRead', ''),
            'd': entry.get('definition', ''),
            't': entry.get('traditional', '') if entry.get('traditional') != entry.get('simplified') else '',
        }
    return processed_data

if __name__ == "__main__":
    file_path = 'C:\\Antoine\\Coding\\Web\\Pages\\portfolio\\src\\data\\chinese.json'  # Update with the actual path to your JSON file
    chinese_dict = load_chinese_dict(file_path)

    if chinese_dict:
        processed_data = process_chinese_dict(chinese_dict)
        with open('C:\\Antoine\\Coding\\Web\\Pages\\portfolio\\src\\data\\chinese_processed.json', 'w', encoding='utf-8') as f:
            f.write(json.dumps(processed_data, ensure_ascii=False, indent=2))

    else:
        print("No data to process.")