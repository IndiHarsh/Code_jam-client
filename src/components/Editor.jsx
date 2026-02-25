import MonacoEditor from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import { socket } from "../socket/socket";

export default function Editor({
  roomId,
  language,
  settings,
  initialCode,
  onCodeChange,
  height = "100%"
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const suppress = useRef(false);

  function handleMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeModelContent((event) => {
      if (suppress.current) return;

      socket.emit("CODE_CHANGE", {
        roomId,
        delta: event.changes
      });
    });
  }

  useEffect(() => {
    socket.on("CODE_CHANGE", ({ delta }) => {
      suppress.current = true;

      editorRef.current.executeEdits(
        "remote",
        delta.map(change => ({
          range: change.range,
          text: change.text,
          forceMoveMarkers: true
        }))
      );

      suppress.current = false;
    });

    return () => socket.off("CODE_CHANGE");
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.updateOptions({
      fontSize: settings.fontSize,
      wordWrap: settings.wordWrap ? "on" : "off",
      minimap: { enabled: settings.minimap }
    });
    const model = editorRef.current.getModel();
    if (model) {
      model.updateOptions({ tabSize: settings.tabSize });
    }
  }, [settings]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (model) {
      monacoRef.current.editor.setModelLanguage(model, language);
    }
  }, [language]);

  return (
    <MonacoEditor
      height={height}
      theme="vs-dark"
      language={language}
      defaultValue={initialCode || "// Start coding..."}
      options={{ automaticLayout: true }}
      onChange={(value) => onCodeChange?.(value ?? "")}
      onMount={handleMount}
    />
  );
}
