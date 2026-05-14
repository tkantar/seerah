import { useCallback, useEffect, useMemo, useState } from "react";
import data from "./data/slides.json";
import Sidebar from "./components/Sidebar.jsx";
import SlideView from "./components/SlideView.jsx";
import Hero from "./components/Hero.jsx";
import ChapterIndex from "./components/ChapterIndex.jsx";
import "./App.css";

const { chapters, slides } = data;
const slideByIndex = new Map(slides.map((s) => [s.index, s]));

function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, "");
  if (!h) return { route: "home" };
  const [first, second] = h.split("/");
  if (first === "slide" && second) {
    const n = parseInt(second, 10);
    if (slideByIndex.has(n)) return { route: "slide", slideIndex: n };
  }
  if (first === "chapter" && second) {
    const c = chapters.find((x) => x.slug === second);
    if (c) return { route: "slide", slideIndex: c.startSlide };
  }
  return { route: "home" };
}

function getInitialTheme() {
  const stored = localStorage.getItem("seerah-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [view, setView] = useState(parseHash);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("seerah-theme", theme);
  }, [theme]);

  // Sync with URL hash
  useEffect(() => {
    const onHashChange = () => setView(parseHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const goToSlide = useCallback((slideIndex) => {
    window.location.hash = `#/slide/${slideIndex}`;
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const goHome = useCallback(() => {
    window.location.hash = "";
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const goToChapter = useCallback(
    (slug) => {
      const c = chapters.find((x) => x.slug === slug);
      if (c) goToSlide(c.startSlide);
    },
    [goToSlide]
  );

  const currentSlide = view.route === "slide" ? slideByIndex.get(view.slideIndex) : null;
  const currentChapter = useMemo(() => {
    if (!currentSlide) return null;
    return chapters.find((c) => c.slug === currentSlide.chapter);
  }, [currentSlide]);
  const currentChapterIndex = useMemo(() => {
    if (!currentChapter) return -1;
    return chapters.findIndex((c) => c.slug === currentChapter.slug);
  }, [currentChapter]);

  const prevSlide = currentSlide && currentSlide.index > 1 ? slideByIndex.get(currentSlide.index - 1) : null;
  const nextSlide = currentSlide && currentSlide.index < slides[slides.length - 1].index
    ? slideByIndex.get(currentSlide.index + 1)
    : null;

  // Keyboard navigation
  useEffect(() => {
    if (view.route !== "slide") return;
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        if (nextSlide) goToSlide(nextSlide.index);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        if (prevSlide) goToSlide(prevSlide.index);
      } else if (e.key === "Escape") {
        goHome();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, prevSlide, nextSlide, goToSlide, goHome]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const activeChapterSlug = currentChapter?.slug;

  return (
    <div className="app">
      {sidebarOpen && <div className="backdrop" onClick={() => setSidebarOpen(false)} />}
      <Sidebar
        chapters={chapters}
        activeChapterSlug={activeChapterSlug}
        onSelectChapter={goToChapter}
        onSelectHome={goHome}
        open={sidebarOpen}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="app__main">
        <div className="topbar">
          <button
            className="topbar__menu"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Menü"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>

          <div className="topbar__crumbs">
            <button
              onClick={goHome}
              style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: "inherit", fontFamily: "inherit" }}
            >
              Seerah Dars
            </button>
            {currentChapter && (
              <>
                <span className="sep">/</span>
                <strong>{currentChapter.title}</strong>
              </>
            )}
          </div>

          {currentSlide && (
            <div className="topbar__progress">
              Folie {currentSlide.index} / {slides.length}
            </div>
          )}
        </div>

        {view.route === "home" ? (
          <>
            <Hero
              onStart={() => goToSlide(1)}
              totalChapters={chapters.length}
              totalSlides={slides.length}
            />
            <ChapterIndex chapters={chapters} onSelect={goToChapter} />
          </>
        ) : currentSlide ? (
          <>
            <SlideView
              slide={currentSlide}
              chapter={currentChapter}
              chapterIndex={currentChapterIndex}
            />
            <div className="reader" style={{ paddingTop: 0 }}>
              <div className="pager">
                <button
                  className="pager__btn"
                  disabled={!prevSlide}
                  onClick={() => prevSlide && goToSlide(prevSlide.index)}
                >
                  <span className="label">← Zurück</span>
                  <span className="title">{prevSlide ? prevSlide.title : "Anfang erreicht"}</span>
                </button>
                <button
                  className="pager__btn pager__btn--next"
                  disabled={!nextSlide}
                  onClick={() => nextSlide && goToSlide(nextSlide.index)}
                >
                  <span className="label">Weiter →</span>
                  <span className="title">{nextSlide ? nextSlide.title : "Ende erreicht"}</span>
                </button>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
