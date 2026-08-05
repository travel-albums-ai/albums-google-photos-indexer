import fsp from "node:fs/promises";

export async function readJsonSafe(file) {
  try {
    const raw = await fsp.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return { _error: "invalid_json", _path: file, _cause: err?.message };
  }
}
