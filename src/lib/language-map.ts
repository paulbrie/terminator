const EXT_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript", tsx: "typescriptreact",
  js: "javascript", jsx: "javascriptreact",
  rs: "rust", py: "python", go: "go",
  json: "json", jsonc: "json",
  md: "markdown", mdx: "markdown",
  html: "html", htm: "html",
  css: "css", scss: "scss", less: "less",
  toml: "toml", yaml: "yaml", yml: "yaml",
  sh: "shell", bash: "shell", zsh: "shell",
  sql: "sql", graphql: "graphql",
  xml: "xml", svg: "xml",
  c: "c", cpp: "cpp", h: "c", hpp: "cpp",
  java: "java", kt: "kotlin", swift: "swift",
  rb: "ruby", php: "php", lua: "lua",
  dockerfile: "dockerfile",
  makefile: "makefile",
};

export function getLanguageFromPath(filePath: string): string {
  const name = filePath.split("/").pop()?.toLowerCase() ?? "";
  // Check full filename first (Dockerfile, Makefile, etc.)
  if (EXT_TO_LANGUAGE[name]) return EXT_TO_LANGUAGE[name];
  const ext = name.split(".").pop() ?? "";
  return EXT_TO_LANGUAGE[ext] ?? "plaintext";
}
