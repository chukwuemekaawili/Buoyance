import { Shield } from "lucide-react";
import { ReactNode } from "react";

interface PageHeroProps {
  title: string;
  description: string;
  badge?: string;
  children?: ReactNode;
}

export function PageHero({ title, description, badge, children }: PageHeroProps) {
  return (
    <section className="bg-primary py-16 md:py-24">
      <div className="container">
        <div className="max-w-3xl">
          {badge && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/20 text-secondary text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              <span>{badge}</span>
            </div>
          )}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
            {title}
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/70">
            {description}
          </p>
          {children}
        </div>
      </div>
    </section>
  );
}
