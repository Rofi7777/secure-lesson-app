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

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ error: "Use POST method" }),
    };
  }

  try {
    const { prompt = "Create a 15-minute beginner sales English lesson with warm-up, key phrases, and role-play." } =
      JSON.parse(event.body || "{}");

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return {
        statusCode: 500,
        headers: cors,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
      };
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You are an expert English tutor. Always output valid JSON with keys: warm_up, key_phrases, and role_play. No explanation outside JSON.",
          },
          {
            role: "user",
            content: `${prompt} Please respond strictly in JSON format like this:\n{\n  "warm_up": "...",\n  "key_phrases": "...",\n  "role_play": "..." \n}`,
          },
        ],
        temperature: 0.7,
        max_output_tokens: 1000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: cors,
        body: JSON.stringify(data),
      };
    }

    // ✅ 改成兼容新版 Responses API 的解析邏輯
    let text =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      data.choices?.[0]?.message?.content ||
      "";

    let lesson = {};
    try {
      lesson = JSON.parse(text);
    } catch {
      lesson = { warm_up: text || "(No content)", key_phrases: "", role_play: "" };
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ lesson }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: String(err) }),
    };
  }
};