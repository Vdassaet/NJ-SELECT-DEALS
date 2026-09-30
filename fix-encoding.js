const fs = require('fs');

const fixEncoding = (filePath) => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath);
    // Node.js fs.readFileSync reads raw bytes. If it's UTF-16LE, it might have BOM or null bytes.
    // Let's decode it safely.
    let text = content.toString('utf8');
    if (text.includes('\u0000')) {
      text = content.toString('utf16le');
    }
    fs.writeFileSync(filePath, text, { encoding: 'utf8' });
  }
};

fixEncoding('src/app/admin/tax-reports/page.tsx');
fixEncoding('src/app/admin/tax-remittance/page.tsx');
fixEncoding('src/lib/pricing-engine.ts');
fixEncoding('src/lib/order-service.ts');
fixEncoding('src/app/api/webhooks/stripe/route.ts');
fixEncoding('prisma/schema.prisma');
fixEncoding('src/app/admin/layout.tsx');

console.log("Encoding fixed to UTF-8!");
