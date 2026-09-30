const fs = require('fs');
let layout = fs.readFileSync('src/app/admin/layout.tsx', 'utf8');
if (!layout.includes('Landmark')) {
    layout = layout.replace('import { \n  LayoutDashboard,', 'import { \n  FileText,\n  Landmark,\n  LayoutDashboard,');
    // fallback if previous failed
    layout = layout.replace('import { \r\n  LayoutDashboard,', 'import { \r\n  FileText,\r\n  Landmark,\r\n  LayoutDashboard,');
    fs.writeFileSync('src/app/admin/layout.tsx', layout);
}
