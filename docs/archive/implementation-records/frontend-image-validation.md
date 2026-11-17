# Frontend image validation

On October 16, 2026, the standalone frontend production image was validated using Docker Desktop client and server 29.8.2. The image built, Nginx started, and a browser loaded the login page at `http://127.0.0.1:3000/`. Requests to `/` and `/course-management` returned HTTP 200; the latter matched `index.html`, confirming the client-route fallback. The image was approximately 77 MB. The smoke-test container was stopped and removed; the local image was retained.

This is a historical result, not a current test run. See [Architecture](../../architecture.md) for the current image and proxy configuration.
