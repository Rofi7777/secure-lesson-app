// netlify/functions/generate-lesson-with-audio.js
// 完整版：多語課程 + OpenAI Responses + TTS（可選用 Blobs 快取）+ CORS/錯誤處理
// 立即可跑：預設停用 Blobs（以免 401），要啟用把環境變數 DISABLE_BLOBS=0 或移除

import OpenAI from "openai";
import crypto from "crypto";
import { getStore } from "@netlify/blobs"; // 若 DISABLE_BLOBS=1 就不會使用

// ---------- CORS ----------
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ---------- 小工具 ----------
const ok = (body) => ({ statusCode: 200, headers: CORS, body: JSON.stringify(body) });
const bad = (code, msg) => ({ statusCode: code, headers: CORS, body: JSON.stringify({ error: msg }) });
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);

// 安全解析：把 ```json ... ``` 或 ``` 包起來的內容剝掉再 JSON.parse
function parseStrictJSON(maybe) {
  if (!maybe) return null;
  const cleaned = String(maybe)
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// ----------（可選）Blobs 快取 ----------
const DISABLE_BLOBS = process.env.DISABLE_BLOBS === "1" || process.env.DISABLE_BLOBS === "true";

function getBlobStore() {
  const name = "lesson-audio";
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_API_TOKEN;

  // 本機需要手動 siteID + token；雲端自帶
  if (siteID && token) {
    return getStore({ name, siteID, token, consistency: "strong" });
  }
  return getStore({ name, consistency: "strong" });
}

async function getCachedAudioB64(lang, ttsText) {
  if (DISABLE_BLOBS) return null;
  try {
    const store = getBlobStore();
    const key = `tts/${lang}/${hash(ttsText)}.mp3`;
    const cached = await store.get(key);
    if (!cached) return null;
    const buf = Buffer.from(await cached.body.arrayBuffer());
    return `data:audio/mpeg;base64,${buf.toString("base64")}`;
  } catch {
    return null; // 有問題直接略過快取
  }
}

async function setCachedAudioB64(lang, ttsText, b64) {
  if (DISABLE_BLOBS) return;
  try {
    const store = getBlobStore();
    const key = `tts/${lang}/${hash(ttsText)}.mp3`;
    const buf = Buffer.from(b64, "base64");
    await store.set(key, buf, { contentType: "audio/mpeg" });
  } catch {
    // 寫失敗不影響主流程
  }
}

// ---------- OpenAI ----------
function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  return new OpenAI({ apiKey });
}

// 生成英文版課程（純文字）
async function generateBaseLesson(openai, topic) {
  const prompt = `
Create a concise 15-minute beginner sales English mini-lesson in English.

Return a simple, readable outline (plain text, not JSON) with these sections:
- Warm-up: 1 short paragraph (max 2 sentences).
- Key phrases: 8 short bullet points (one phrase each).
- Role-play: 1 short paragraph (max 3 sentences).

Topic: ${topic}
`.trim();

  const r = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
  });
  return r.output_text?.trim() || "(No content)";
}

// 轉成指定語言 + 輸出 JSON 結構
async function translateToLanguage(openai, lessonText, lang) {
  const prompt = `
Reformat the following lesson into STRICT JSON with keys:
{
  "warm_up": "<one short paragraph (max 2 sentences)>",
  "key_phrases": ["<8 short phrases>"],
  "role_play": "<one short paragraph (max 3 sentences)>"
}

Translate all content to language code: ${lang}.
Do not include any commentary or code fences. Output JSON ONLY.

Lesson:
${lessonText}
`.trim();

  const r = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
  });

  const raw = r.output_text?.trim() || "";
  const json = parseStrictJSON(raw);
  if (!json || !json.warm_up || !Array.isArray(json.key_phrases) || !json.role_play) {
    // 退而求其次：若解析不到 JSON，就包在 fallback 結構
    return {
      warm_up: "Start the lesson with a short greeting.",
      key_phrases: [
        "Hello, how can I help you?",
        "Are you looking for something?",
        "This product is popular.",
        "It is a good price.",
        "Would you like to try it?",
        "Do you have any questions?",
        "Thank you for your time.",
        "Have a nice day!",
      ],
      role_play: "One student is the salesperson and the other is the customer. Practice greeting, offering help, and closing.",
      _raw: raw,
    };
  }
  return json;
}

// TTS：用 OpenAI 直出 mp3（base64）
async function synthesize(openai, text, { voice = "alloy", format = "mp3" } = {}) {
  // gpt-4o-mini-tts 支援 TTS
  const res = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice,
    input: text,
    format, // "mp3"
  });
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}

// 為 TTS 準備語音稿（把 warm_up/phrases/role_play 串成自然朗讀）
function buildTTSScript(lesson) {
  const phrases = (lesson.key_phrases || []).slice(0, 8).join("; ");
  return [
    lesson.warm_up || "",
    phrases ? `Key phrases: ${phrases}.` : "",
    lesson.role_play || "",
  ]
    .filter(Boolean)
    .join(" ");
}

// ---------- Netlify handler ----------
export const handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };

    if (event.httpMethod !== "POST") {
      return bad(405, "Method Not Allowed. Use POST.");
    }

    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return bad(400, "Invalid JSON body.");
    }

    const {
      topic = "15-minute beginner sales English",
      languages = ["en", "zh-TW"],
      includeAudio = true,
      voice = "alloy",
    } = payload;

    const openai = getClient();

    // 1) 先產生英文基礎課程（文字版）
    const baseLessonText = await generateBaseLesson(openai, topic);

    // 2) 逐語言轉換成結構化 JSON
    const results = {};
    for (const lang of languages) {
      // en 也走同樣流程，能拿到結構化 JSON
      results[lang] = await translateToLanguage(openai, baseLessonText, lang);
    }

    // 3) 視需要產生 TTS（有快取就讀）
    const audio = {};
    if (includeAudio) {
      for (const lang of languages) {
        const ttsText = buildTTSScript(results[lang]).slice(0, 1600); // 避免太長
        let b64 = await getCachedAudioB64(lang, ttsText);
        if (!b64) {
          const mp3b64 = await synthesize(openai, ttsText, { voice, format: "mp3" });
          b64 = `data:audio/mpeg;base64,${mp3b64}`;
          // 寫入快取（若啟用）
          await setCachedAudioB64(lang, ttsText, mp3b64);
        }
        audio[lang] = b64;
      }
    }

    return ok({
      topic,
      languages,
      lessons: results,
      ...(includeAudio ? { audio } : {}),
      meta: {
        blobsCaching: !DISABLE_BLOBS,
      },
    });
  } catch (e) {
    // 盡量回傳可讀訊息
    const msg = e?.message || String(e);
    return bad(500, msg);
  }
};