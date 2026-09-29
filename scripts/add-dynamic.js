const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (file === 'route.ts') {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('force-dynamic')) {
        fs.writeFileSync(fullPath, "export const dynamic = 'force-dynamic';\n" + content);
      }
    }
  }
}

processDir(path.join(process.cwd(), 'src/app/api'));
