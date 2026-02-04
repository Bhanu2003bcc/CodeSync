import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

/**
 * OAuth callback page - handles redirect from GitHub
 */
export default function OAuthCallback() {
    const { login } = useAuth();
    const [error, setError] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        const errorMsg = params.get("error");

        if (token) {
            // Success - save token and redirect
            login(token);
            window.location.href = "/";
        } else if (errorMsg) {
            setError(decodeURIComponent(errorMsg));
        } else {
            setError("No token received from authentication");
        }
    }, [login]);

    if (error) {
        return (
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="auth-logo-icon">🔀</div>
                    <h1>CodeReview</h1>
                </div>
                <div className="auth-error">
                    <h2>Authentication Failed</h2>
                    <p>{error}</p>
                    <a href="/">Try again</a>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-card">
            <div className="auth-logo">
                <div className="auth-logo-icon">🔀</div>
                <h1>CodeReview</h1>
            </div>
            <div className="auth-loading">
                <p>Completing authentication...</p>
            </div>
        </div>
    );
}
