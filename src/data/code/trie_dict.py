import json

ENDS_HERE = '#'

class Trie:
    def __init__(self):
        self._trie = {}

    def __repr__(self):
        return repr(self._trie)

    def __str__(self):
        return str(self._trie)

    def __len__(self):
        return len(self._trie)

    def insert(self, word, data=None):
        trie = self._trie
        for char in word:
            if char not in trie:
                trie[char] = {}
            trie = trie[char]
        trie[ENDS_HERE] = data

    def find(self, prefix):
        trie = self._trie
        for char in prefix:
            if char not in trie:
                return []
            else:
                trie = trie[char]
        return self._elements(trie, prefix)

    def _elements(self, d, prefix):
        result = []
        for c, v in d.items():
            if c == ENDS_HERE:
                result.append((prefix, v))
            else:
                subresult = self._elements(v, prefix + c)
                result.extend(subresult)
        return result

    def autocomplete(self, prefix):
        suffixes = self.find(prefix)
        return [(w, d) for w, d in suffixes]

    def save(self, filename):
        with open(filename, 'w') as f:
            json.dump(self._trie, f)

    def load(self, filename):
        with open(filename, 'r') as f:
            self._trie = json.load(f)

from tqdm import tqdm
def create_dictionary():
    trie = Trie()

    for i in [5, 4, 3, 2, 1]:
        with open(f'C:\Antoine\Coding\Web\Pages\portfolio\src\data\jlpt{i}.json', 'r') as f:
            data = json.load(f)
            for j, word in tqdm(enumerate(data)):
                trie.insert(word['kanji'], { 'idx': j, 'level': i })
                trie.insert(word['kana'], { 'idx': j, 'level': i })

    trie.save('C:\Antoine\Coding\Web\Pages\portfolio\src\data\dictionary.json')

if __name__ == '__main__':
    # create_dictionary()

    trie = Trie()
    trie.load('C:\Antoine\Coding\Web\Pages\portfolio\src\data\dictionary.json')

    print(trie.autocomplete('にほんご'))

    # trie = Trie()
    # trie.insert('hello', { 'idx': 0, 'level': 5 })
    # trie.insert('helloworld', { 'idx': 1, 'level': 5 })
    # trie.insert('hell', { 'idx': 2, 'level': 5 })
    # trie.insert('hi')

    # # Print the trie with tabs
    # print(json.dumps(trie._trie, indent=4))

    # print(trie.find('hell'))
    # print(trie.find('hello'))
    # print(trie.find('hi'))
    # print(trie.find('hel'))

    # print(trie.autocomplete('hell'))
    # print(trie.autocomplete('hel'))
    # print(trie.autocomplete('he'))