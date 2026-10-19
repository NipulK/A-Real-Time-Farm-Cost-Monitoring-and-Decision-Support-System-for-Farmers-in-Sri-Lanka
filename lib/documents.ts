import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { storage, run, Row } from "./db";
export async function checkedFile(
  value: FormDataEntryValue | null,
  required: boolean,
) {
  if (!(value instanceof File) || !value.size) {
    if (required)
      throw new Error("400: A land sketch image or scan is required.");
    return null;
  }
  if (value.size > 5 * 1024 * 1024)
    throw new Error("400: Each upload must be no larger than 5 MB.");
  const bytes = Buffer.from(await value.arrayBuffer());
  const mime =
    bytes.subarray(0, 5).toString() === "%PDF-"
      ? "application/pdf"
      : bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? "image/png"
        : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          ? "image/jpeg"
          : "";
  if (!mime)
    throw new Error(
      "400: Upload a PNG, JPEG or PDF scan. File content must match a supported format.",
    );
  return { bytes, mime, name: value.name.slice(0, 200), size: value.size };
}
export function storeDocument(
  file: NonNullable<Awaited<ReturnType<typeof checkedFile>>>,
  ownerId: string,
  orgId: string | null,
  landId: string | null,
  purpose: string,
  created: string[],
) {
  const id = randomUUID();
  mkdirSync(path.join(storage, "documents"), { recursive: true, mode: 0o700 });
  const target = path.join(storage, "documents", id);
  writeFileSync(target, file.bytes, { mode: 0o600 });
  created.push(target);
  run(
    "INSERT INTO documents VALUES(?,?,?,?,?,?,?,?,?,?)",
    id,
    ownerId,
    orgId,
    landId,
    purpose,
    file.name,
    file.mime,
    file.size,
    target,
    new Date().toISOString(),
  );
  return id;
}
export function removeCreated(paths: string[]) {
  for (const p of paths)
    try {
      unlinkSync(p);
    } catch {}
}
