# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Admin access & backend actions

Set the `VITE_ADMIN_PASSCODE` variable in `.env` to control who can unlock the dashboard. The passcode gate is evaluated entirely on the client, so pair it with Appwrite permissions for production deployments.

Privileged actions (approving/rejecting submissions) are proxied through the tiny Express server in `server.js`. Run it locally with `node server.js` and point the dashboard at it by adding `VITE_ADMIN_API_BASE_URL=http://localhost:4000` to your `.env`. The React app will call endpoints such as `/approve-user-submission`, so make sure the server is online before testing those flows or you will see JSON parse errors (because the browser falls back to the Vite dev server which serves HTML).

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
