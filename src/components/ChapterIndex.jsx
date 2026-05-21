export default function ChapterIndex({ chapters, onSelect }) {
  return (
    <section className="toc">
      <h2 className="toc__heading">Inhaltsverzeichnis</h2>
      <div className="toc__grid">
        {chapters.map((c, i) => (
          <button
            key={c.slug}
            className="toc__card"
            onClick={() => onSelect(c.slug)}
          >
            <span className="toc__num">Kapitel {String(i + 1).padStart(2, "0")}</span>
            <h3 className="toc__title">{c.title}</h3>
            <span className="toc__meta">
              {c.pageCount} {c.pageCount === 1 ? "Seite" : "Seiten"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
