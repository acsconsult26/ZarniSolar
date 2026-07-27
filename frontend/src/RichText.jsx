import { useRef, useEffect } from "react";

// Lightweight rich-text editor (contentEditable) with a small toolbar.
// Emits HTML (bold/italic/underline + bullet/numbered lists) via onChange.
// Formatting is applied by manually wrapping the selected Range instead of
// the deprecated/unreliable document.execCommand, which doesn't reliably
// apply formatting across browsers.
function wrapSelection(root, tagName) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed || !root.contains(range.commonAncestorContainer)) return;

  const wrapper = document.createElement(tagName);
  try {
    range.surroundContents(wrapper);
  } catch {
    const content = range.extractContents();
    wrapper.appendChild(content);
    range.insertNode(wrapper);
  }
  sel.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(wrapper);
  sel.addRange(newRange);
}

function insertList(root, ordered) {
  const sel = window.getSelection();
  const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
  const list = document.createElement(ordered ? "ol" : "ul");
  const li = document.createElement("li");

  if (range && !range.collapsed && root.contains(range.commonAncestorContainer)) {
    li.appendChild(range.extractContents());
    list.appendChild(li);
    range.insertNode(list);
  } else if (range && root.contains(range.commonAncestorContainer)) {
    li.textContent = "List item";
    list.appendChild(li);
    range.insertNode(list);
  } else {
    li.textContent = "List item";
    list.appendChild(li);
    root.appendChild(list);
  }
}

export default function RichText({ value, onChange, placeholder }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emit() {
    onChange(ref.current?.innerHTML || "");
  }

  function applyStyle(tagName) {
    if (!ref.current) return;
    ref.current.focus();
    wrapSelection(ref.current, tagName);
    emit();
  }

  function applyList(ordered) {
    if (!ref.current) return;
    ref.current.focus();
    insertList(ref.current, ordered);
    emit();
  }

  return (
    <div className="richtext">
      <div className="richtext-toolbar">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyStyle("strong")}><b>B</b></button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyStyle("em")}><i>I</i></button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyStyle("u")}><u>U</u></button>
        <span className="sep" />
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyList(false)}>• List</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyList(true)}>1. List</button>
      </div>
      <div
        ref={ref}
        className="richtext-area"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || ""}
        onInput={emit}
        onBlur={emit}
      />
    </div>
  );
}
