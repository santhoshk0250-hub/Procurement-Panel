"use client";

import dynamic from "next/dynamic";
import React, { useMemo } from "react";

const TinyEditor = dynamic(
  async () => {
    const mod = await import("@tinymce/tinymce-react");
    return mod.Editor;
  },
  { ssr: false }
);

type TinyMCETextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  height?: number;
  placeholder?: string;
  className?: string;
};

export default function TinyMCETextEditor({
  value,
  onChange,
  disabled = false,
  height = 160,
  placeholder = "Write here...",
  className = "",
}: TinyMCETextEditorProps) {
  // ✅ IMPORTANT: type init exactly as the Editor expects
  type EditorInit = NonNullable<React.ComponentProps<typeof TinyEditor>["init"]>;

  const init = useMemo<EditorInit>(
    () => ({
      height,
      min_height: 140,
      max_height: 280,

      menubar: false,
      statusbar: false,
      branding: false,
      resize: false,

      // ✅ Only required features
      plugins: "lists",
      toolbar: "bold underline | bullist numlist",
      toolbar_mode: "wrap",
      toolbar_sticky: false,

      paste_as_text: true,
      placeholder,

      content_style: `
        body{
          font-family: Inter, system-ui, Arial, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          padding: 10px;
          margin: 0;
          text-align: left;
        }
        p{ margin: 0 0 10px; }
        ul,ol{ margin: 0 0 10px 18px; padding: 0; }
      `,

      // ✅ must be union "ltr" | "rtl"
      directionality: "ltr",
    }),
    [height, placeholder]
  );

  return (
    <div className={`rounded-xl border border-gray-300 bg-white overflow-hidden ${className}`}>
      <TinyEditor
        tinymceScriptSrc="https://cdn.jsdelivr.net/npm/tinymce@6/tinymce.min.js"
        value={value || ""}
        disabled={disabled}
        onEditorChange={onChange}
        init={init}
      />

      <style jsx>{`
        :global(.tox) {
          border: none !important;
        }
        :global(.tox .tox-editor-header) {
          border-bottom: 1px solid #e5e7eb !important;
        }
        :global(.tox .tox-toolbar__primary) {
          padding: 6px !important;
        }
        :global(.tox .tox-tbtn) {
          width: 32px !important;
          height: 32px !important;
        }
        :global(.tox-edit-area) {
          padding: 0 !important;
        }
        @media (max-width: 640px) {
          :global(.tox .tox-toolbar__primary) {
            padding: 4px !important;
          }
          :global(.tox .tox-tbtn) {
            width: 28px !important;
            height: 28px !important;
          }
        }
      `}</style>
    </div>
  );
}
