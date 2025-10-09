const fetch = require('node-fetch');

exports.handler = async function(event) {
    try {
        const { textToSpeak } = JSON.parse(event.body);
        const API_KEY = process.env.GOOGLE_API_KEY; // 從 Netlify 環境變數讀取金鑰，安全！
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${API_KEY}`;

        const payload = {
          contents: [{ parts: [{ text: `Say clearly: ${textToSpeak}` }] }],
          generationConfig: { responseModalities: ["AUDIO"] }, model: "gemini-2.5-flash-preview-tts"
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

         if (!response.ok) {
            const errorData = await response.json();
            return { statusCode: response.status, body: JSON.stringify({ error: errorData.error?.message }) };
        }

        const result = await response.json();

        return {
            statusCode: 200,
            body: JSON.stringify(result) // 直接回傳 Google API 的完整結果
        };
    } catch (error) {
         return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};