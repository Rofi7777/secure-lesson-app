window.App = window.App || {};

App.api = {
    // Auth token helper - returns null in internal mode
    async getAuthToken() {
        return null;
    },

    // --- API Call Functions ---
    async handleApiError(response) {
        let errorBody;
        const contentType = response.headers.get('content-type');
        try {
             if (contentType && contentType.includes('application/json')) {
                errorBody = await response.json();
                const message = errorBody.error?.message || JSON.stringify(errorBody);
                return new Error(`API Error (${response.status}): ${message}`);
            } else {
                errorBody = await response.text();
                // Attempt to parse text as JSON if it looks like it, otherwise return plain text
                if (errorBody && errorBody.trim().startsWith('{')) {
                   try {
                       errorBody = JSON.parse(errorBody);
                       const message = errorBody.error?.message || JSON.stringify(errorBody);
                       return new Error(`API Error (${response.status}): ${message}`);
                   } catch (parseError) {
                       // If parsing fails, use the raw text, ensuring it's not empty
                       return new Error(`API Error (${response.status}): ${errorBody || response.statusText}`);
                   }
                } else {
                     // Return raw text or status text if body is empty
                    return new Error(`API Error (${response.status}): ${errorBody || response.statusText}`);
                }
            }
        } catch (e) {
            // Fallback if reading the body fails, return status text
            console.error("Failed to parse error response body:", e);
            return new Error(`API Error (${response.status}): ${response.statusText}`);
        }
    },

    async callGeminiAPI(prompt, systemPrompt = "", base64Image = null, model = "gemini-2.5-flash", usePersonalization = true) {
        const apiUrl = `${App.config.GEMINI_API_BASE}/${model}:generateContent?key=${App.config.GEMINI_API_KEY}`;

        const parts = [{ text: prompt }];
        if (base64Image) {
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Image
                }
            });
        }

        const payload = {
            contents: [{ role: "user", parts: parts }],
        };

        if(systemPrompt){
            payload.systemInstruction = {
                parts: [{ text: systemPrompt }]
            };
        }

        try {
            let response;
            let result;
            let retries = 3;
            let delay = 1000;

            while (retries > 0) {
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    result = await response.json();
                    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        return text; // Success
                    } else {
                         // Check for safety ratings or other non-text response
                         if (result.candidates && result.candidates[0].finishReason !== 'STOP') {
                             throw new Error(`API request stopped: ${result.candidates[0].finishReason}`);
                         }
                         throw new Error("No content returned from API.");
                    }
                } else if (response.status === 429 || response.status >= 500) {
                    // Throttling or server error, retry
                    retries--;
                    if (retries === 0) {
                       throw await this.handleApiError(response);
                    }
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Exponential backoff
                } else {
                    // Other client-side error, don't retry
                    throw await this.handleApiError(response);
                }
            }
        } catch (error) {
            console.error("Gemini API Error:", error);
            throw error;
        }
    },

    async callTTSAPI(text, button = null, options = {}) {
        if (button) {
            button.classList.add('loading');
        }
        try {
            const ttsModel = 'gemini-2.5-flash-preview-tts'; // TTS still in preview
            const apiUrl = `${App.config.GEMINI_API_BASE}/${ttsModel}:generateContent?key=${App.config.GEMINI_API_KEY}`;
            const speechProfile = options.speechProfile || null;
            const voiceCandidates = Array.from(new Set([options.voiceName || App.config.voiceProfiles.default, App.config.voiceProfiles.default]));
            const rateCandidates = speechProfile?.apiRate ? [speechProfile.apiRate, null] : [null];

            const requestTTS = async (voiceName, speakingRate) => {
                const speechConfig = {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName }
                    }
                };
                if (typeof speakingRate === 'number') {
                    speechConfig.speakingRate = speakingRate;
                }
                const payload = {
                    contents: [{ parts: [{ text }] }],
                    generationConfig: {
                        responseModalities: ["AUDIO"],
                        speechConfig
                    }
                };

                let retries = 3;
                let delay = 1000;
                while (retries > 0) {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) {
                        const result = await response.json();
                        const part = result?.candidates?.[0]?.content?.parts?.[0];
                        const audioData = part?.inlineData?.data;
                        const mimeType = part?.inlineData?.mimeType || '';

                        if (audioData && mimeType.startsWith("audio/")) {
                            const byteCharacters = atob(audioData);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            const normalizedMime = mimeType.toLowerCase();
                            if (normalizedMime.includes('pcm')) {
                                const rateMatch = mimeType.match(/rate=(\d+)/);
                                const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
                                const pcmLength = Math.floor(byteArray.byteLength / 2);
                                const pcmView = new DataView(byteArray.buffer);
                                const pcmData = new Int16Array(pcmLength);
                                for (let i = 0; i < pcmLength; i++) {
                                    pcmData[i] = pcmView.getInt16(i * 2, true);
                                }
                                return App.utils.pcmToWav(pcmData, sampleRate);
                            }
                            return new Blob([byteArray], { type: mimeType || 'audio/wav' });
                        } else {
                            if (result.candidates && result.candidates[0].finishReason !== 'STOP') {
                                throw new Error(`TTS request stopped: ${result.candidates[0].finishReason}`);
                            }
                            throw new Error("Invalid audio data received from API.");
                        }
                    } else if (response.status === 429 || response.status >= 500) {
                        retries--;
                        if (retries === 0) {
                            throw await App.api.handleApiError(response);
                        }
                        await new Promise(resolve => setTimeout(resolve, delay));
                        delay *= 2;
                    } else {
                        throw await App.api.handleApiError(response);
                    }
                }
            };

            let lastError;
            for (const voiceName of voiceCandidates) {
                for (const speakingRate of rateCandidates) {
                    try {
                        return await requestTTS(voiceName, speakingRate);
                    } catch (error) {
                        lastError = error;
                        console.warn(`TTS attempt failed (voice=${voiceName}, rate=${speakingRate ?? 'default'})`, error);
                    }
                }
            }

            if (lastError) {
                console.error("TTS API Error:", lastError);
                throw lastError;
            }
            throw new Error("Unknown TTS error");
        } finally {
            if (button) {
                button.classList.remove('loading');
            }
        }
    },

    async callImagenAPI(prompt) {
        const imagenModel = 'gemini-2.5-flash-image';
        const apiUrl = `${App.config.GEMINI_API_BASE}/${imagenModel}:generateContent?key=${App.config.GEMINI_API_KEY}`;
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        };
        try {
            let response;
            let result;
            let retries = 3;
            let delay = 1000;

            while (retries > 0) {
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                 if (response.ok) {
                    result = await response.json();
                    const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
                    if (base64Data) {
                        return `data:image/png;base64,${base64Data}`; // Success
                    } else {
                        // Check for safety ratings or other issues
                        if (result.candidates && result.candidates[0].finishReason !== 'STOP') {
                            throw new Error(`Image generation stopped: ${result.candidates[0].finishReason}`);
                        }
                        throw new Error("No image data returned from API.");
                    }
                } else if (response.status === 429 || response.status >= 500) {
                    // Throttling or server error, retry
                    retries--;
                    if (retries === 0) {
                       throw await this.handleApiError(response);
                    }
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Exponential backoff
                } else {
                    // Other client-side error, don't retry
                    throw await this.handleApiError(response);
                }
            }
        } catch (error) {
            console.error("Image Generation Error:", error);
            throw error;
        }
    }
};
