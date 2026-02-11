import { ReactNode } from "react";

interface ContentSectionProps {
  children: ReactNode;
  className?: string;
  sidebar?: ReactNode;
}

export function ContentSection({ children, className = "", sidebar }: ContentSectionProps) {
  if (sidebar) {
    return (
      <section className={`py-12 md:py-16 ${className}`}>
        <div className="container">
          <div className="grid lg:grid-cols-4 gap-8 lg:gap-12">
            <aside className="lg:col-span-1 order-2 lg:order-1">
              {sidebar}
            </aside>
            <div className="lg:col-span-3 order-1 lg:order-2">
              {children}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`py-12 md:py-16 ${className}`}>
      <div className="container">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </div>
    </section>
  );
}
