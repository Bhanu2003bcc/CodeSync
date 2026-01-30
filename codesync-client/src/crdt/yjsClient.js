import * as Y from "yjs";

export function createYDoc() {
    const doc = new Y.Doc();
    const text = doc.getText("monaco");
    return { doc, text };
}
