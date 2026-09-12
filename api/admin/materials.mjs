import { handleRequest } from '../../lib/app.mjs';

// Explicit Vercel route for admin material links.
// Keeping this endpoint as a concrete file avoids relying on the API catch-all
// for POST actions such as save/delete.
export const config = { api: { bodyParser: false } };

export default handleRequest;
