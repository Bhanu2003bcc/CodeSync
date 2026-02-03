import { useEffect, useRef, useState } from "react";
import { connectWebSocket, disconnectWebSocket } from "../realtime/wsClient";
import { useAuth } from "../auth/AuthContext";
import CodeEditor from "../editor/CodeEditor";
import { loadRepos, loadFile } from "../api/githubApi";

import { MonacoBinding } from "y-monaco";
import { createYDoc } from "../crdt/yjsClient";
import { bindYjsToWebSocket } from "../crdt/wsBridge";

export default function SessionWorkspace({ sessionId, onClose }) {
  const { token, user } = useAuth();

  const [users, setUsers] = useState([]);
  const [comments, setComments] = useState([]);
  const [connected, setConnected] = useState(false);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const stompRef = useRef(null);

  const remoteDecorations = useRef({});
  const [repos, setRepos] = useState([]);


  // -------- CRDT --------
  const ydocRef = useRef(null);
  const ytextRef = useRef(null);
  const applyRemoteUpdateRef = useRef(null);

  // ======================================================
  // LOAD GITHUB REPOSITORIES
  // ======================================================

  useEffect(() => {
    if (!token) return;

    loadRepos(token)
      .then(setRepos)
      .catch(err => console.error("Load repos failed", err));
  }, [token]);


  // ======================================================
  // CONNECT WEBSOCKET
  // ======================================================

  useEffect(() => {
    if (!token) return;

    connectWebSocket(token, client => {
      stompRef.current = client;
      setConnected(true);

      // ---------- PRESENCE ----------
      client.subscribe(`/topic/session/${sessionId}`, msg => {
        const body = JSON.parse(msg.body);
        if (body.type === "USER_JOINED") {
          setUsers(prev =>
            prev.includes(body.username)
              ? prev
              : [...prev, body.username]
          );
        }
      });

      // ---------- CURSOR ----------
      client.subscribe(`/topic/session/${sessionId}/cursor`, msg => {
        const body = JSON.parse(msg.body);
        renderRemoteCursor(body.username, body.cursor);
      });

      // ---------- COMMENTS ----------
      client.subscribe(`/topic/session/${sessionId}/comments`, msg => {
        const c = JSON.parse(msg.body);
        setComments(prev => [...prev, c]);
      });

      // ---------- CRDT DOC ----------
      // Queue to hold updates that arrive before handler is ready
      const pendingUpdates = [];

      client.subscribe(`/topic/session/${sessionId}/doc`, msg => {
        console.log("[CRDT] === RAW MESSAGE ===");
        console.log("[CRDT] msg.body type:", typeof msg.body);
        console.log("[CRDT] msg.body length:", msg.body?.length);
        console.log("[CRDT] msg.body preview:", msg.body?.substring(0, 50));

        // Get the Base64 string from the message
        let base64 = msg.body;

        // Check if it's JSON wrapped (sometimes STOMP does this)
        if (base64.startsWith('"') && base64.endsWith('"')) {
          console.log("[CRDT] Detected JSON-wrapped string, unwrapping...");
          base64 = JSON.parse(base64);
        }

        try {
          // IMPORTANT: Data is DOUBLE Base64 encoded!
          // 1st encoding: We send Base64 from wsBridge.js
          // 2nd encoding: Spring STOMP encodes string payloads as Base64

          // First decode: Get our original Base64 string
          const firstDecode = atob(msg.body);

          // Second decode: Get the actual binary data
          const binaryString = atob(firstDecode);
          const len = binaryString.length;
          const binary = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            binary[i] = binaryString.charCodeAt(i);
          }

          console.log("[CRDT] Decoded update, size:", binary.length, "bytes:", Array.from(binary.slice(0, 5)));

          if (!applyRemoteUpdateRef.current) {
            console.warn("[CRDT] Handler not ready, queuing update");
            pendingUpdates.push(binary);
            return;
          }

          // Apply any pending updates first
          while (pendingUpdates.length > 0) {
            const pending = pendingUpdates.shift();
            console.log("[CRDT] Applying queued update, size:", pending.length);
            applyRemoteUpdateRef.current(pending);
          }

          // Apply current update
          applyRemoteUpdateRef.current(binary);
        } catch (err) {
          console.error("[CRDT] Failed to decode:", err);
          console.error("[CRDT] Raw base64 was:", base64?.substring(0, 100));
        }
      });

      // ---------- JOIN ----------
      client.publish({
        destination: `/app/session/${sessionId}/join`,
        body: "{}"
      });

      client.publish({
        destination: `/app/session/${sessionId}/load`,
        body: ""
      });
    });

    return () => {
      disconnectWebSocket();
      setConnected(false);
    };
  }, [token, sessionId]);

  // ======================================================
  // EDITOR MOUNT
  // ======================================================

  function handleEditorMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Create CRDT doc once editor is ready
    const { doc, text } = createYDoc();
    ydocRef.current = doc;
    ytextRef.current = text;

    // Bind CRDT ↔ Monaco first (this works without WS)
    // MonacoBinding signature: (ytext, monacoModel, awareness?, editors?)
    try {
      new MonacoBinding(
        ytextRef.current,
        editor.getModel(),
        undefined,  // awareness (optional, we don't use it)
        new Set([editor])  // editors set
      );
      console.log("[CRDT] Monaco binding established successfully");
    } catch (err) {
      console.error("[CRDT] Failed to bind Monaco:", err);
    }

    // Bind CRDT ↔ WS (pass getter function to handle timing)
    // This ensures we always get the current stomp client, not a stale null
    applyRemoteUpdateRef.current =
      bindYjsToWebSocket(doc, text, () => stompRef.current, sessionId);

    // Local cursor movement
    editor.onDidChangeCursorPosition(e => {
      sendCursor(e.position);
    });
  }

  // ======================================================
  // SEND CURSOR
  // ======================================================

  function sendCursor(position) {
    if (!stompRef.current) return;

    stompRef.current.publish({
      destination: `/app/session/${sessionId}/cursor`,
      body: JSON.stringify({
        filePath: "main.js",
        line: position.lineNumber,
        column: position.column
      })
    });
  }

  // ======================================================
  // RENDER REMOTE CURSOR
  // ======================================================

  function renderRemoteCursor(username, cursor) {
    if (!editorRef.current || !monacoRef.current) return;

    const monaco = monacoRef.current;

    const range = new monaco.Range(
      cursor.line,
      cursor.column,
      cursor.line,
      cursor.column
    );

    const decoration = {
      range,
      options: {
        className: "remote-cursor",
        afterContentClassName: "remote-cursor-label",
        hoverMessage: { value: username }
      }
    };

    const old = remoteDecorations.current[username] || [];
    const newDecos =
      editorRef.current.deltaDecorations(old, [decoration]);

    remoteDecorations.current[username] = newDecos;
  }

  // ======================================================
  // OPEN FILE FROM GITHUB
  // ======================================================

  async function openFileFromGithub(owner, repo, path) {
    try {
      const content = await loadFile(owner, repo, path, token);

      // Push into CRDT document
      if (ytextRef.current) {
        ytextRef.current.delete(0, ytextRef.current.length);
        ytextRef.current.insert(0, content);
      }

    } catch (e) {
      console.error("Failed to load file", e);
    }
  }

  // ======================================================
  // UI
  // ======================================================

  return (
    <div>

      <h2>Session Workspace</h2>

      <p>
        {connected ? "🟢 Connected" : "🟠 Connecting..."}
      </p>

      <p>Logged in as {user?.username}</p>

      <CodeEditor onMount={handleEditorMount} />

      {/* ================= GITHUB REPOS ================= */}

      <h3>GitHub Repositories</h3>

      {repos.length === 0 ? (
        <p>No repositories loaded</p>
      ) : (
        <ul>
          {repos.map(r => (
            <li key={r.full_name}>
              {r.full_name}

              <button
                style={{ marginLeft: "10px" }}
                onClick={() =>
                  openFileFromGithub(
                    r.full_name.split("/")[0],
                    r.full_name.split("/")[1],
                    "README.md"
                  )
                }
              >
                Open README
              </button>
            </li>
          ))}
        </ul>
      )}


      <h3>Online Users</h3>
      <ul>
        {users.map(u => (
          <li key={u}>{u}</li>
        ))}
      </ul>

      <h3>Comments</h3>

      <input
        placeholder="Write comment..."
        onKeyDown={e => {
          if (e.key === "Enter") {
            stompRef.current.publish({
              destination: `/app/session/${sessionId}/comment`,
              body: JSON.stringify({
                filePath: "main.js",
                lineNumber: 1,
                content: e.target.value,
                parentCommentId: null
              })
            });
            e.target.value = "";
          }
        }}
      />

      <ul>
        {comments.map(c => (
          <li key={c.id}>{c.content}</li>
        ))}
      </ul>

    </div>
  );
}
