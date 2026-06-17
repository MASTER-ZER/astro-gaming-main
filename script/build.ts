import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, cp, mkdir } from "fs/promises";
import { resolve } from "path";

const root = resolve(import.meta.dirname, "..");

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];

  // Server deps to bundle — everything else stays external (resolved from node_modules at runtime).
  const allowlist = [
    "bcryptjs",
    "date-fns",
    "drizzle-orm",
    "drizzle-zod",
    "express",
    "multer",
    "nanoid",
    "pg",
    "ws",
    "zod",
    "zod-validation-error",
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: { "process.env.NODE_ENV": '"production"' },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("building Vercel serverless function...");
  await esbuild({
    entryPoints: ["server/vercel.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: resolve(root, "dist/vercel.cjs"),
    define: { "process.env.NODE_ENV": '"production"' },
    minify: true,
    external: ["pg-native", "bufferutil", "utf-8-validate"],
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
