const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'data/top-chinese-novels.json');
const data = fs.readFileSync(filePath, 'utf-8');

// Replace Chinese quotation marks with regular quotes
const fixed = data
  .replace(/"/g, '"')
  .replace(/"/g, '"')
  .replace(/'/g, "'")
  .replace(/'/g, "'");

fs.writeFileSync(filePath, fixed);
console.log('✓ Fixed Chinese quotation marks');
