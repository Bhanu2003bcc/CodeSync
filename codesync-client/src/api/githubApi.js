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
