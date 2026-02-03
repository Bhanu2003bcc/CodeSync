import * as Y from "yjs";

/**
 * Convert Uint8Array to Base64 string for STOMP transmission
 */
function uint8ArrayToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Bind Yjs document to WebSocket for real-time sync.
 */
export function bindYjsToWebSocket(ydoc, ytext, getStompClient, sessionId) {

    console.log("[CRDT] === BINDING SETUP ===");
    console.log("[CRDT] Doc clientID:", ydoc.clientID);
    console.log("[CRDT] Session:", sessionId);
    console.log("[CRDT] Initial text:", JSON.stringify(ytext.toString()));

    // When local doc changes → send update
    ydoc.on("update", (update, origin) => {
        if (origin === "remote") {
            return; // Skip echoed updates
        }

        const stomp = getStompClient();
        if (!stomp || !stomp.connected) {
            console.warn("[CRDT] WebSocket not connected, cannot send");
            return;
        }

        const base64Update = uint8ArrayToBase64(update);
        console.log("[CRDT] SEND: size=" + update.length + ", text=" + JSON.stringify(ytext.toString()));

        stomp.publish({
            destination: `/app/session/${sessionId}/doc`,
            body: base64Update
        });
    });

    // Return function to apply remote updates
    return function handleRemoteUpdate(update) {
        console.log("[CRDT] === RECEIVE UPDATE ===");
        console.log("[CRDT] Update size:", update.length);
        console.log("[CRDT] Update bytes (first 20):", Array.from(update.slice(0, 20)));

        const textBefore = ytext.toString();
        console.log("[CRDT] Text BEFORE:", JSON.stringify(textBefore), "length:", textBefore.length);

        // Apply the update
        Y.applyUpdate(ydoc, update, "remote");

        const textAfter = ytext.toString();
        console.log("[CRDT] Text AFTER:", JSON.stringify(textAfter), "length:", textAfter.length);

        if (textBefore === textAfter) {
            console.warn("[CRDT] ⚠️ NO CHANGE - update was duplicate or empty");
        } else {
            console.log("[CRDT] ✅ Text CHANGED:", textBefore.length, "→", textAfter.length, "chars");
        }

        console.log("[CRDT] === END RECEIVE ===");
    };
}
