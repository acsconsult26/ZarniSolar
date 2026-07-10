"""Parse a small subset of HTML (from the frontend rich-text editor) into a
block model the deck engine can render: paragraphs, bullet lists, numbered
lists, with bold/italic runs.

Supported tags: <p>, <div>, <br>, <ul>/<ol>/<li>, <b>/<strong>, <i>/<em>, <u>.
Anything else degrades to plain text.
"""
from __future__ import annotations

from html.parser import HTMLParser


class _RichParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.blocks = []            # list of {type, items:[[run,...],...]}
        self._cur_block = None      # current block dict
        self._cur_line = None       # current list of runs
        self._bold = 0
        self._italic = 0
        self._list_stack = []       # 'ul' | 'ol'

    def _ensure_para_block(self):
        if self._cur_block is None or self._cur_block["type"] not in ("p",):
            self._flush_line()
            self._cur_block = {"type": "p", "items": []}
            self.blocks.append(self._cur_block)
        if self._cur_line is None:
            self._cur_line = []

    def _flush_line(self):
        if self._cur_line is not None and self._cur_block is not None:
            # drop empty lines
            if any(r["text"].strip() for r in self._cur_line):
                self._cur_block["items"].append(self._cur_line)
        self._cur_line = None

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in ("b", "strong"):
            self._bold += 1
        elif tag in ("i", "em"):
            self._italic += 1
        elif tag in ("ul", "ol"):
            self._flush_line()
            self._list_stack.append(tag)
            self._cur_block = {"type": tag, "items": []}
            self.blocks.append(self._cur_block)
        elif tag == "li":
            self._flush_line()
            self._cur_line = []
        elif tag in ("p", "div"):
            self._flush_line()
            if not self._list_stack:
                self._cur_block = {"type": "p", "items": []}
                self.blocks.append(self._cur_block)
                self._cur_line = []
        elif tag == "br":
            if self._cur_line is not None:
                self._flush_line()
                self._cur_line = []

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in ("b", "strong"):
            self._bold = max(0, self._bold - 1)
        elif tag in ("i", "em"):
            self._italic = max(0, self._italic - 1)
        elif tag in ("ul", "ol"):
            self._flush_line()
            if self._list_stack:
                self._list_stack.pop()
            self._cur_block = None
        elif tag == "li":
            self._flush_line()
        elif tag in ("p", "div"):
            self._flush_line()

    def handle_data(self, data):
        text = data.replace("\xa0", " ")
        if not text:
            return
        if self._cur_line is None:
            self._ensure_para_block()
        self._cur_line.append({"text": text, "bold": self._bold > 0, "italic": self._italic > 0})

    def result(self):
        self._flush_line()
        # merge consecutive runs, drop empty blocks
        out = []
        for b in self.blocks:
            items = [line for line in b["items"] if any(r["text"].strip() for r in line)]
            if items:
                out.append({"type": b["type"], "items": items})
        return out


def parse_html(html: str):
    if not html:
        return []
    html = html.strip()
    # plain text (no tags) -> split on newlines into paragraphs
    if "<" not in html:
        return [{"type": "p", "items": [[{"text": ln, "bold": False, "italic": False}]]}
                for ln in html.split("\n") if ln.strip()]
    p = _RichParser()
    try:
        p.feed(html)
        return p.result()
    except Exception:
        return [{"type": "p", "items": [[{"text": html, "bold": False, "italic": False}]]}]


def plain_text(html: str) -> str:
    """Flatten rich text/HTML to plain text (for previews)."""
    blocks = parse_html(html)
    lines = []
    for b in blocks:
        for line in b["items"]:
            lines.append("".join(r["text"] for r in line))
    return "\n".join(lines)
