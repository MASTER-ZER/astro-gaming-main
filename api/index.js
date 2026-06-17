// Vercel serverless entry — re-exports the bundled handler.
// The actual app logic lives in dist/vercel.cjs (built by esbuild during npm run build).
import vercel from "../dist/vercel.cjs";
export default vercel.default;
