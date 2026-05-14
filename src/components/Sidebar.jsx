import ThemeToggle from "./ThemeToggle.jsx";

export default function Sidebar({
  chapters,
  activeChapterSlug,
  onSelectChapter,
  onSelectHome,
  open,
  theme,
  onToggleTheme,
}) {
  return (
    <aside className={`sidebar ${open ? "sidebar--open" : ""}`} aria-label="Kapitelnavigation">
      <header className="sidebar__header" onClick={onSelectHome} role="button" tabIndex={0}>
        <h1 className="sidebar__brand">Seerah Dars</h1>
        <p className="sidebar__sub">Das Leben des Propheten ﷺ</p>
      </header>

      <nav className="sidebar__nav">
        {chapters.map((c, i) => {
          const active = c.slug === activeChapterSlug;
          return (
            <button
              key={c.slug}
              className={`chapter-link ${active ? "chapter-link--active" : ""}`}
              onClick={() => onSelectChapter(c.slug)}
            >
              <span className="chapter-link__num">{String(i + 1).padStart(2, "0")}</span>
              <span className="chapter-link__title">{c.title}</span>
              <span className="chapter-link__count">{c.slideCount}</span>
            </button>
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
