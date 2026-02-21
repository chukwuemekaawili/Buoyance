import { Shield, Lock, MapPin } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

// Import logo asset - using dark variant (white text) for dark footer background
import logoDark from "@/assets/buoyance_logo_dark.png";

const footerLinks = {
  product: [
    { label: "Features", href: "/#features", isAnchor: true },
    { label: "All Calculators", href: "/calculators" },
    { label: "PIT Calculator", href: "/calculators/pit" },
    { label: "VAT Calculator", href: "/calculators/vat" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/#contact", isAnchor: true },
  ],
  resources: [
    { label: "Academy", href: "/academy" },
    { label: "Tax Library", href: "/academy/library" },
    { label: "Tax Guide", href: "/docs" },
    { label: "Support Hub", href: "/support" },
  ],
  legal: [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "Compliance", href: "/compliance" },
  ],
};

export function Footer() {
  const navigate = useNavigate();

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderLink = (link: { label: string; href: string; isAnchor?: boolean }) => {
    if (link.isAnchor) {
      return (
        <a
          href={link.href}
          className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
        >
          {link.label}
        </a>
      );
    }
    return (
      <Link
        to={link.href}
        className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
      >
        {link.label}
      </Link>
    );
  };

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-12">
          <div className="lg:col-span-2">
            <Link
              to="/"
              onClick={handleLogoClick}
              className="inline-block mb-4"
            >
              <img
                src={logoDark}
                alt="BUOYANCE"
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="text-primary-foreground/70 text-sm mb-6 max-w-xs">
              Nigeria's most trusted platform for tax compliance and financial
              intelligence. Accurate, compliant, stress-free.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-primary-foreground/60">
                <Lock className="h-3.5 w-3.5" />
                <span>AES-256</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-primary-foreground/60">
                <MapPin className="h-3.5 w-3.5" />
                <span>Nigerian Data</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-primary-foreground/60">
                <Shield className="h-3.5 w-3.5" />
                <span>NRS Compliant</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-primary-foreground/10">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-primary-foreground/60">
              © {new Date().getFullYear()} Buoyance. All rights reserved.
            </p>
            <p className="text-xs text-primary-foreground/50 text-center md:text-right max-w-xl">
              All tax estimations are provided for informational purposes only
              and do not constitute legal or tax advice. Consult a qualified
              tax professional for specific guidance.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
