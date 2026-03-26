const fs = require('fs');
const file = 'c:/Users/defaultuser0/Desktop/buoyance/buoyance-main/src/components/Header.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace colors
content = content.replace(/bg-white\/95/g, 'bg-background/95');
content = content.replace(/bg-white/g, 'bg-background');
content = content.replace(/text-slate-900/g, 'text-foreground');
content = content.replace(/text-slate-800/g, 'text-foreground');
content = content.replace(/text-slate-600/g, 'text-muted-foreground');
content = content.replace(/text-slate-500/g, 'text-muted-foreground');
content = content.replace(/bg-slate-50/g, 'bg-muted');
content = content.replace(/bg-slate-100/g, 'bg-muted');
content = content.replace(/bg-slate-200/g, 'bg-muted');
content = content.replace(/border-slate-200/g, 'border-border');
content = content.replace(/border-slate-300/g, 'border-border');

// Replace raw hex button usage
content = content.replace(
  /className="bg-\[\#CCFF00\] hover:bg-\[\#b3e600\] text-black font-medium text-sm"/g,
  'variant="accent" className="font-medium text-sm"'
);
content = content.replace(
  /className="bg-\[\#CCFF00\] hover:bg-\[\#b3e600\] text-black font-medium"/g,
  'variant="accent" className="font-medium"'
);
content = content.replace(
  /className="hidden sm:flex bg-\[\#CCFF00\] hover:bg-\[\#b3e600\] text-black font-medium text-sm"/g,
  'variant="accent" className="hidden sm:flex font-medium text-sm"'
);

// Any duplicates from variant="accent" addition 
content = content.replace(
  /<Button size="sm" asChild variant="accent"(.*?)>/g,
  '<Button size="sm" variant="accent" asChild$1>'
);

fs.writeFileSync(file, content);
console.log('Done');
