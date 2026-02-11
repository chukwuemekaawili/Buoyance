interface SimplePageHeroProps {
  title: string;
  description: string;
}

export function SimplePageHero({ title, description }: SimplePageHeroProps) {
  return (
    <section className="bg-primary py-12 md:py-16">
      <div className="container">
        <div className="max-w-3xl">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary-foreground mb-3">
            {title}
          </h1>
          <p className="text-base md:text-lg text-primary-foreground/70">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}
