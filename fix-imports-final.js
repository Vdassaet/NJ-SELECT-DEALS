const fs = require('fs');
let layout = fs.readFileSync('src/app/admin/layout.tsx', 'utf8');
layout = layout.replace("import { FileText, Landmark, usePathname", "import { usePathname");
layout = layout.replace("from 'lucide-react';", "FileText, Landmark } from 'lucide-react';");
fs.writeFileSync('src/app/admin/layout.tsx', layout);
