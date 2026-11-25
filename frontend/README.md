# Pathway CRM frontend

The React/Vite client for the MERN CRM application.

## Run locally

1. Install dependencies with `npm install`.
2. Start the backend from `../backend` and make sure MongoDB is available.
3. Run `npm run dev` and open the URL printed by Vite.

The Vite development server proxies `/api` and `/uploads` to `http://localhost:5000`. Set `VITE_API_PROXY_TARGET` in a frontend `.env` file if the backend listens on a different host or port.

Register a user before signing in. The client stores the JWT and current user in local storage and sends the token with protected API requests.
