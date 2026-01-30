import { useState } from "react";

export default function JoinSession({ onJoin }) {
    const [sessionId, setSessionId] = useState("");
    const [error, setError] = useState("");

    function handleJoin(e) {
        e.preventDefault();
        setError("");

        const trimmedId = sessionId.trim();

        // Basic UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!trimmedId) {
            setError("Please enter a session ID");
            return;
        }

        if (!uuidRegex.test(trimmedId)) {
            setError("Invalid session ID format. It should be a UUID.");
            return;
        }

        onJoin(trimmedId);
        setSessionId("");
    }

    return (
        <div className="join-session">
            <h3>🔗 Join Existing Session</h3>
            <p className="text-muted">Enter a session ID shared by another user to collaborate</p>

            <form onSubmit={handleJoin} className="join-session-form">
                <input
                    type="text"
                    placeholder="Paste session ID here (e.g., abc123-def456-...)"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                />
                <button type="submit">Join Session</button>
            </form>

            {error && <p className="auth-error">{error}</p>}
        </div>
    );
}
