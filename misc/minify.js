// Create a JSON minification script

const fs = require('fs');
const path = require('path');

const inputFilePath = path.join(__dirname, '../src/data', 'chinese_processed.json');
const outputFilePath = path.join(__dirname, '../src/data', 'chinese_processed.min.json');
const minifyJSON = (inputPath, outputPath) => {
    fs.readFile(inputPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading input file:', err);
            return;
        }
        try {
            const json = JSON.parse(data);
            const minified = JSON.stringify(json);
            fs.writeFile(outputPath, minified, (err) => {
                if (err) {
                    console.error('Error writing output file:', err);
                } else {
                    console.log('Minification complete:', outputPath);
                }
            });
        } catch (err) {
            console.error('Error parsing JSON:', err);
        }
    });
};

console.log(`Minifying JSON from ${inputFilePath} to ${outputFilePath}`);
minifyJSON(inputFilePath, outputFilePath);