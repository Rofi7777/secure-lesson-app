// netlify/functions/generate-lesson-with-audio.js
import OpenAI from "openai";

// ──────────────────────────────────────────────────────────
// 基礎：CORS 與回傳工具
// ──────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",          // 同域就沒差，跨網域時可改成你的網域
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const ok = (obj) => ({
  statusCode: 200,
  headers: { ...CORS, "Content-Type": "application/json" },
  body: JSON.stringify(obj),
});

const err = (status, message) => ({
  statusCode: status,
  headers: { ...CORS, "Content-Type": "application/json" },
  body: JSON.stringify({ error: message }),
});

export const handler = async (event) => {
  try {
    // 處理瀏覽器預檢
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };

    if (event.httpMethod !== "POST") {
      return err(405, "Method Not Allowed. Use POST.");
    }

    // 解析輸入：{ topic, languages: ['en','zh-TW',...], includeAudio: true/false }
    const { topic, languages = ["en"], includeAudio = true } =
      JSON.parse(event.body || "{}");

    if (!topic || !Array.isArray(languages) || languages.length === 0) {
      return err(400, "Missing required fields: topic, languages[]");
    }

    // OpenAI client
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return err(500, "Missing OPENAI_API_KEY");
    const openai = new OpenAI({ apiKey });

    // ──────────────────────────────────────────────────────
    // 1. 先用 Responses API 生成一份英文課程（之後再做多語翻譯）
    // ──────────────────────────────────────────────────────
    const englishPlanPrompt = `
You are an ESL lesson designer. Create a concise 15-minute beginner sales English lesson.
Return JSON with keys: warm_up (<=2 sentences), key_phrases (array of 8 short phrases), role_play (1 short paragraph).
Topic: ${topic}
Language: English
JSON ONLY.
    `.trim();

    const baseResp = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: englishPlanPrompt,
      text: { format: "json" }, // Responses API 的新參數，取代舊的 response_format
    });

    // Responses API 文字輸出
    const baseJsonText = baseResp.output_text ?? "";
    let baseLesson;
    try {
      baseLesson = JSON.parse(baseJsonText);
    } catch {
      return err(500, "LLM returned non-JSON content for base lesson.");
    }

    // ──────────────────────────────────────────────────────
    // 2. 多語翻譯：把英文課程轉成各語言 (warm_up / key_phrases[] / role_play)
    // ──────────────────────────────────────────────────────
    async function translateTo(lang, lessonObj) {
      const translatePrompt = `
Reformat the following lesson JSON into ${lang}.
Preserve the same keys: warm_up, key_phrases[], role_play.
Return JSON ONLY.

Lesson (English):
${JSON.stringify(lessonObj, null, 2)}
      `.trim();

      const r = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: translatePrompt,
        text: { format: "json" },
      });

      const text = r.output_text ?? "";
      try {
        return JSON.parse(text);
      } catch {
        // 若 LLM 有時包了 code fence，做個保險處理
        const cleaned = text
          .replace(/^```json\s*/i, "")
          .replace(/```$/i, "")
          .trim();
        return JSON.parse(cleaned);
      }
    }

    const lessons = {};
    for (const lang of languages) {
      if (lang.toLowerCase() === "en") {
        lessons[lang] = baseLesson; // 英文就用原始
      } else {
        lessons[lang] = await translateTo(lang, baseLesson);
      }
    }

    // ──────────────────────────────────────────────────────
    // 3.（可選）TTS：把每個語言的一小段文字轉語音（無 Blobs 快取）
    //    - 若你要更自然可改成 gpt-4o-mini-tts；這裡用 OpenAI Audio TTS。
    // ──────────────────────────────────────────────────────
    async function ttsBase64(shortText, voiceLang) {
      // 選擇 voice，英文可用 "alloy"，中文可用 "verse" 等，簡化處理：
      const voice = voiceLang.toLowerCase().startsWith("zh") ? "verse" : "alloy";

      // 使用 Audio generation (Text-to-Speech)
      // 這裡用 "gpt-4o-mini-tts" 生成 mp3 的 base64
      const audio = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice,
        input: shortText,
        format: "mp3",          // 也可 "wav"/"ogg"
      });

      // SDK 回來的是 ArrayBuffer
      const buf = Buffer.from(await audio.arrayBuffer());
      return `data:audio/mp3;base64,${buf.toString("base64")}`;
    }

    const audio = {};
    if (includeAudio) {
      // 每種語言挑一小段（warm_up + 首句 key phrase）做 TTS
      for (const lang of languages) {
        const l = lessons[lang] || {};
        const textForTTS =
          [l?.warm_up, Array.isArray(l?.key_phrases) ? l.key_phrases[0] : ""]
            .filter(Boolean)
            .join("  ");
        if (!textForTTS) continue;
        audio[lang] = await ttsBase64(textForTTS, lang);
      }
    }

    // ──────────────────────────────────────────────────────
    // 4. 回傳
    // ──────────────────────────────────────────────────────
    return ok({ topic, languages, lessons, audio });
  } catch (e) {
    return err(500, String(e));
  }
};