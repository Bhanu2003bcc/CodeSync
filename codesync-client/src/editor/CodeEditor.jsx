import Editor from "@monaco-editor/react";

export default function CodeEditor({
  code,
  onChange,
  onMount
}) {
  return (
    <Editor
      height="400px"
      defaultLanguage="javascript"
      value={code}
      onChange={onChange}
      onMount={onMount}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14
      }}
    />
  );
}
