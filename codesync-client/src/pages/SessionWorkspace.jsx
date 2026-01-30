// import { useEffect, useState } from "react";
// import { connectWebSocket, disconnectWebSocket } from "../realtime/wsClient";
// import { useAuth } from "../auth/AuthContext";

// export default function SessionWorkspace({ sessionId, onClose }) {
//   const { token, user } = useAuth();

//   const [users, setUsers] = useState([]);
//   const [comments, setComments] = useState([]);
//   const [cursors, setCursors] = useState({});

//   const [stomp, setStomp] = useState(null);
//   const [connected, setConnected] = useState(false);

//   // ======================================================
//   // CONNECT
//   // ======================================================

//   useEffect(() => {
//     if (!token) return;

//     connectWebSocket(token, client => {
//       setStomp(client);
//       setConnected(true);

//       // ---------------- Presence ----------------
//       client.subscribe(
//         `/topic/session/${sessionId}`,
//         msg => {
//           const body = JSON.parse(msg.body);
//           if (body.type === "USER_JOINED") {
//             setUsers(prev =>
//               prev.includes(body.username)
//                 ? prev
//                 : [...prev, body.username]
//             );
//           }
//         }
//       );

//       // ---------------- Cursor ----------------
//       client.subscribe(
//         `/topic/session/${sessionId}/cursor`,
//         msg => {
//           const body = JSON.parse(msg.body);

//           setCursors(prev => ({
//             ...prev,
//             [body.username]: body.cursor
//           }));
//         }
//       );

//       // ---------------- Comments ----------------
//       client.subscribe(
//         `/topic/session/${sessionId}/comments`,
//         msg => {
//           const comment = JSON.parse(msg.body);
//           setComments(prev => [...prev, comment]);
//         }
//       );

//       // ---------------- Join ----------------
//       client.publish({
//         destination: `/app/session/${sessionId}/join`,
//         body: JSON.stringify({})
//       });
//     });

//     return () => {
//       disconnectWebSocket();
//       setConnected(false);
//     };
//   }, [token, sessionId]);

//   // ======================================================
//   // SEND CURSOR
//   // ======================================================

//   function sendCursor() {
//     if (!stomp) return;

//     stomp.publish({
//       destination: `/app/session/${sessionId}/cursor`,
//       body: JSON.stringify({
//         filePath: "DemoFile.js",
//         line: Math.floor(Math.random() * 100),
//         column: Math.floor(Math.random() * 80)
//       })
//     });
//   }

//   // ======================================================
//   // SEND COMMENT
//   // ======================================================

//   function sendComment(text) {
//     if (!stomp || !text.trim()) return;

//     stomp.publish({
//       destination: `/app/session/${sessionId}/comment`,
//       body: JSON.stringify({
//         filePath: "DemoFile.js",
//         lineNumber: 1,
//         content: text,
//         parentCommentId: null
//       })
//     });
//   }

//   // ======================================================
//   // UI
//   // ======================================================

//   return (
//     <div className="workspace">

//       {/* Header */}
//       <div className="workspace-header">
//         <div>
//           <h2>📝 Session Workspace</h2>
//           <p style={{ fontSize: "0.85rem" }}>
//             ID: {sessionId}
//           </p>
//         </div>

//         <div style={{ display: "flex", gap: "12px" }}>
//           <span style={{ color: connected ? "green" : "orange" }}>
//             {connected ? "● Connected" : "● Connecting..."}
//           </span>

//           {onClose && (
//             <button onClick={onClose}>
//               Close
//             </button>
//           )}
//         </div>
//       </div>

//       {/* User */}
//       <p>
//         👤 Logged in as: <b>{user?.username}</b>
//       </p>

//       {/* Users */}
//       <div>
//         <h3>Online Users ({users.length})</h3>

//         {users.length === 0 ? (
//           <p>No users yet</p>
//         ) : (
//           <ul>
//             {users.map(u => (
//               <li key={u}>{u}</li>
//             ))}
//           </ul>
//         )}
//       </div>

//       {/* Cursor */}
//       <div style={{ marginTop: "20px" }}>
//         <button onClick={sendCursor}>
//           Send Cursor Update
//         </button>

//         <h4 style={{ marginTop: "10px" }}>
//           Live Cursors
//         </h4>

//         {Object.keys(cursors).length === 0 ? (
//           <p>No cursor activity yet</p>
//         ) : (
//           <ul>
//             {Object.entries(cursors).map(([user, c]) => (
//               <li key={user}>
//                 {user} → line {c.line}, col {c.column}
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>

//       {/* Comments */}
//       <div style={{ marginTop: "30px" }}>
//         <h3>💬 Comments</h3>

//         <input
//           placeholder="Write a comment and press Enter..."
//           style={{
//             width: "100%",
//             padding: "8px",
//             marginBottom: "12px"
//           }}
//           onKeyDown={e => {
//             if (e.key === "Enter") {
//               sendComment(e.target.value);
//               e.target.value = "";
//             }
//           }}
//         />

//         {comments.length === 0 ? (
//           <p>No comments yet</p>
//         ) : (
//           <ul>
//             {comments.map(c => (
//               <li key={c.id}>
//                 {c.content}
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>

//     </div>
//   );
// }
import { useEffect, useRef, useState } from "react";
import { connectWebSocket, disconnectWebSocket } from "../realtime/wsClient";
import { useAuth } from "../auth/AuthContext";
import CodeEditor from "../editor/CodeEditor";

export default function SessionWorkspace({ sessionId, onClose }) {
  const { token, user } = useAuth();

  const [users, setUsers] = useState([]);
  const [comments, setComments] = useState([]);
  const [stomp, setStomp] = useState(null);
  const [connected, setConnected] = useState(false);
  const [code, setCode] = useState("// Start coding...");

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const remoteDecorations = useRef({});
  const stompRef = useRef(null);
  const userColorMap = useRef({});
  const colorIndex = useRef(0);

  // =========================================
  // CONNECT WS
  // =========================================

  useEffect(() => {
    if (!token) return;

    connectWebSocket(token, client => {
      setStomp(client);
      stompRef.current = client;
      setConnected(true);

      // Presence
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

      // Cursor - filter out own cursor
      client.subscribe(
        `/topic/session/${sessionId}/cursor`,
        msg => {
          const body = JSON.parse(msg.body);
          // Don't render our own cursor
          if (body.username !== user?.username) {
            renderRemoteCursor(body.username, body.cursor);
          }
        }
      );

      // Comments
      client.subscribe(
        `/topic/session/${sessionId}/comments`,
        msg => {
          const c = JSON.parse(msg.body);
          setComments(prev => [...prev, c]);
        }
      );

      // Doc updates (CRDT)
      client.subscribe(
        `/topic/session/${sessionId}/doc`,
        msg => {
          const binary = Uint8Array.from(
            atob(msg.body),
            c => c.charCodeAt(0)
          );
          applyRemoteUpdate(binary);
        }
      );

      // Join
      client.publish({
        destination: `/app/session/${sessionId}/join`,
        body: "{}"
      });
    });

    return () => disconnectWebSocket();
  }, [token, sessionId]);

  // =========================================
  // EDITOR MOUNT
  // =========================================

  function handleEditorMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition(e => {
      sendCursor(e.position);
    });
  }

  // =========================================
  // SEND CURSOR
  // =========================================

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

  // =========================================
  // RENDER REMOTE CURSOR
  // =========================================

  function getUserColorClass(username) {
    if (!userColorMap.current[username]) {
      userColorMap.current[username] = colorIndex.current % 5; // 5 color variants (0-4)
      colorIndex.current++;
    }
    const idx = userColorMap.current[username];
    return idx === 0 ? '' : `-${idx}`;
  }

  function renderRemoteCursor(username, cursor) {
    if (!editorRef.current || !monacoRef.current) return;

    const monaco = monacoRef.current;
    const colorClass = getUserColorClass(username);

    const range = new monaco.Range(
      cursor.line,
      cursor.column,
      cursor.line,
      cursor.column + 1 // Need width for visibility
    );

    const decoration = {
      range,
      options: {
        className: `remote-cursor remote-cursor${colorClass}`,
        beforeContentClassName: `remote-cursor-label remote-cursor${colorClass}`,
        hoverMessage: { value: `${username}'s cursor` },
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
      }
    };

    const old = remoteDecorations.current[username] || [];
    const newDecos = editorRef.current.deltaDecorations(old, [decoration]);
    remoteDecorations.current[username] = newDecos;

    console.log(`[Cursor] Rendered cursor for ${username} at line ${cursor.line}, col ${cursor.column}`);
  }

  // Placeholder for CRDT document updates
  function applyRemoteUpdate(binary) {
    console.log('[Doc] Received remote update, bytes:', binary.length);
    // TODO: Integrate with Yjs document if needed
  }

  // =========================================
  // UI
  // =========================================

  return (
    <div>

      <h2>Session Workspace</h2>

      <p>
        {connected ? "🟢 Connected" : "🟠 Connecting..."}
      </p>

      <p>Logged in as {user?.username}</p>

      <CodeEditor
        code={code}
        onChange={setCode}
        onMount={handleEditorMount}
      />

      <h3>Online Users</h3>
      <ul>
        {users.map(u => <li key={u}>{u}</li>)}
      </ul>

      <h3>Comments</h3>

      <input
        placeholder="Write comment..."
        onKeyDown={e => {
          if (e.key === "Enter") {
            stomp.publish({
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
