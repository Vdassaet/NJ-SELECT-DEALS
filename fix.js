const fs = require('fs');

let route = fs.readFileSync('src/app/api/webhooks/stripe/route.ts', 'utf8');
route = route.replace(/\|\| `refund_` \+ Date\.now\(\);/, "|| 'refund_' + Date.now();");
fs.writeFileSync('src/app/api/webhooks/stripe/route.ts', route);

let pricing = fs.readFileSync('src/lib/pricing-engine.ts', 'utf8');
pricing = pricing.replace(/`Minimum order of \$` \+/g, "'Minimum order of $' +");
pricing = pricing.replace(/\+ ` required\.`/g, "+ ' required.'");
pricing = pricing.replace(/`Coupon "` \+/g, "'Coupon \"' +");
pricing = pricing.replace(/\+ `" applied: -\$` \+/g, "+ '\" applied: -$' +");
pricing = pricing.replace(/`coupon_` \+/g, "'coupon_' +");
fs.writeFileSync('src/lib/pricing-engine.ts', pricing);

console.log("Fixed!");
