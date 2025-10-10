// netlify/functions/audio.js
import { getStore } from "@netlify/blobs";

const isNetlify = !!process.env.NETLIFY;
const SITE_ID = process.env.NETLIFY_SITE_ID;
const API_TOKEN = process.env.NETLIFY_API_TOKEN;

const getAudioStore = async () => {
  return isNetlify
    ? await getStore({ name: "audio" })
    : await getStore({ name: "audio", siteID: SITE_ID, token: API_TOKEN });
};

export const handler = async (event) => {
  try {
    const id = event.queryStringParameters?.id;
    if (!id) return { statusCode: 400, body: "Missing id" };

    const store = await getAudioStore();
    const buf = await store.get(id, { type: "buffer" });
    if (!buf) return { statusCode: 404, body: "Not found" };

    const ct = id.endsWith(".mp3") ? "audio/mpeg"
             : id.endsWith(".wav") ? "audio/wav"
             : "application/octet-stream";

    return {
      statusCode: 200,
      headers: { "Content-Type": ct, "Cache-Control": "public, max-age=31536000, immutable" },
      body: buf.toString("base64"),
      isBase64Encoded: true
    };
  } catch (e) {
    return { statusCode: 500, body: String(e) };
  }
};