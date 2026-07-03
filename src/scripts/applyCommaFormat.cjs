const fs = require('fs');
const path = require('path');

const formatHuNum = `
/**
 * Safely formats numbers and numeric strings by replacing the decimal dot with a comma.
 * If the value is empty, null, undefined, or NaN, it returns the value as is.
 */
export const formatHuNum = (value) => {
  if (value === null || value === undefined || value === "") return "";
  
  if (typeof value === "number") {
    if (isNaN(value)) return "";
    return value.toString().replace(".", ",");
  }

  if (typeof value === "string") {
    // Only format if it's a valid number format (allow optional trailing %)
    const trimmed = value.trim();
    if (/^-?\\d+(\\.\\d+)?%?$/.test(trimmed)) {
      return value.replace(".", ",");
    }
  }

  return value;
};
`;

fs.writeFileSync('src/utils/formatters.js', formatHuNum);

// Process JSX files
const processDir = (dir) => {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Wrap known mathematical function calls and variables inside TableCell
      // We look for patterns like <TableCell ...>{calculateSomething(...)}</TableCell>
      
      const regex = /(<TableCell[^>]*>\s*\{)([^{}<]+)(\}\s*<\/TableCell>)/g;
      content = content.replace(regex, (match, prefix, expr, suffix) => {
        // Exclude things that are definitely not decimals or already formatted
        const e = expr.trim();
        if (e === 'cls' || e === 'shortYear' || e === 'year' || e.startsWith('formatHuNum') || e.includes('|| ""')) {
          return match;
        }
        
        // Wrap with formatHuNum
        modified = true;
        return `${prefix}formatHuNum(${e})${suffix}`;
      });

      // Also try to find <Typography> tags inside cells that might hold totals
      const regexTypo = /(<Typography[^>]*>\s*\{)([^{}<]+)(\}\s*<\/Typography>)/g;
      content = content.replace(regexTypo, (match, prefix, expr, suffix) => {
        const e = expr.trim();
        if (e === 'cls' || e === 'shortYear' || e === 'year' || e.startsWith('formatHuNum') || e.includes('|| ""') || e.includes('|| "0"')) {
          return match;
        }
        if (e.includes('calculate') || e.includes('Total') || e.includes('arany')) {
          modified = true;
          return `${prefix}formatHuNum(${e})${suffix}`;
        }
        return match;
      });

      if (modified || content.includes('formatHuNum(')) {
        // Add import if not exists
        if (!content.includes('import { formatHuNum }')) {
          const depth = fullPath.split(path.sep).length - 2;
          let relPath = '../'.repeat(depth) + 'utils/formatters';
          
          const importStatement = `import { formatHuNum } from "${relPath.replace(/\\/g, '/')}";\n`;
          content = importStatement + content;
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log('Added import to:', fullPath);
        } else if (modified) {
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log('Formatted:', fullPath);
        }
      }
    }
  });
};

processDir('src/pages/indicators');
console.log('Done!');
