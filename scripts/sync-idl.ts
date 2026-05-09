import fs from "node:fs";
import path from "node:path";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

const repoRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(repoRoot, "target", "idl", "construkt.json");
const targetPath = path.join(repoRoot, "app", "src", "idl", "construkt.json");

const toCamelCase = (value: string): string =>
  value.replace(/_([a-z0-9])/g, (_, ch: string) => ch.toUpperCase());

const shouldTransformString = (key: string, value: string): boolean => {
  if (!value.includes("_")) {
    return false;
  }
  // If future Anchor IDL versions add new string fields that need camelCase,
  // extend this allowlist deliberately instead of rewriting unrelated strings.
  return key === "name" || key === "path";
};

const transform = (value: JsonValue, parentKey?: string): JsonValue => {
  if (Array.isArray(value)) {
    return value.map((entry) => transform(entry));
  }

  if (typeof value === "string") {
    if (parentKey && shouldTransformString(parentKey, value)) {
      return toCamelCase(value);
    }
    return value;
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const next: Record<string, JsonValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    next[key] = transform(entry, key);
  }
  return next;
};

if (!fs.existsSync(sourcePath)) {
  throw new Error(
    `IDL source is missing at ${sourcePath}. Run \`anchor build\` first.`
  );
}

const raw = fs.readFileSync(sourcePath, "utf8");
const parsed = JSON.parse(raw) as JsonValue;
const transformed = transform(parsed);
const next = `${JSON.stringify(transformed, null, 2)}\n`;
const prev = fs.existsSync(targetPath)
  ? fs.readFileSync(targetPath, "utf8")
  : "";

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
if (next !== prev) {
  fs.writeFileSync(targetPath, next, "utf8");
  console.log(
    `Synced IDL: ${path.relative(repoRoot, sourcePath)} -> ${path.relative(
      repoRoot,
      targetPath
    )}`
  );
} else {
  console.log("IDL already in sync.");
}
