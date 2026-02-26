const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

/**
 * Convert a backend-relative URL to a full URL.
 * Handles: /api/uploads/..., null, undefined, already-full URLs
 */
export function mediaUrl(path) {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
        return path;
    }
    return `${BACKEND_URL}${path}`;
}
