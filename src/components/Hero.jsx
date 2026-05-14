export default function Hero({ onStart, totalChapters, totalSlides }) {
  return (
    <section className="hero">
      <p className="hero__bismillah">بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
      <div className="hero__eyebrow">Seerah Dars</div>
      <h1 className="hero__title">Das Leben des Propheten <span style={{whiteSpace:"nowrap"}}>Muhammad ﷺ</span></h1>
      <p className="hero__subtitle">
        Ein moderner, durchklickbarer Dars in {totalChapters} Kapiteln und {totalSlides} Folien –
        von der Welt vor dem Islam bis zum Isra & Mi‘raj.
      </p>
      <button className="hero__cta" onClick={onStart}>
        Dars beginnen
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </button>
    </section>
  );
}
