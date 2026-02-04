/**
 * Parse a GitHub URL to extract owner and repo
 * Supports: https://github.com/owner/repo or github.com/owner/repo
 */
export function parseGitHubUrl(url) {
    if (!url) return null;

    // Remove protocol and www if present
    let cleaned = url.replace(/^https?:\/\//, '').replace(/^www\./, '');

    // Remove github.com prefix
    if (cleaned.startsWith('github.com/')) {
        cleaned = cleaned.slice('github.com/'.length);
    }

    // Split by / and get owner and repo
    const parts = cleaned.split('/').filter(Boolean);
    if (parts.length >= 2) {
        return {
            owner: parts[0],
            repo: parts[1].replace(/\.git$/, '') // Remove .git suffix if present
        };
    }

    return null;
}

/**
 * Load the file tree of a specific repository at a given path
 */
export async function loadRepoContents(owner, repo, token, path = '') {
    let url = `/api/github/files?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;
    if (path) {
        url += `&path=${encodeURIComponent(path)}`;
    }

    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!res.ok) {
        throw new Error("Failed to load repository contents");
    }

    return res.json();
}

export async function loadRepos(token) {
    const res = await fetch(
        "/api/github/repos",
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    if (!res.ok) {
        throw new Error("Failed to load repos");
    }

    return res.json();
}

export async function loadFile(owner, repo, path, token) {
    const res = await fetch(
        `/api/github/file?owner=${owner}&repo=${repo}&path=${path}`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    if (!res.ok) {
        throw new Error("Failed to load file");
    }

    return res.text();
}

/**
 * Commit a file change to GitHub
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Branch name (e.g., "main")
 * @param {string} path - File path in the repo
 * @param {string} content - New file content
 * @param {string} message - Commit message
 * @param {string} token - JWT auth token
 */
export async function commitFile(owner, repo, branch, path, content, message, token) {
    const res = await fetch('/api/github/commit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            owner,
            repo,
            branch,
            path,
            content,
            message
        })
    });

    if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to commit: ${error}`);
    }

    return true;
}

/**
 * Fetch branches for a repository
 */
export async function fetchBranches(owner, repo, token) {
    const res = await fetch(
        `/api/github/branches?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch branches");
    }

    return res.json();
}

/**
 * Create a new file in the repository (uses commit endpoint)
 */
export async function createFile(owner, repo, branch, path, content, message, token) {
    // Creating a file is the same as committing - GitHub handles it
    return commitFile(owner, repo, branch, path, content, message, token);
}

/**
 * Delete a file from the repository
 */
export async function deleteFile(owner, repo, path, branch, token) {
    const res = await fetch(
        `/api/github/file?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}&branch=${encodeURIComponent(branch)}&message=${encodeURIComponent('Delete ' + path)}`,
        {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to delete file: ${error}`);
    }

    return true;
}

/**
 * Create a pull request
 */
export async function createPullRequest(owner, repo, title, head, base, body, token) {
    const API_BASE = "http://localhost:8080";
    const res = await fetch(`${API_BASE}/api/github/pull-request`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            owner,
            repo,
            title,
            head,
            base,
            body
        })
    });

    if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to create PR: ${error}`);
    }

    return res.json();
}
