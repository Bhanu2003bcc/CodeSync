import { API_BASE_URL } from "../config";

const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        "X-Username": user?.username || "User"
    };
};

/**
 * Get all comments for a session, optionally filtered by file
 */
export async function getComments(sessionId, filePath = null) {
    let url = `${API_BASE_URL}/api/sessions/${sessionId}/comments`;
    if (filePath) {
        url += `?filePath=${encodeURIComponent(filePath)}`;
    }

    const res = await fetch(url, {
        headers: getAuthHeaders()
    });

    if (!res.ok) {
        throw new Error("Failed to fetch comments");
    }

    return res.json();
}

/**
 * Add a new comment on a line
 */
export async function addComment(sessionId, filePath, lineNumber, content) {
    const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/comments`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
            filePath,
            lineNumber,
            content
        })
    });

    if (!res.ok) {
        throw new Error("Failed to add comment");
    }

    return res.json();
}

/**
 * Add a reply to an existing comment
 */
export async function addReply(sessionId, parentId, content) {
    const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/comments/reply`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
            parentId,
            content
        })
    });

    if (!res.ok) {
        throw new Error("Failed to add reply");
    }

    return res.json();
}

/**
 * Get replies to a comment
 */
export async function getReplies(sessionId, commentId) {
    const res = await fetch(
        `${API_BASE_URL}/api/sessions/${sessionId}/comments/${commentId}/replies`,
        {
            headers: getAuthHeaders()
        }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch replies");
    }

    return res.json();
}

/**
 * Delete a comment
 */
export async function deleteComment(sessionId, commentId) {
    const res = await fetch(
        `${API_BASE_URL}/api/sessions/${sessionId}/comments/${commentId}`,
        {
            method: "DELETE",
            headers: getAuthHeaders()
        }
    );

    if (!res.ok) {
        throw new Error("Failed to delete comment");
    }

    return true;
}
