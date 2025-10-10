// netlify/functions/generate-image.js
import fetch from "node-fetch";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors };
  }

  try {
    const { prompt = "A cute panda playing guitar" } = JSON.parse(event.body || "{}");
    if (!prompt) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Missing prompt" }) };
    }

    const key = process.env.GOOGLE_API_KEY;
    if (!key) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Missing GOOGLE_API_KEY" }) };
    }

    // 直接使用「image 專用」的 endpoint，不要帶 tools
    const model = "models/gemini-2.5-flash-image-preview"; // 你已驗證清單裡確實有
    const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateImage?key=${key}`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: { text: prompt },
        // 不要放 tools / generation_config.response_mime_type 等會觸發 400 的欄位
      }),
    });

    const txt = await resp.text(); // 先拿純字串，方便除錯
    let data;
    try { data = JSON.parse(txt); } catch { 
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "Invalid JSON from API", raw: txt }) };
    }
    if (!resp.ok) {
      return { statusCode: resp.status, headers: cors, body: JSON.stringify(data) };
    }

    // 常見回傳：images[0].data 或 candidates[].content.parts[].inlineData.data
    let b64 = data?.images?.[0]?.data || null;
    if (!b64) {
      const parts = data?.candidates?.[0]?.content?.parts || [];
      for (const p of parts) {
        if (p?.inlineData?.data) { b64 = p.inlineData.data; break; }
        if (p?.fileData?.data)   { b64 = p.fileData.data;   break; }
        if (p?.blob?.data)       { b64 = p.blob.data;       break; }
      }
    }

    if (!b64) {
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "No image found in response", raw: data }) };
    }

    // 回傳 data URL，方便前端直接 <img src="...">
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ image: `data:image/png;base64,${b64}` }),
    };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: String(e) }) };
  }
};