import { useCallback, useEffect, useMemo, useState } from "react";
import data from "./data/slides.json";
import Sidebar from "./components/Sidebar.jsx";
import PageView from "./components/PageView.jsx";
import Hero from "./components/Hero.jsx";
import ChapterIndex from "./components/ChapterIndex.jsx";
import "./App.css";

const { chapters, pages } = data;
const pageByIndex = new Map(pages.map((p) => [p.index, p]));
const pagesByChapter = chapters.reduce((acc, c) => {
  acc[c.slug] = pages.filter((p) => p.chapter === c.slug);
  return acc;
}, {});
// Map any source pptx slide index to the page that contains it (used to
// translate legacy `#/slide/N` URLs).
const pageBySlide = new Map();
for (const p of pages) {
  for (const s of p.sections) {
    pageBySlide.set(s.slideIndex, p.index);
  }
}

function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, "");
  if (!h) return { route: "home" };
  const [first, second] = h.split("/");
  if (first === "page" && second) {
    const n = parseInt(second, 10);
    if (pageByIndex.has(n)) return { route: "page", pageIndex: n };
  }
  if (first === "slide" && second) {
    const n = parseInt(second, 10);
    const pIdx = pageBySlide.get(n);
    if (pIdx) return { route: "page", pageIndex: pIdx };
  }
  if (first === "chapter" && second) {
    const c = chapters.find((x) => x.slug === second);
    if (c?.startPage) return { route: "page", pageIndex: c.startPage };
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
  // Which chapter section is open in the sidebar. Auto-syncs to the active
  // chapter as the user navigates, but the user can override it by clicking
  // the chevron next to any chapter.
  const [openChapter, setOpenChapter] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("seerah-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onHashChange = () => setView(parseHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const goToPage = useCallback((pageIndex) => {
    window.location.hash = `#/page/${pageIndex}`;
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
      if (c?.startPage) goToPage(c.startPage);
    },
    [goToPage]
  );

  const currentPage = view.route === "page" ? pageByIndex.get(view.pageIndex) : null;
  const currentChapter = useMemo(() => {
    if (!currentPage) return null;
    return chapters.find((c) => c.slug === currentPage.chapter);
  }, [currentPage]);
  const currentChapterIndex = useMemo(() => {
    if (!currentChapter) return -1;
    return chapters.findIndex((c) => c.slug === currentChapter.slug);
  }, [currentChapter]);

  const prevPage =
    currentPage && currentPage.index > 1 ? pageByIndex.get(currentPage.index - 1) : null;
  const nextPage =
    currentPage && currentPage.index < pages[pages.length - 1].index
      ? pageByIndex.get(currentPage.index + 1)
      : null;

  useEffect(() => {
    if (view.route !== "page") return;
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        if (nextPage) goToPage(nextPage.index);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        if (prevPage) goToPage(prevPage.index);
      } else if (e.key === "Escape") {
        goHome();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, prevPage, nextPage, goToPage, goHome]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const activeChapterSlug = currentChapter?.slug ?? null;
  // If user expanded a chapter that isn't the one they then navigated to,
  // clear the manual expansion so the active chapter shows its pages again.
  const [lastActive, setLastActive] = useState(activeChapterSlug);
  if (lastActive !== activeChapterSlug) {
    setLastActive(activeChapterSlug);
    if (openChapter && openChapter !== activeChapterSlug) setOpenChapter(null);
  }

  const toggleChapter = useCallback((slug) => {
    setOpenChapter((cur) => (cur === slug ? null : slug));
  }, []);

  return (
    <div className="app">
      {sidebarOpen && <div className="backdrop" onClick={() => setSidebarOpen(false)} />}
      <Sidebar
        chapters={chapters}
        pagesByChapter={pagesByChapter}
        activeChapterSlug={activeChapterSlug}
        activePageIndex={currentPage?.index ?? null}
        openChapter={openChapter}
        onToggleChapter={toggleChapter}
        onSelectChapter={goToChapter}
        onSelectPage={goToPage}
        onSelectHome={goHome}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
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
            <button className="topbar__home" onClick={goHome}>
              Seerah Dars
            </button>
            {currentChapter && (
              <>
                <span className="sep">/</span>
                <strong>{currentChapter.title}</strong>
              </>
            )}
          </div>

          {currentPage && (
            <div className="topbar__progress">
              {currentPage.index} / {pages.length}
            </div>
          )}
        </div>

        {view.route === "home" ? (
          <>
            <Hero
              onStart={() => goToPage(1)}
              totalChapters={chapters.length}
              totalPages={pages.length}
            />
            <ChapterIndex chapters={chapters} onSelect={goToChapter} />
          </>
        ) : currentPage ? (
          <>
            <PageView
              page={currentPage}
              chapter={currentChapter}
              chapterIndex={currentChapterIndex}
            />
            <div className="reader reader--pager">
              <div className="pager">
                <button
                  className="pager__btn"
                  disabled={!prevPage}
                  onClick={() => prevPage && goToPage(prevPage.index)}
                >
                  <span className="label">← Zurück</span>
                  <span className="title">{prevPage ? prevPage.title : "Anfang erreicht"}</span>
                </button>
                <button
                  className="pager__btn pager__btn--next"
                  disabled={!nextPage}
                  onClick={() => nextPage && goToPage(nextPage.index)}
                >
                  <span className="label">Weiter →</span>
                  <span className="title">{nextPage ? nextPage.title : "Ende erreicht"}</span>
                </button>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
