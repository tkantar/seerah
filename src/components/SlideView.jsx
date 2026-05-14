export default function SlideView({ slide, chapter, chapterIndex }) {
  return (
    <article className="reader">
      <div className="eyebrow">
        Kapitel {String(chapterIndex + 1).padStart(2, "0")} · {chapter.title}
      </div>
      <h1 className="slide-title">{slide.title}</h1>

      <div className="slide-body">
        {slide.body.map((p, i) => (
          <p key={i} className={p.isArabic ? "arabic" : undefined}>
            {p.text}
          </p>
        ))}
      </div>

      {slide.images.length > 0 && (
        <div className="slide-images">
          {slide.images.map((src) => (
            <img key={src} src={`/${src}`} alt="" loading="lazy" />
          ))}
        </div>
      )}
    </article>
  );
}
