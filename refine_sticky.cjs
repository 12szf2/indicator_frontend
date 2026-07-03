const fs = require('fs');
const path = require('path');

const walkSync = function (dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function (file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    } else {
      if (file.endsWith('.jsx')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const files = walkSync('/Users/fekeandras/indicator/indicator_frontend/src/pages/indicators');

let updatedFiles = 0;

const oldRegex = /position:\s*['"]sticky['"],\s*top:\s*2,\s*(?:p:\s*2,\s*)?zIndex:\s*10,\s*backgroundColor:\s*['"]white['"],\s*py:\s*1,?[ \t]*/g;
const newStr = 'position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", ';

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  if (oldRegex.test(content)) {
    content = content.replace(oldRegex, newStr);

    fs.writeFileSync(file, content);
    console.log('Updated: ' + file);
    updatedFiles++;
  }
});
console.log('Total files updated: ' + updatedFiles);
