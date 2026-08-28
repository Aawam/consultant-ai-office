import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const modules = [
  {
    directory: "apps/office-web",
    packageName: "@consultant-ai-office/office-web",
    sourceDirectory: "app",
    allowed: [
      "@consultant-ai-office/application",
      "@consultant-ai-office/shared-contracts",
    ],
  },
  {
    directory: "packages/application",
    packageName: "@consultant-ai-office/application",
    sourceDirectory: "src",
    allowed: [
      "@consultant-ai-office/domain",
      "@consultant-ai-office/rab-calculation-engine",
      "@consultant-ai-office/shared-contracts",
    ],
  },
  {
    directory: "packages/domain",
    packageName: "@consultant-ai-office/domain",
    sourceDirectory: "src",
    allowed: ["@consultant-ai-office/shared-contracts"],
  },
  {
    directory: "packages/rab-calculation-engine",
    packageName: "@consultant-ai-office/rab-calculation-engine",
    sourceDirectory: "src",
    allowed: [
      "@consultant-ai-office/domain",
      "@consultant-ai-office/shared-contracts",
    ],
  },
  {
    directory: "packages/ai-agent",
    packageName: "@consultant-ai-office/ai-agent",
    sourceDirectory: "src",
    allowed: [
      "@consultant-ai-office/application",
      "@consultant-ai-office/shared-contracts",
    ],
  },
  {
    directory: "packages/infrastructure",
    packageName: "@consultant-ai-office/infrastructure",
    sourceDirectory: "src",
    allowed: [
      "@consultant-ai-office/application",
      "@consultant-ai-office/domain",
      "@consultant-ai-office/shared-contracts",
    ],
  },
  {
    directory: "packages/shared-contracts",
    packageName: "@consultant-ai-office/shared-contracts",
    sourceDirectory: "src",
    allowed: [],
  },
];

async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(entryPath)));
    } else if (/\.(?:ts|tsx)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

function importedSpecifiers(source) {
  const imports = [];
  const pattern = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) {
    if (match[1]) imports.push(match[1]);
  }
  return imports;
}

const errors = [];

for (const workspaceModule of modules) {
  const moduleRoot = path.join(repositoryRoot, workspaceModule.directory);
  const manifest = JSON.parse(
    await readFile(path.join(moduleRoot, "package.json"), "utf8"),
  );
  const internalDependencies = Object.keys(manifest.dependencies ?? {}).filter(
    (dependency) => dependency.startsWith("@consultant-ai-office/"),
  );

  for (const dependency of internalDependencies) {
    if (!workspaceModule.allowed.includes(dependency)) {
      errors.push(
        `${workspaceModule.packageName} declares forbidden dependency ${dependency}`,
      );
    }
  }

  const sourceRoot = path.join(moduleRoot, workspaceModule.sourceDirectory);
  for (const sourceFile of await listSourceFiles(sourceRoot)) {
    const source = await readFile(sourceFile, "utf8");

    for (const specifier of importedSpecifiers(source)) {
      if (
        specifier.startsWith("@consultant-ai-office/") &&
        !workspaceModule.allowed.includes(specifier)
      ) {
        errors.push(
          `${path.relative(repositoryRoot, sourceFile)} imports forbidden module ${specifier}`,
        );
      }

      if (specifier.startsWith(".")) {
        const resolved = path.resolve(path.dirname(sourceFile), specifier);
        const staysInsideModule =
          resolved === moduleRoot || resolved.startsWith(`${moduleRoot}${path.sep}`);
        if (!staysInsideModule) {
          errors.push(
            `${path.relative(repositoryRoot, sourceFile)} escapes its module with ${specifier}`,
          );
        }
      }
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`BOUNDARY ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Module boundaries valid for ${modules.length} workspace modules.`);
}
