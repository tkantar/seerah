import { useMemo, Fragment } from "react";

const baseUrl = import.meta.env.BASE_URL;

function Runs({ runs }) {
  return runs.map((r, i) => {
    if (r.lineBreak) return <br key={i} />;
    if (r.bold && r.italic) {
      return (
        <strong key={i}>
          <em>{r.text}</em>
        </strong>
      );
    }
    if (r.bold) return <strong key={i}>{r.text}</strong>;
    if (r.italic) return <em key={i}>{r.text}</em>;
    return <Fragment key={i}>{r.text}</Fragment>;
  });
}

function plainText(runs) {
  return runs.map((r) => r.text).join("");
}

function classifyParagraph(block) {
  const text = plainText(block.runs).trim();
  if (block.isArabic) return "arabic";
  if (/^Quelle\b/i.test(text)) return "quelle";
  // Hadith/quote: starts with German opening quote (German typography).
  if (/^[„»"]/.test(text)) return "quote";
  return "paragraph";
}

function Table({ rows }) {
  if (!rows.length) return null;
  const [head, ...body] = rows;
  return (
    <div className="page-table-wrap">
      <table className="page-table">
        <thead>
          <tr>
            {head.map((cell, i) => (
              <th key={i}>{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Render a list of blocks, collapsing consecutive `bullet` blocks into a list.
function renderBlocks(blocks) {
  const out = [];
  let bulletGroup = null;

  const flush = () => {
    if (!bulletGroup) return;
    out.push(
      <ul key={`l-${out.length}`} className="page-list">
        {bulletGroup.map((b, i) => (
          <li
            key={i}
            className={`page-list__item page-list__item--lvl-${Math.min(b.level, 4)} ${
              b.isArabic ? "is-arabic" : ""
            }`}
          >
            <Runs runs={b.runs} />
          </li>
        ))}
      </ul>
    );
    bulletGroup = null;
  };

  for (const block of blocks) {
    if (block.type === "bullet") {
      if (!bulletGroup) bulletGroup = [];
      bulletGroup.push(block);
      continue;
    }
    flush();
    if (block.type === "table") {
      out.push(<Table key={`t-${out.length}`} rows={block.rows} />);
      continue;
    }
    if (block.type === "paragraph") {
      const kind = classifyParagraph(block);
      if (kind === "arabic") {
        out.push(
          <p key={`p-${out.length}`} className="arabic">
            <Runs runs={block.runs} />
          </p>
        );
      } else if (kind === "quelle") {
        out.push(
          <p key={`p-${out.length}`} className="quelle">
            <Runs runs={block.runs} />
          </p>
        );
      } else if (kind === "quote") {
        out.push(
          <blockquote key={`p-${out.length}`} className="quote">
            <Runs runs={block.runs} />
          </blockquote>
        );
      } else {
        out.push(
          <p key={`p-${out.length}`} className="prose">
            <Runs runs={block.runs} />
          </p>
        );
      }
    }
  }
  flush();
  return out;
}

function SectionBlock({ section, headerSubtitle }) {
  return (
    <div className={`page-section ${headerSubtitle ? "page-section--titled" : ""}`}>
      {headerSubtitle && <h2 className="page-section__subtitle">{headerSubtitle}</h2>}
      <div className="page-section__body">
        {renderBlocks(section.blocks)}
        {section.images.length > 0 && (
          <div className="page-section__images">
            {section.images.map((src) => (
              <img key={src} src={`${baseUrl}${src}`} alt="" loading="lazy" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PageView({ page, chapter, chapterIndex }) {
  // A subtitle only gets rendered as a header when it differs from the
  // previous section's subtitle — that way consecutive sections under the
  // same sub-heading flow together as one article.
  const sectionHeaders = useMemo(() => {
    const headers = [];
    page.sections.reduce((prev, s) => {
      const sub = (s.subtitle || "").trim();
      if (sub && sub !== prev) {
        headers.push(sub);
        return sub;
      }
      headers.push("");
      return prev;
    }, "");
    return headers;
  }, [page]);

  return (
    <article className="reader">
      <div className="eyebrow">
        Kapitel {String(chapterIndex + 1).padStart(2, "0")} · {chapter.title}
      </div>
      <h1 className="page-title">{page.title}</h1>

      <div className="page-body">
        {page.sections.map((section, i) => (
          <SectionBlock key={i} section={section} headerSubtitle={sectionHeaders[i]} />
        ))}
      </div>
    </article>
  );
}
