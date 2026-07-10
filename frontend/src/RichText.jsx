import { useRef, useEffect } from "react";

// Lightweight rich-text editor (contentEditable) with a small toolbar.
// Emits HTML (bold/italic/underline + bullet/numbered lists) via onChange.
export default function RichText({ value, onChange, placeholder }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cmd(command) {
    document.execCommand(command, false, null);
    ref.current?.focus();
    emit();
  }

  function emit() {
    onChange(ref.current?.innerHTML || "");
  }

  return (
    <div className="richtext">
      <div className="richtext-toolbar">
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("bold"); }}><b>B</b></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("italic"); }}><i>I</i></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("underline"); }}><u>U</u></button>
        <span className="sep" />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("insertUnorderedList"); }}>• List</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("insertOrderedList"); }}>1. List</button>
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
