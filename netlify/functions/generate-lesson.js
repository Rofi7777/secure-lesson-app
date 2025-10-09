const fetch = require('node-fetch');

exports.handler = async function(event) {
    const API_KEY = process.env.GOOGLE_API_KEY; // 讀取環境變數

    // --- 最終除錯步驟 ---
    // 如果在伺服器上找不到名為 GOOGLE_API_KEY 的環境變數，就立刻回傳錯誤
    if (!API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "SERVER ERROR: The GOOGLE_API_KEY environment variable was not found on Netlify's server. Please double check the variable name and that it is set for the correct project." })
        };
    }
    // --- 除錯結束 ---

    try {
        const { systemPrompt, userPrompt, responseMimeType } = JSON.parse(event.body);
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
            // 如果金鑰本身是錯的 (例如過期或權限不足)，會在這裡顯示 Google 的錯誤
            return { statusCode: response.status, body: JSON.stringify({ error: `Google API Error: ${errorData.error?.message}` }) };
        }

        const result = await response.json();
        const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
            throw new Error("AI did not return any text.");
        }

        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const cleanedText = jsonMatch ? jsonMatch[0] : '{}';

        return {
            statusCode: 200,
            body: JSON.stringify({ text: cleanedText })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: `Catch Block Error: ${error.message}` }) };
    }
};