import { useEffect, useRef, useState } from "react";
import { connectWebSocket, disconnectWebSocket } from "../realtime/wsClient";
import { useAuth } from "../auth/AuthContext";
import CodeEditor from "../editor/CodeEditor";
import { loadRepoContents, loadFile, parseGitHubUrl, commitFile, fetchBranches, createFile, deleteFile, createPullRequest } from "../api/githubApi";
import { getComments, addComment, addReply, deleteComment } from "../api/commentApi";

import { MonacoBinding } from "y-monaco";
import { createYDoc } from "../crdt/yjsClient";
import { bindYjsToWebSocket } from "../crdt/wsBridge";

export default function SessionWorkspace({ sessionId, repoUrl, onClose }) {
  const { token, user } = useAuth();

  const [users, setUsers] = useState([]);
  const [comments, setComments] = useState([]);
  const [connected, setConnected] = useState(false);
  const [currentFile, setCurrentFile] = useState(null); // Currently active file
  const [loadingFile, setLoadingFile] = useState(false); // Loading indicator
  const [currentPath, setCurrentPath] = useState(''); // Current directory path
  const [commitMessage, setCommitMessage] = useState(''); // Commit message
  const [committing, setCommitting] = useState(false); // Commit in progress
  const [branches, setBranches] = useState([]); // Available branches
  const [selectedBranch, setSelectedBranch] = useState('main'); // Selected branch for commit
  const [openFiles, setOpenFiles] = useState([]); // Array of open files: { owner, repo, path, content, originalContent }
  const [showDiff, setShowDiff] = useState(false); // Show diff modal
  const [showNewFileModal, setShowNewFileModal] = useState(false); // Show new file modal
  const [newFilePath, setNewFilePath] = useState(''); // New file path input

  // Comment state
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const [selectedLine, setSelectedLine] = useState(null);
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyInput, setReplyInput] = useState('');

  // Activity feed
  const [activities, setActivities] = useState([]);

  // PR state
  const [showPRModal, setShowPRModal] = useState(false);
  const [prTitle, setPRTitle] = useState('');
  const [prBody, setPRBody] = useState('');
  const [prHead, setPRHead] = useState('');
  const [prBase, setPRBase] = useState('main');
  const [creatingPR, setCreatingPR] = useState(false);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const stompRef = useRef(null);

  const remoteDecorations = useRef({});
  const [repoFiles, setRepoFiles] = useState([]);


  // -------- CRDT --------
  const ydocRef = useRef(null);
  const ytextRef = useRef(null);
  const applyRemoteUpdateRef = useRef(null);

  // Parse the repository URL
  const repoInfo = parseGitHubUrl(repoUrl);

  useEffect(() => {
    if (!token || !repoInfo) return;

    loadRepoContents(repoInfo.owner, repoInfo.repo, token, currentPath)
      .then(setRepoFiles)
      .catch(err => console.error("Load repo files failed", err));
  }, [token, repoUrl, currentPath]);

  // Fetch branches on mount
  useEffect(() => {
    if (!token || !repoInfo) return;

    fetchBranches(repoInfo.owner, repoInfo.repo, token)
      .then(data => {
        const branchNames = data.map(b => b.name);
        setBranches(branchNames);
        // Set default branch if available
        if (branchNames.includes('main')) {
          setSelectedBranch('main');
        } else if (branchNames.includes('master')) {
          setSelectedBranch('master');
        } else if (branchNames.length > 0) {
          setSelectedBranch(branchNames[0]);
        }
      })
      .catch(err => console.error("Failed to load branches", err));
  }, [token, repoUrl]);

  // Navigate into a folder
  function navigateToFolder(folderPath) {
    setCurrentPath(folderPath);
  }

  // Go back to parent folder
  function goBack() {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
  }

  // Load comments when file changes
  useEffect(() => {
    if (!sessionId || !currentFile) return;

    getComments(sessionId, currentFile.path)
      .then(setComments)
      .catch(err => console.error("Failed to load comments", err));
  }, [sessionId, currentFile?.path]);

  // Add activity to feed
  function addActivity(message, type = 'info') {
    setActivities(prev => [
      { id: Date.now(), message, type, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 49) // Keep last 50 activities
    ]);
  }

  // Handle adding a comment
  async function handleAddComment() {
    if (!commentInput.trim() || selectedLine === null || !currentFile) return;

    try {
      const newComment = await addComment(
        sessionId,
        currentFile.path,
        selectedLine,
        commentInput
      );
      setComments(prev => [...prev, newComment]);
      setCommentInput('');
      setSelectedLine(null);
      addActivity(`${user?.username} commented on line ${selectedLine}`, 'comment');
    } catch (e) {
      alert(`Failed to add comment: ${e.message}`);
    }
  }

  // Handle adding a reply
  async function handleAddReply(parentId) {
    if (!replyInput.trim()) return;

    try {
      const reply = await addReply(sessionId, parentId, replyInput);
      setComments(prev => [...prev, reply]);
      setReplyInput('');
      setReplyingTo(null);
      addActivity(`${user?.username} replied to a comment`, 'comment');
    } catch (e) {
      alert(`Failed to add reply: ${e.message}`);
    }
  }

  // Handle deleting a comment
  async function handleDeleteComment(commentId) {
    if (!confirm("Delete this comment?")) return;

    try {
      await deleteComment(sessionId, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId && c.parentId !== commentId));
      addActivity(`${user?.username} deleted a comment`, 'comment');
    } catch (e) {
      alert(`Failed to delete comment: ${e.message}`);
    }
  }

  // Get comments for a specific line
  function getLineComments(lineNumber) {
    return comments.filter(c => c.lineNumber === lineNumber && !c.parentId);
  }

  // Get replies for a comment
  function getCommentReplies(commentId) {
    return comments.filter(c => c.parentId === commentId);
  }

  // Handle creating a pull request
  async function handleCreatePR() {
    if (!prTitle.trim() || !prHead.trim() || !prBase.trim() || !repoInfo) {
      alert("Please fill in all required fields");
      return;
    }

    // Validate that head and base are different
    if (prHead.trim() === prBase.trim()) {
      alert("❌ Head and base branches must be different!\n\nYou selected the same branch for both.");
      return;
    }

    setCreatingPR(true);
    try {
      const pr = await createPullRequest(
        repoInfo.owner,
        repoInfo.repo,
        prTitle,
        prHead,
        prBase,
        prBody,
        token
      );

      alert(`✅ Pull Request created!\n\nPR #${pr.number}: ${pr.title}\n\nView at: ${pr.html_url}`);
      setPRTitle('');
      setPRBody('');
      setPRHead('');
      setShowPRModal(false);
      addActivity(`${user?.username} created PR #${pr.number}`, 'pr');
    } catch (e) {
      // Show more helpful error message
      let errorMsg = e.message;
      if (errorMsg.includes("No commits between")) {
        errorMsg = "No commits between the selected branches. Make sure you have changes to merge.";
      } else if (errorMsg.includes("already exists")) {
        errorMsg = "A pull request already exists for these branches.";
      }
      alert(`❌ Failed to create PR: ${errorMsg}`);
    } finally {
      setCreatingPR(false);
    }
  }


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

      // ---------- FILE SELECTION ----------
      // When another user selects a file, load it for this user too
      client.subscribe(`/topic/session/${sessionId}/file-change`, async msg => {
        const data = JSON.parse(msg.body);
        console.log("[FILE] Received file change:", data);

        // Skip if this is our own message (we already loaded it)
        if (data.username === user?.username) return;

        // Load the file content
        if (data.owner && data.repo && data.path) {
          setCurrentFile({ owner: data.owner, repo: data.repo, path: data.path });
          setLoadingFile(true);
          try {
            const content = await loadFile(data.owner, data.repo, data.path, token);

            // Push into CRDT - this will sync to Monaco via binding
            if (ytextRef.current) {
              ytextRef.current.delete(0, ytextRef.current.length);
              ytextRef.current.insert(0, content);
            }
          } catch (e) {
            console.error("Failed to load shared file", e);
          } finally {
            setLoadingFile(false);
          }
        }
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
    // Check if file is already open
    const existingFile = openFiles.find(f => f.path === path);
    if (existingFile) {
      switchToFile(existingFile);
      return;
    }

    if (loadingFile) return; // Prevent double-loading

    setLoadingFile(true);
    const newFile = { owner, repo, path };
    setCurrentFile(newFile);

    try {
      const content = await loadFile(owner, repo, path, token);

      // Add to open files with original content for diff
      setOpenFiles(prev => [...prev, { ...newFile, content, originalContent: content }]);

      // Push into CRDT document - this syncs to Monaco via binding
      if (ytextRef.current) {
        ytextRef.current.delete(0, ytextRef.current.length);
        ytextRef.current.insert(0, content);
      }

      // Log activity
      addActivity(`${user?.username} opened ${path.split('/').pop()}`, 'file');

      // Broadcast file selection to other users
      if (stompRef.current?.connected) {
        stompRef.current.publish({
          destination: `/app/session/${sessionId}/file-change`,
          body: JSON.stringify({
            owner,
            repo,
            path,
            username: user?.username
          })
        });
      }

    } catch (e) {
      console.error("Failed to load file", e);
      setCurrentFile(null);
    } finally {
      setLoadingFile(false);
    }
  }

  // Switch to an already open file
  function switchToFile(file) {
    // Save current editor content to openFiles before switching
    if (currentFile && editorRef.current) {
      const currentContent = editorRef.current.getValue();
      setOpenFiles(prev => prev.map(f =>
        f.path === currentFile.path ? { ...f, content: currentContent } : f
      ));
    }

    setCurrentFile(file);

    // Load file content from openFiles
    const openFile = openFiles.find(f => f.path === file.path);
    if (openFile && ytextRef.current) {
      ytextRef.current.delete(0, ytextRef.current.length);
      ytextRef.current.insert(0, openFile.content);
    }
  }

  // Close a tab
  function closeFile(filePath) {
    setOpenFiles(prev => prev.filter(f => f.path !== filePath));

    // If closing current file, switch to another open file
    if (currentFile?.path === filePath) {
      const remaining = openFiles.filter(f => f.path !== filePath);
      if (remaining.length > 0) {
        switchToFile(remaining[remaining.length - 1]);
      } else {
        setCurrentFile(null);
        if (ytextRef.current) {
          ytextRef.current.delete(0, ytextRef.current.length);
        }
      }
    }
  }

  // Create a new file
  async function handleCreateFile() {
    if (!newFilePath.trim() || !repoInfo) {
      alert("Please enter a file path");
      return;
    }

    const fullPath = currentPath ? `${currentPath}/${newFilePath}` : newFilePath;

    try {
      await createFile(
        repoInfo.owner,
        repoInfo.repo,
        selectedBranch,
        fullPath,
        '// New file\n',
        `Create ${fullPath}`,
        token
      );

      alert(`✅ Created ${fullPath}`);
      setNewFilePath('');
      setShowNewFileModal(false);

      // Refresh file list
      loadRepoContents(repoInfo.owner, repoInfo.repo, token, currentPath)
        .then(setRepoFiles)
        .catch(err => console.error("Refresh failed", err));
    } catch (e) {
      alert(`❌ Failed to create file: ${e.message}`);
    }
  }

  // Delete a file from GitHub
  async function handleDeleteFile(file) {
    if (!confirm(`Are you sure you want to delete ${file.path}? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteFile(
        repoInfo.owner,
        repoInfo.repo,
        file.path,
        selectedBranch,
        token
      );

      alert(`✅ Deleted ${file.path}`);

      // Remove from open files if it was open
      setOpenFiles(prev => prev.filter(f => f.path !== file.path));
      if (currentFile?.path === file.path) {
        setCurrentFile(null);
      }

      // Refresh file list
      loadRepoContents(repoInfo.owner, repoInfo.repo, token, currentPath)
        .then(setRepoFiles)
        .catch(err => console.error("Refresh failed", err));
    } catch (e) {
      alert(`❌ Failed to delete file: ${e.message}`);
    }
  }

  // ======================================================
  // COMMIT TO GITHUB
  // ======================================================

  async function handleCommit() {
    if (!currentFile || !commitMessage.trim()) {
      alert("Please select a file and enter a commit message");
      return;
    }

    if (!editorRef.current) {
      alert("Editor not ready");
      return;
    }

    setCommitting(true);
    try {
      const content = editorRef.current.getValue();
      await commitFile(
        currentFile.owner,
        currentFile.repo,
        selectedBranch,
        currentFile.path,
        content,
        commitMessage,
        token
      );

      alert(`✅ Committed successfully!\n\nFile: ${currentFile.path}\nBranch: ${selectedBranch}\nMessage: ${commitMessage}`);
      addActivity(`${user?.username} committed to ${selectedBranch}: ${commitMessage}`, 'file');
      setCommitMessage('');
    } catch (e) {
      console.error("Commit failed:", e);
      alert(`❌ Commit failed: ${e.message}`);
    } finally {
      setCommitting(false);
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
        {loadingFile && " | ⏳ Loading file..."}
      </p>

      <p>Logged in as {user?.username}</p>

      {/* ================= FILE TABS ================= */}
      {openFiles.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '2px',
          background: '#1a202c',
          padding: '4px 4px 0',
          borderRadius: '4px 4px 0 0',
          overflowX: 'auto',
          marginBottom: '-4px'
        }}>
          {openFiles.map(file => (
            <div
              key={file.path}
              onClick={() => switchToFile(file)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: currentFile?.path === file.path ? '#2d3748' : '#1a202c',
                borderRadius: '4px 4px 0 0',
                cursor: 'pointer',
                borderBottom: currentFile?.path === file.path ? '2px solid #3182ce' : '2px solid transparent',
                color: currentFile?.path === file.path ? '#fff' : '#a0aec0',
                fontSize: '13px',
                whiteSpace: 'nowrap'
              }}
            >
              <span>📄 {file.path.split('/').pop()}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(file.path);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#718096',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
                title="Close tab"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Current file indicator */}
      {/*{currentFile && (
        <p style={{
          padding: "8px 12px",
          background: "#2d3748",
          borderRadius: "4px",
          marginBottom: "8px"
        }}>
          📝 Editing: <strong>{currentFile.path}</strong>
        </p>
      )}*/}
      {currentFile && (
        <div
          style={{
            padding: "12px 16px",
            background: "#2d3748",
            borderRadius: "4px",
            marginBottom: "8px"
          }}
        >
          <div style={{ marginBottom: "8px" }}>
            📝 Editing: <strong>{currentFile.path}</strong>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Branch selector */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid #4a5568",
                background: "#1a202c",
                color: "#fff",
                minWidth: "120px"
              }}
            >
              {branches.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>

            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Enter commit message..."
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid #4a5568",
                background: "#1a202c",
                color: "#fff",
                minWidth: "200px"
              }}
            />
            <button
              disabled={!currentFile}
              onClick={() => setShowDiff(true)}
              style={{
                background: "#4a5568",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              📊 Show Diff
            </button>
            <button
              disabled={!currentFile || !commitMessage.trim() || committing}
              onClick={handleCommit}
              style={{
                background: committing ? "#718096" : "#38a169",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: committing ? "wait" : "pointer",
                whiteSpace: "nowrap"
              }}
            >
              {committing ? "⏳ Committing..." : "🚀 Commit to GitHub"}
            </button>
            <button
              onClick={() => setShowPRModal(true)}
              style={{
                background: "#805ad5",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              🔀 Create PR
            </button>
          </div>
        </div>
      )}

      {/* ================= DIFF MODAL ================= */}
      {showDiff && currentFile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>📊 Diff: {currentFile.path}</h3>
            <button
              onClick={() => setShowDiff(false)}
              style={{
                background: '#e53e3e',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ✕ Close
            </button>
          </div>

          <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
            {/* Original content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#fc8181' }}>Original</h4>
              <pre style={{
                flex: 1,
                overflow: 'auto',
                background: '#1a202c',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '13px',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {openFiles.find(f => f.path === currentFile.path)?.originalContent || ''}
              </pre>
            </div>

            {/* Current content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#68d391' }}>Current</h4>
              <pre style={{
                flex: 1,
                overflow: 'auto',
                background: '#1a202c',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '13px',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {editorRef.current?.getValue() || ''}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ================= PR MODAL ================= */}
      {showPRModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div style={{
            background: '#2d3748',
            padding: '24px',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90%'
          }}>
            <h3 style={{ margin: '0 0 16px 0' }}>🔀 Create Pull Request</h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', color: '#a0aec0' }}>Title *</label>
              <input
                type="text"
                value={prTitle}
                onChange={(e) => setPRTitle(e.target.value)}
                placeholder="PR title..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid #4a5568',
                  background: '#1a202c',
                  color: '#fff'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', color: '#a0aec0' }}>Description</label>
              <textarea
                value={prBody}
                onChange={(e) => setPRBody(e.target.value)}
                placeholder="Describe your changes..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid #4a5568',
                  background: '#1a202c',
                  color: '#fff',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', color: '#a0aec0' }}>
                  From (head) * <span style={{ fontSize: '11px' }}>branch with changes</span>
                </label>
                <input
                  type="text"
                  list="head-branches"
                  value={prHead}
                  onChange={(e) => setPRHead(e.target.value)}
                  placeholder="e.g., feature-branch"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #4a5568',
                    background: '#1a202c',
                    color: '#fff'
                  }}
                />
                <datalist id="head-branches">
                  {branches.map(b => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', color: '#a0aec0' }}>
                  To (base) * <span style={{ fontSize: '11px' }}>merge target</span>
                </label>
                <input
                  type="text"
                  list="base-branches"
                  value={prBase}
                  onChange={(e) => setPRBase(e.target.value)}
                  placeholder="e.g., main"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #4a5568',
                    background: '#1a202c',
                    color: '#fff'
                  }}
                />
                <datalist id="base-branches">
                  {branches.map(b => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
            </div>

            {branches.length <= 1 && (
              <div style={{
                background: '#744210',
                color: '#fbd38d',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '16px',
                fontSize: '13px'
              }}>
                ⚠️ <strong>Only one branch found.</strong> To create a PR, you need a separate feature branch with commits. Create a new branch on GitHub first, then commit changes there.
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPRModal(false)}
                style={{
                  background: '#4a5568',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePR}
                disabled={creatingPR || !prTitle.trim() || !prHead}
                style={{
                  background: creatingPR ? '#718096' : '#805ad5',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: creatingPR ? 'wait' : 'pointer'
                }}
              >
                {creatingPR ? '⏳ Creating...' : '🔀 Create PR'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ================= EDITOR WITH COMMENTS ================= */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <CodeEditor onMount={handleEditorMount} />
        </div>

        {/* Comment Panel Toggle */}
        <button
          onClick={() => setShowCommentPanel(!showCommentPanel)}
          style={{
            position: 'fixed',
            right: showCommentPanel ? '320px' : '10px',
            top: '100px',
            background: '#3182ce',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: 100
          }}
        >
          💬 {showCommentPanel ? '◀' : `Comments (${comments.filter(c => !c.parentId).length})`}
        </button>

        {/* Comment Panel */}
        {showCommentPanel && (
          <div style={{
            width: '300px',
            background: '#2d3748',
            borderRadius: '8px',
            padding: '16px',
            maxHeight: '600px',
            overflowY: 'auto'
          }}>
            <h4 style={{ margin: '0 0 12px 0' }}>💬 Comments</h4>

            {/* Add new comment */}
            <div style={{ marginBottom: '16px', padding: '12px', background: '#1a202c', borderRadius: '4px' }}>
              <input
                type="number"
                value={selectedLine || ''}
                onChange={(e) => setSelectedLine(parseInt(e.target.value) || null)}
                placeholder="Line #"
                style={{
                  width: '60px',
                  padding: '6px',
                  borderRadius: '4px',
                  border: '1px solid #4a5568',
                  background: '#2d3748',
                  color: '#fff',
                  marginRight: '8px'
                }}
              />
              <textarea
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Add a comment..."
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #4a5568',
                  background: '#2d3748',
                  color: '#fff',
                  marginTop: '8px',
                  resize: 'vertical',
                  minHeight: '60px'
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!commentInput.trim() || selectedLine === null}
                style={{
                  marginTop: '8px',
                  background: '#38a169',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Add Comment
              </button>
            </div>

            {/* Comments list */}
            {comments.filter(c => !c.parentId).length === 0 ? (
              <p style={{ color: '#a0aec0', textAlign: 'center' }}>No comments yet</p>
            ) : (
              comments.filter(c => !c.parentId).map(comment => (
                <div key={comment.id} style={{
                  background: '#1a202c',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold', color: '#63b3ed' }}>
                      {comment.authorName}
                    </span>
                    <span style={{ color: '#718096', fontSize: '11px' }}>
                      Line {comment.lineNumber}
                    </span>
                  </div>
                  <p style={{ margin: '8px 0', color: '#e2e8f0' }}>{comment.content}</p>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#63b3ed',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ↩️ Reply
                    </button>
                    {comment.authorId === user?.id && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#fc8181',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>

                  {/* Reply input */}
                  {replyingTo === comment.id && (
                    <div style={{ marginTop: '8px' }}>
                      <textarea
                        value={replyInput}
                        onChange={(e) => setReplyInput(e.target.value)}
                        placeholder="Write a reply..."
                        style={{
                          width: '100%',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid #4a5568',
                          background: '#2d3748',
                          color: '#fff',
                          resize: 'none',
                          minHeight: '40px'
                        }}
                      />
                      <button
                        onClick={() => handleAddReply(comment.id)}
                        style={{
                          marginTop: '4px',
                          background: '#3182ce',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Send Reply
                      </button>
                    </div>
                  )}

                  {/* Replies */}
                  {getCommentReplies(comment.id).map(reply => (
                    <div key={reply.id} style={{
                      marginTop: '8px',
                      marginLeft: '16px',
                      padding: '8px',
                      background: '#2d3748',
                      borderRadius: '4px',
                      borderLeft: '2px solid #4a5568'
                    }}>
                      <span style={{ fontWeight: 'bold', color: '#63b3ed', fontSize: '12px' }}>
                        {reply.authorName}
                      </span>
                      <p style={{ margin: '4px 0', color: '#e2e8f0', fontSize: '13px' }}>
                        {reply.content}
                      </p>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ================= REPOSITORY FILES ================= */}

      <h3>Repository: {repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : 'No repository'}</h3>

      {/* Current path and back button */}
      {repoInfo && (
        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentPath && (
            <button onClick={goBack} style={{ padding: '4px 8px' }}>
              ⬅️ Back
            </button>
          )}
          <span style={{ color: '#a0aec0' }}>
            📂 {currentPath || '/'}
          </span>
          <button
            onClick={() => setShowNewFileModal(true)}
            style={{
              marginLeft: 'auto',
              background: '#3182ce',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ✚ New File
          </button>
        </div>
      )}

      {/* New File Modal */}
      {showNewFileModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: '#2d3748',
            padding: '20px',
            borderRadius: '8px',
            minWidth: '400px'
          }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Create New File</h3>
            <p style={{ color: '#a0aec0', margin: '0 0 8px 0' }}>
              Path: {currentPath ? `${currentPath}/` : ''}
            </p>
            <input
              type="text"
              value={newFilePath}
              onChange={(e) => setNewFilePath(e.target.value)}
              placeholder="filename.js"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #4a5568',
                background: '#1a202c',
                color: '#fff',
                marginBottom: '16px'
              }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowNewFileModal(false); setNewFilePath(''); }}
                style={{
                  background: '#4a5568',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                style={{
                  background: '#38a169',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {!repoInfo ? (
        <p>No repository URL provided for this session</p>
      ) : repoFiles.length === 0 ? (
        <p>Loading files...</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {repoFiles.map(file => (
            <li
              key={file.path}
              style={{
                background: currentFile?.path === file.path ? '#3182ce33' : 'transparent',
                padding: '6px 10px',
                borderRadius: '4px',
                marginBottom: '2px',
                cursor: file.type === 'dir' ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center'
              }}
              onClick={() => file.type === 'dir' && navigateToFolder(file.path)}
            >
              <span style={{ flex: 1 }}>
                {file.type === 'dir' ? '📁' : '📄'} {file.name}
              </span>

              {file.type === 'file' && (
                <>
                  <button
                    style={{ marginLeft: "10px" }}
                    disabled={loadingFile}
                    onClick={(e) => {
                      e.stopPropagation();
                      openFileFromGithub(
                        repoInfo.owner,
                        repoInfo.repo,
                        file.path
                      );
                    }}
                  >
                    {currentFile?.path === file.path ? '✓ Open' : 'Open'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFile(file);
                    }}
                    style={{
                      marginLeft: '6px',
                      background: '#e53e3e',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🗑️
                  </button>
                </>
              )}

              {file.type === 'dir' && (
                <span style={{ marginLeft: '10px', color: '#718096', fontSize: '12px' }}>
                  →
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* ================= SIDEBAR: USERS & ACTIVITY ================= */}
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        {/* Online Users */}
        <div style={{
          flex: 1,
          background: '#2d3748',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <h4 style={{ margin: '0 0 12px 0' }}>🟢 Online Users ({users.length})</h4>
          {users.length === 0 ? (
            <p style={{ color: '#718096' }}>No users online</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {users.map(u => (
                <li key={u} style={{
                  padding: '6px 0',
                  borderBottom: '1px solid #4a5568',
                  color: '#e2e8f0'
                }}>
                  👤 {u}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Activity Feed */}
        <div style={{
          flex: 2,
          background: '#2d3748',
          padding: '16px',
          borderRadius: '8px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          <h4 style={{ margin: '0 0 12px 0' }}>📋 Activity Feed</h4>
          {activities.length === 0 ? (
            <p style={{ color: '#718096' }}>No activity yet</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {activities.map(a => (
                <li key={a.id} style={{
                  padding: '8px 0',
                  borderBottom: '1px solid #4a5568',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{
                    color: a.type === 'comment' ? '#63b3ed' :
                      a.type === 'pr' ? '#b794f4' : '#e2e8f0'
                  }}>
                    {a.type === 'comment' && '💬 '}
                    {a.type === 'pr' && '🔀 '}
                    {a.type === 'file' && '📄 '}
                    {a.message}
                  </span>
                  <span style={{ color: '#718096', fontSize: '11px' }}>{a.time}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

    </div>
  );
}
