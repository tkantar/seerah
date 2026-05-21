import { useEffect, useRef } from "react";
import ThemeToggle from "./ThemeToggle.jsx";

export default function Sidebar({
  chapters,
  pagesByChapter,
  activeChapterSlug,
  activePageIndex,
  openChapter,
  onToggleChapter,
  onSelectChapter,
  onSelectPage,
  onSelectHome,
  open,
  onClose,
  theme,
  onToggleTheme,
}) {
  const activeRef = useRef(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [activeChapterSlug, activePageIndex]);

  return (
    <aside className={`sidebar ${open ? "sidebar--open" : ""}`} aria-label="Kapitelnavigation">
      <header className="sidebar__header">
        <button
          type="button"
          className="sidebar__brand-btn"
          onClick={onSelectHome}
          aria-label="Zur Startseite"
        >
          <h1 className="sidebar__brand">Seerah Dars</h1>
          <p className="sidebar__sub">Das Leben des Propheten ﷺ</p>
        </button>
        <button
          type="button"
          className="sidebar__close"
          onClick={onClose}
          aria-label="Menü schließen"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      <nav className="sidebar__nav">
        {chapters.map((c, i) => {
          const active = c.slug === activeChapterSlug;
          // Default to expanding the active chapter, unless user manually
          // toggled it shut or expanded a different one.
          const expanded =
            openChapter === c.slug ||
            (openChapter === null && active);
          const chapterPages = pagesByChapter[c.slug] || [];
          return (
            <div
              key={c.slug}
              ref={active && !activePageIndex ? activeRef : null}
              className={`chapter-block ${active ? "chapter-block--active" : ""}`}
            >
              <div className="chapter-link">
                <button
                  type="button"
                  className="chapter-link__main"
                  onClick={() => onSelectChapter(c.slug)}
                >
                  <span className="chapter-link__num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="chapter-link__title">{c.title}</span>
                </button>
                {chapterPages.length > 1 && (
                  <button
                    type="button"
                    className={`chapter-link__toggle ${expanded ? "is-expanded" : ""}`}
                    onClick={() => onToggleChapter(c.slug)}
                    aria-label={expanded ? "Kapitel einklappen" : "Kapitel ausklappen"}
                    aria-expanded={expanded}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                )}
              </div>

              {expanded && chapterPages.length > 1 && (
                <ul className="subpage-list">
                  {chapterPages.map((p) => {
                    const isActive = p.index === activePageIndex;
                    return (
                      <li key={p.index} ref={isActive ? activeRef : null}>
                        <button
                          type="button"
                          className={`subpage-link ${isActive ? "subpage-link--active" : ""}`}
                          onClick={() => onSelectPage(p.index)}
                        >
                          <span className="subpage-link__dot" aria-hidden="true" />
                          <span className="subpage-link__title">{p.title}</span>
                          {p.sections.length > 1 && (
                            <span className="subpage-link__count">{p.sections.length}</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <footer className="sidebar__footer">
        <span style={{ fontSize: 12, color: "var(--text-faint)" }}>Theme</span>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </footer>
    </aside>
  );
}
