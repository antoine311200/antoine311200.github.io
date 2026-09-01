import json
import random


class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False
        self.words = []  # store all full words in subtree for quick retrieval


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str, info=None):
        node = self.root
        node.words.append(word)
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
            node.words.append(word)
        node.is_end = True

    def get_k(self, prefix: str, k: int, random_order=False):
        node = self.root
        for ch in prefix:
            node = node.children.get(ch)
            if not node:
                return []
        candidates = node.words
        if random_order:
            return random.sample(candidates, min(k, len(candidates)))
        else:
            return candidates[:k]

    def to_dict(self, node=None):
        if node is None: node = self.root
        dct = {
            "c": {ch: self.to_dict(child) for ch, child in node.children.items()},
            "w": node.words
        }
        # Remove c if it's empty
        if not dct["c"]:
            dct.pop("c")
        if node.is_end:
            dct["e"] = True
        return dct

# Example usage:
# raw = {
#     "三体综合症": {
#         "p": "èr shí yī sān tǐ zōng hé zhèng",
#         "d": ["trisomy", "Downs syndrome"],
#         "t": "21三體綜合症",
#     },
#     "三合症": {
#         "p": "sān C",
#         "d": [
#             "abbr. for computers, communications, and consumer electronics",
#             "China Compulsory Certificate (CCC)",
#         ],
#         "t": "",
#     },
#     "制": {"p": "A A zhì", "d": ["to split the bill", "to go Dutch"], "t": ""},
#     "制合": {"p": "A A zhì", "d": ["to split the bill", "to go Dutch"], "t": ""},
#     "制合合": {"p": "A A zhì", "d": ["to split the bill", "to go Dutch"], "t": ""},
#     "制合合合": {"p": "A A zhì", "d": ["to split the bill", "to go Dutch"], "t": ""},
#     "制合合合合": {"p": "A A zhì", "d": ["to split the bill", "to go Dutch"], "t": ""},
#     "制合合合合合": {"p": "A A zhì", "d": ["to split the bill", "to go Dutch"], "t": ""},
#     "制合合合合合合": {"p": "A A zhì", "d": ["to split the bill", "to go Dutch"], "t": ""},
# }

# Load raw data from a JSON file
with open('C:\Antoine\Coding\Web\Pages\portfolio\src\data\chinese_processed.min.json', 'r', encoding='utf-8') as f:
    raw = json.load(f)

with open('C:\Antoine\Coding\Web\Pages\portfolio\src\data\\freq_mandarin.json', 'r', encoding='utf-8') as f:
    chars = json.load(f)[:6000]

# Build the trie:
trie = Trie()
for word, info in raw.items():
    if len(word) < 5 and all(c in chars for c in word):
        trie.insert(word)#, info)
# print(f"Inserted: {word}")
print(f"Trie size: {len(trie.root.words)} words")

# print(trie.root.words)
trie.root.words = []
# # Fetch completions:
# print(trie.get_k("制", 3))  # e.g. ['21三体综合症']
# print(trie.get_k("制", 3, random_order=True))  # potentially ['3C']

# print(trie.to_dict())  # Print the trie structure as a dictionary
# Save the trie to a file beautified
def save_trie_to_file(trie, filename):
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(trie.to_dict(), f, ensure_ascii=False)#, indent=2)

save_trie_to_file(trie, 'trie_chinese.json')