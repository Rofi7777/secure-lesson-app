// netlify/functions/generate-audio.js
import fetch from "node-fetch";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Use POST" }) };
  }

  try {
    const { text = "Hello! Welcome to today’s lesson." } = JSON.parse(event.body || "{}");
    const key = process.env.GOOGLE_API_KEY;
    if (!key) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Missing GOOGLE_API_KEY" }) };

    // ✅ 先用最穩定的 TTS 模型；若不行再改成 gemini-1.5-flash-8b-tts 或 gemini-2.5-pro-preview-tts
    const model = "models/gemini-2.0-flash-tts";
    const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${key}`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text }]}],
        generationConfig: {
          // ✅ TTS 一定要設，建議 wav 或 ogg
          response_mime_type: "audio/wav",
          // 有的帳號可設 voice（字串），不支援就忽略
          // voice: "Puck"
        },
      }),
    });

    const txt = await resp.text();
    let data;
    try { data = JSON.parse(txt); } catch {
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "Invalid JSON from API", raw: txt }) };
    }
    if (!resp.ok) {
      return { statusCode: resp.status, headers: cors, body: JSON.stringify(data) };
    }

    // ✅ 掃描所有 parts，找第一個音訊片段
    const parts = data?.candidates?.[0]?.content?.parts || [];
    let b64 = null, mime = "audio/wav";

    for (const p of parts) {
      const inline = p?.inlineData;
      if (inline?.data && typeof inline?.mimeType === "string" && inline.mimeType.startsWith("audio/")) {
        b64 = inline.data;
        mime = inline.mimeType; // 以 API 實際回傳為準
        break;
      }
    }

    if (!b64) {
      // 把原始回應丟回去，方便你/我對欄位
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "No audio in response", raw: data }) };
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ audio: `data:${mime};base64,${b64}` }),
    };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: String(e) }) };
  }
};