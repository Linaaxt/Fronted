Frontend static app for ProyectoE1

Quick start

1. Open a terminal in this folder.
2. Install dependencies:

   npm install

3. Set your Google Maps API key in `index.html` (replace YOUR_API_KEY).

4. Optionally set the backend URL and port:

   $env:BACKEND_URL = "http://localhost:9001"
   $env:PORT = "3001"


5. Start the server:

   npm start

The server will run on http://localhost:<PORT>. It proxies requests to `/api/coordenadas` to the backend (configured via `BACKEND_URL`) to avoid CORS during development.
