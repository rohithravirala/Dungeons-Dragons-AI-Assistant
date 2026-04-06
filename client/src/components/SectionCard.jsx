export default function SectionCard({ title, subtitle, children }) {
  return (
    <section className="section-card">
      <header className="section-card__header">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </header>
      {children}
    </section>
  );
}
