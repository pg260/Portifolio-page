// Copia ai-kit/skills/* para .claude/skills/ e ai-kit/mcp.json para .mcp.json
// (Claude Code só carrega skills e MCPs desses caminhos).
// Uso: npm run ai-kit:install   (idempotente; sobrescreve a versão anterior)
import { cpSync, mkdirSync, readdirSync, rmSync, existsSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "ai-kit", "skills");
const dest = join(root, ".claude", "skills");

mkdirSync(dest, { recursive: true });
for (const name of readdirSync(src)) {
  const target = join(dest, name);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  cpSync(join(src, name), target, { recursive: true });
  console.log("✔ .claude/skills/" + name);
}
copyFileSync(join(root, "ai-kit", "mcp.json"), join(root, ".mcp.json"));
console.log("✔ .mcp.json");
console.log("\nKit instalado. Abra o projeto no Claude Code e as skills aparecem em /skills.");
