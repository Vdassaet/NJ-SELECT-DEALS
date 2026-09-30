const fs = require('fs');
let layout = fs.readFileSync('src/app/admin/layout.tsx', 'utf8');
layout = layout.replace(/import\s*\{\s*/, "import { FileText, Landmark, ");
fs.writeFileSync('src/app/admin/layout.tsx', layout);
