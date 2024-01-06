const ENDS_HERE = '#';

class Trie {
    constructor() {
        this._trie = {};
    }

    insert(word, data = null) {
        let trie = this._trie;
        for (const char of word) {
            if (!(char in trie)) {
                trie[char] = {};
            }
            trie = trie[char];
        }
        trie[ENDS_HERE] = data;
    }

    find(prefix) {
        let trie = this._trie;
        for (const char of prefix) {
            if (!(char in trie)) {
                return [];
            } else {
                trie = trie[char];
            }
        }
        return this._elements(trie, prefix);
    }

    _elements(d, prefix) {
        let result = [];
        for (const [c, v] of Object.entries(d)) {
            if (c === ENDS_HERE) {
                result.push([prefix, v]);
            } else {
                const subresult = this._elements(v, prefix + c);
                result.push(...subresult);
            }
        }
        return result;
    }

    autocomplete(prefix) {
        const suffixes = this.find(prefix);
        return suffixes.map(([w, d]) => [w, d]);
    }

    // save(filename) {
    //     fs.writeFileSync(filename, JSON.stringify(this._trie));
    // }

    // load(filename) {
    //     this._trie = JSON.parse(fs.readFileSync(filename, 'utf-8'));
    // }
}

export default Trie;