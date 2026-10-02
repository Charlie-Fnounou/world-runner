// TEMPORARY: generates product-photo variants through Vercel AI Gateway.
// Remove once the photos are committed.
import { readFile } from "node:fs/promises";
import path from "node:path";

export const maxDuration = 300;

const SECRET = "fl-gen-7c2d9a41e8";

export async function POST(req: Request) {
  if (req.headers.get("x-gen-secret") !== SECRET) return new Response("no", { status: 403 });
  const { model, prompt, refs } = (await req.json()) as { model: string; prompt: string; refs: string[] };
  const token = req.headers.get("x-vercel-oidc-token") ?? process.env.VERCEL_OIDC_TOKEN;
  if (!token) return Response.json({ error: "no oidc token" }, { status: 500 });
  const images = await Promise.all(
    refs.map(async (r) => {
      const buf = await readFile(path.join(process.cwd(), "public", "products", path.basename(r)));
      return { type: "image_url", image_url: { url: `data:image/webp;base64,${buf.toString("base64")}` } };
    }),
  );
  const res = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      modalities: ["text", "image"],
      messages: [{ role: "user", content: [{ type: "text", text: prompt }, ...images] }],
    }),
  });
  const text = await res.text();
  return new Response(text, { status: res.status, headers: { "content-type": "application/json" } });
}
