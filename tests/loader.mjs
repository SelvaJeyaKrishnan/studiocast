import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve as pathResolve, dirname } from "node:path";
import { existsSync } from "node:fs";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/headers") {
    try {
      return nextResolve("next/headers.js", context);
    } catch {
      // Fallback
    }
  }

  // Handle @/* alias
  if (specifier.startsWith("@/")) {
    const subpath = specifier.slice(2);
    const basePath = pathResolve(process.cwd(), "src", subpath);

    const candidates = [
      basePath,
      `${basePath}.ts`,
      `${basePath}.tsx`,
      pathResolve(basePath, "index.ts"),
      pathResolve(basePath, "index.tsx"),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }
  }

  // Handle relative imports without extensions like './env' or '../config'
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parentPath = context.parentURL ? dirname(fileURLToPath(context.parentURL)) : process.cwd();
    const resolvedPath = pathResolve(parentPath, specifier);

    const candidates = [
      resolvedPath,
      `${resolvedPath}.ts`,
      `${resolvedPath}.tsx`,
      `${resolvedPath}.js`,
      `${resolvedPath}.mjs`,
      pathResolve(resolvedPath, "index.ts"),
      pathResolve(resolvedPath, "index.tsx"),
      pathResolve(resolvedPath, "index.js"),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }
  }

  return nextResolve(specifier, context);
}
