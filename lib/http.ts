/** Enforce limits on bytes actually received, including chunked requests. */
export async function limitedBody(request: Request, maxBytes: number) {
  if (Number(request.headers.get("content-length") || 0) > maxBytes)
    throw new Error("400: Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("400: Request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function jsonBody(request: Request, maxBytes = 20000) {
  try {
    const bytes = await limitedBody(request, maxBytes);
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("400: Expected a JSON object.");
    return value;
  } catch (e) {
    if (e instanceof SyntaxError) throw new Error("400: Invalid JSON request.");
    throw e;
  }
}
