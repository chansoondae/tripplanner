"use client";

import { useEffect, useRef, useCallback } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { editorExtensions } from "./extensions";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function MarkdownEditor({ value, onChange, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // 외부에서 dispatch 중일 때 onChange 무시하기 위한 플래그
  const isExternalUpdate = useRef(false);

  const initEditor = useCallback(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown(),
        ...editorExtensions,
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isExternalUpdate.current) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트 시 한 번만

  useEffect(() => {
    const cleanup = initEditor();
    return cleanup;
  }, [initEditor]);

  // 외부에서 value가 바뀐 경우 (AI 편집 등) 에디터 내용 교체
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const current = view.state.doc.toString();
    if (current !== value) {
      isExternalUpdate.current = true;
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
      isExternalUpdate.current = false;
    }
  }, [value]);

  return <div ref={containerRef} className={className} />;
}
