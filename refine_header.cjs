const fs = require('fs');
const file = 'c:/Users/defaultuser0/Desktop/buoyance/buoyance-main/src/components/Header.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add scroll state
if (!content.includes('const [isScrolled')) {
  content = content.replace(
    '  const [isMenuOpen, setIsMenuOpen] = useState(false);',
    '  const [isMenuOpen, setIsMenuOpen] = useState(false);\n  const [isScrolled, setIsScrolled] = useState(false);\n\n  useEffect(() => {\n    const handleScroll = () => {\n      setIsScrolled(window.scrollY > 10);\n    };\n    window.addEventListener(\'scroll\', handleScroll, { passive: true });\n    return () => window.removeEventListener(\'scroll\', handleScroll);\n  }, []);'
  );
}

// Replace header class
content = content.replace(
  'className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-md border-b border-primary-foreground/10 transition-colors duration-300"',
  'className={cn(\n          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-md",\n          isScrolled \n            ? "bg-white/95 border-b border-slate-200 shadow-sm text-slate-900" \n            : "bg-transparent border-transparent text-slate-800"\n        )}'
);

// Active/Inactive styles
content = content.replace(
  'const activeLinkClass = "text-primary-foreground bg-primary-foreground/15";',
  'const activeLinkClass = "text-primary bg-primary/10 font-medium";'
);
content = content.replace(
  'const inactiveLinkClass = "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10";',
  'const inactiveLinkClass = "text-slate-600 hover:text-primary hover:bg-slate-100";'
);

// Buttons
content = content.replace(
  /<Button variant="outline-light"(.*?)(>[\s\S]*?)<\/Button>/g,
  '<Button variant="ghost"$1 className="text-slate-600 hover:text-primary font-medium"$2</Button>'
);
content = content.replace(
  /<Button variant="accent"(.*?)>(\s*<Link to="\/signup">Get Started<\/Link>\s*)<\/Button>/g,
  '<Button$1 className="bg-[#CCFF00] hover:bg-[#b3e600] text-black font-medium">$2</Button>'
);
content = content.replace(
  /<Button variant="accent"(.*?)>(\s*<Link to="\/filings\/new">\s*<Plus.*?>\s*New Filing\s*<\/Link>\s*)<\/Button>/g,
  '<Button$1 className="bg-[#CCFF00] hover:bg-[#b3e600] text-black font-medium text-sm">$2</Button>'
);
content = content.replace(
  /<Button variant="accent"(.*?)>(\s*<Link to="\/filings\/new">\s*<Plus.*?>\s*New Filing\s*<\/Link>\s*)<\/Button>/g,
  '<Button$1 className="bg-[#CCFF00] hover:bg-[#b3e600] text-black font-medium text-sm">$2</Button>'
);

// Massive color replacer
content = content.replace(/bg-primary-foreground\/10/g, 'bg-slate-100');
content = content.replace(/bg-primary-foreground\/5/g, 'bg-slate-50');
content = content.replace(/text-primary-foreground\/60/g, 'text-slate-500');
content = content.replace(/text-primary-foreground\/80/g, 'text-slate-600');
content = content.replace(/border-primary-foreground\/10/g, 'border-slate-200');
content = content.replace(/text-primary-foreground/g, 'text-slate-800');
content = content.replace(/bg-primary\/95/g, 'bg-white');
content = content.replace(/bg-primary\/40/g, 'bg-slate-100');
content = content.replace(/bg-primary(?!-)/g, 'bg-white');
content = content.replace(/bg-primary-foreground\/20/g, 'bg-slate-200');

fs.writeFileSync(file, content);
console.log('Done');
