import * as Y from "yjs";

export function bindYjsToWebSocket(ydoc, stomp, sessionId) {

    // When local doc changes → send update
    ydoc.on("update", update => {
        stomp.publish({
            destination: `/app/session/${sessionId}/doc`,
            binaryBody: update
        });
    });

    return function handleRemoteUpdate(update) {
        Y.applyUpdate(ydoc, update);
    };
}
