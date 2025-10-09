const fetch = require('node-fetch');

exports.handler = async function(event) {
    try {
        const { systemPrompt, userPrompt, responseMimeType } = JSON.parse(event.body);
        const API_KEY = process.env.GOOGLE_API_KEY; // 從 Netlify 環境變數讀取金鑰，安全！
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;

        const payload = {
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: { responseMimeType }
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
        const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        // --- 新增的錯誤處理與清理步驟 ---
        if (!rawText) {
            throw new Error("AI did not return any text.");
        }

        // 使用正規表示式從回傳的文字中找出 JSON 物件
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const cleanedText = jsonMatch ? jsonMatch[0] : '{}'; // 如果找不到，就回傳一個空的 JSON

        // ---------------------------------

        return {
            statusCode: 200,
            // 將清理過的純淨 JSON 字串回傳給前端
            body: JSON.stringify({ text: cleanedText })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};