"""Extract text from each slide of an unzipped .pptx into a single JSON file."""
import json
import os
import re
import sys
import xml.etree.ElementTree as ET

NS = {"a": "http://schemas.openxmlformats.org/drawingml/2006/main"}
SLIDE_DIR = os.path.join(os.path.dirname(__file__), "unpacked", "ppt", "slides")
OUT = os.path.join(os.path.dirname(__file__), "slides.json")


def slide_num(fname):
    m = re.match(r"slide(\d+)\.xml$", fname)
    return int(m.group(1)) if m else -1


def parse_slide(path):
    """Return a list of paragraphs, each paragraph is a list of (text, bold)."""
    tree = ET.parse(path)
    root = tree.getroot()
    paragraphs = []
    # iterate over text bodies (txBody)
    for txBody in root.iter("{http://schemas.openxmlformats.org/drawingml/2006/main}txBody"):
        for p in txBody.findall("a:p", NS):
            runs = []
            for child in p:
                tag = child.tag.split("}", 1)[-1]
                if tag == "r":  # run
                    rPr = child.find("a:rPr", NS)
                    bold = False
                    size = None
                    if rPr is not None:
                        bold = rPr.attrib.get("b") == "1"
                        sz = rPr.attrib.get("sz")
                        if sz:
                            try:
                                size = int(sz)
                            except ValueError:
                                size = None
                    t = child.find("a:t", NS)
                    text = t.text if t is not None and t.text is not None else ""
                    if text:
                        runs.append({"text": text, "bold": bold, "size": size})
                elif tag == "br":
                    runs.append({"text": "\n", "bold": False, "size": None})
                elif tag == "fld":
                    t = child.find("a:t", NS)
                    if t is not None and t.text:
                        runs.append({"text": t.text, "bold": False, "size": None})
            if runs:
                paragraphs.append(runs)
    return paragraphs


def main():
    files = sorted(
        (f for f in os.listdir(SLIDE_DIR) if re.match(r"slide\d+\.xml$", f)),
        key=slide_num,
    )
    out = []
    for fn in files:
        n = slide_num(fn)
        try:
            paras = parse_slide(os.path.join(SLIDE_DIR, fn))
        except Exception as e:
            print(f"failed {fn}: {e}", file=sys.stderr)
            paras = []
        out.append({"index": n, "paragraphs": paras})
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"wrote {OUT} with {len(out)} slides")


if __name__ == "__main__":
    main()
