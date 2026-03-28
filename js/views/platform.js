window.App = window.App || {};
App.views = App.views || {};

App.views.platform = {

    // --- Private helpers ---

    _getCustomTopicOptionText: function() {
        return App.translations[App.state.currentLang]?.topicCustomOption || App.translations['en']?.topicCustomOption || 'Custom topic';
    },

    _getCustomTopicErrorText: function() {
        return App.translations[App.state.currentLang]?.topicCustomError || App.translations['en']?.topicCustomError || 'Please enter your custom topic.';
    },

    // --- Audio helpers ---

    getAudioButtonKey: function(button) {
        if (!button.dataset.audioKey) {
            App.state.audioButtonCounter += 1;
            button.dataset.audioKey = 'audio-' + App.state.audioButtonCounter;
        }
        return button.dataset.audioKey;
    },

    cacheGeneratedAudio: function(key, blob) {
        const existing = App.state.generatedAudioCache.get(key);
        if (existing && existing.url) {
            URL.revokeObjectURL(existing.url);
        }
        const url = URL.createObjectURL(blob);
        App.state.generatedAudioCache.set(key, { blob: blob, url: url, updatedAt: Date.now() });
        return url;
    },

    ensureDownloadButton: function(button) {
        let downloadBtn = button.nextElementSibling;
        if (!downloadBtn || !downloadBtn.classList.contains('download-audio-btn')) {
            downloadBtn = document.createElement('button');
            downloadBtn.type = 'button';
            downloadBtn.className = 'download-audio-btn hidden';
            downloadBtn.setAttribute('aria-label', 'Download audio');
            downloadBtn.title = 'Download audio';
            downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
            button.insertAdjacentElement('afterend', downloadBtn);
        }
        downloadBtn.dataset.downloadKey = button.dataset.audioKey;
        return downloadBtn;
    },

    showDownloadButton: function(button) {
        if (!button || !button.isConnected) return;
        const downloadBtn = App.views.platform.ensureDownloadButton(button);
        downloadBtn.classList.remove('hidden');
    },

    getAudioErrorDisplay: function(element) {
        if (element.closest('#tutoring-results-view')) {
            return document.getElementById('tutoring-error-message');
        }
        if (element.closest('#storybook-main-view')) {
            return document.getElementById('storybook-error-message');
        }
        return document.getElementById('error-message');
    },

    triggerAudioDownload: function(downloadBtn) {
        const key = downloadBtn.dataset.downloadKey;
        const cache = App.state.generatedAudioCache.get(key);
        const errorDisplay = App.views.platform.getAudioErrorDisplay(downloadBtn);
        if (!cache) {
            App.utils.displayError(errorDisplay, 'Audio file not ready yet. Please play it once before downloading.');
            return;
        }
        const link = document.createElement('a');
        link.href = cache.url;
        link.download = 'tts-' + Date.now() + '.wav';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // --- Dialogue audio helpers ---

    splitTextIntoDialogueSentences: function(text) {
        if (!text) return [];
        const normalized = text.replace(/\r/g, '\n').trim();
        if (!normalized) return [];
        let sentences = normalized.match(/[^。！？!?…]+[。！？!?…]?/gu) || [];
        sentences = sentences.map((s) => s.trim()).filter(Boolean);
        if (sentences.length < 2) {
            const byLine = normalized.split(/\n+/).map((s) => s.trim()).filter(Boolean);
            if (byLine.length > sentences.length) sentences = byLine;
        }
        if (sentences.length < 2 && normalized.length > 40) {
            const mid = Math.floor(normalized.length / 2);
            const firstHalf = normalized.slice(0, mid).trim();
            const secondHalf = normalized.slice(mid).trim();
            sentences = [firstHalf, secondHalf].filter(Boolean);
        }
        return sentences.length ? sentences : [normalized];
    },

    generateDialogueAudio: async function(text, lang) {
        const sentences = App.views.platform.splitTextIntoDialogueSentences(text);
        const voiceOrder = ['female', 'male'];
        const speechProfile = App.utils.getLessonSpeechProfile(lang);
        const localeVoiceLabels = App.translations[App.state.currentLang]?.voiceLabels || {};
        const voiceProfiles = App.config.voiceProfiles;
        const segments = sentences.map((sentence, idx) => {
            const voiceKey = voiceOrder[idx % voiceOrder.length];
            const voiceName = voiceProfiles[voiceKey] || voiceProfiles.default;
            const labelPrefix = localeVoiceLabels[voiceKey] ? (localeVoiceLabels[voiceKey] + '\uFF1A') : '';
            return {
                text: labelPrefix + sentence,
                voiceName: voiceName
            };
        });
        const blobs = [];
        for (let i = 0; i < segments.length; i++) {
            const segmentBlob = await App.api.callTTSAPI(segments[i].text, null, { speechProfile: speechProfile, voiceName: segments[i].voiceName });
            blobs.push(segmentBlob);
        }
        return App.utils.concatWavBlobs(blobs);
    },

    // --- Vocabulary / Phrases HTML builders ---

    createVocabularyHtmlForLang: function(targetLang) {
        if (!App.state.currentLesson || !App.state.currentLesson.vocabulary) return '';
        const lang = targetLang || App.state.currentLang;
        return App.state.currentLesson.vocabulary.map((item) => {
            const translationText = (item.translation && item.translation[targetLang]) ? item.translation[targetLang] : item.word;
            const phoneticHTML = item.phonetic ? '<p class="text-sm text-cyan-300">/<span data-translate-key="phoneticLabel">' + App.translations[lang].phoneticLabel + '</span>: ' + item.phonetic + '/</p>' : '';

            const exampleSentence = (item.example_sentence && typeof item.example_sentence === 'object' && item.example_sentence[targetLang])
                ? item.example_sentence[targetLang]
                : (item.example_sentence && typeof item.example_sentence === 'object' && item.example_sentence['en'])
                ? item.example_sentence['en']
                : (typeof item.example_sentence === 'string')
                ? item.example_sentence
                : '';

            const exampleHTML = exampleSentence ? '<p class="text-sm italic mt-2 text-indigo-200">"<span data-translate-key="exampleLabel">' + App.translations[lang].exampleLabel + '</span>: ' + exampleSentence + '"</p>' : '';

            const wordSpeechAttr = App.utils.encodeForDataAttr(item.word || translationText);
            const vocabAudioButton = wordSpeechAttr ? '\n' +
                '    <button class="play-audio-btn flex-shrink-0 ml-4" data-text-to-speak="' + wordSpeechAttr + '" data-lesson-lang="' + lang + '">\n' +
                '        <i class="fas fa-play"></i>\n' +
                '        <div class="audio-loader"></div>\n' +
                '    </button>' : '';

            return '\n' +
                '<div class="p-4 bg-white/10 rounded-lg flex justify-between items-start">\n' +
                '    <div class="flex-grow">\n' +
                '        <p class="font-bold text-lg text-yellow-300">' + item.word + '</p>\n' +
                '        ' + phoneticHTML + '\n' +
                '        <p class="text-sm mt-1 font-semibold">' + translationText + '</p>\n' +
                '        ' + exampleHTML + '\n' +
                '    </div>\n' +
                '    ' + vocabAudioButton + '\n' +
                '</div>';
        }).join('');
    },

    createPhrasesHtmlForLang: function(targetLang) {
        if (!App.state.currentLesson || !App.state.currentLesson.phrases) return '';
        const lang = targetLang || App.state.currentLang;
        return App.state.currentLesson.phrases.map((item) => {
            const translationText = (item.translation && item.translation[targetLang]) ? item.translation[targetLang] : item.phrase;
            const phraseSpeechAttr = App.utils.encodeForDataAttr(item.phrase || translationText);
            const phraseAudioButton = phraseSpeechAttr ? '\n' +
                '    <button class="play-audio-btn flex-shrink-0" data-text-to-speak="' + phraseSpeechAttr + '" data-lesson-lang="' + lang + '">\n' +
                '        <i class="fas fa-play"></i>\n' +
                '        <div class="audio-loader"></div>\n' +
                '    </button>' : '';
            return '\n' +
                '<div class="p-4 bg-white/10 rounded-lg flex justify-between items-center">\n' +
                '    <div>\n' +
                '        <p class="font-semibold text-lg text-yellow-300">' + item.phrase + '</p>\n' +
                '        <p class="text-sm mt-1">' + translationText + '</p>\n' +
                '    </div>\n' +
                '    ' + phraseAudioButton + '\n' +
                '</div>';
        }).join('');
    },

    // --- Main render function ---

    renderLesson: function() {
        if (!App.state.currentLesson) return;
        const lessonContainer = document.getElementById('lesson-container');
        const topicSelect = document.getElementById('topic-select');
        const customTopicInput = document.getElementById('custom-topic-input');

        const lang = document.getElementById('lesson-lang-tabs')?.querySelector('.active')?.dataset.lang || App.state.currentLang;
        const selectedTopicName = App.state.currentLesson.selectedTopicName || (topicSelect.value === '__custom__' ? (customTopicInput?.value.trim() || App.views.platform._getCustomTopicOptionText()) : topicSelect.value);

        const explanationLangTabsHTML = Object.entries(App.translations[App.state.currentLang].lessonLangTabs).map((entry) => {
            const key = entry[0], value = entry[1];
            return '<button class="lesson-lang-btn px-3 py-1 rounded-md text-sm ' + (key === App.state.currentLang ? 'active' : '') + '" data-lang="' + key + '">' + value + '</button>';
        }).join('');

        const isDialogueLesson = App.state.currentLessonType === '\u96D9\u4EBA\u535A\u5BA2';
        const voiceVariants = isDialogueLesson ? ['dialogue'] : ['default'];
        const voiceLabels = App.translations[App.state.currentLang].voiceLabels || {};

        const explanationAudioButtonsHTML = Object.entries(App.translations[App.state.currentLang].lessonLangTabs).map((entry) => {
            const key = entry[0], value = entry[1];
            return voiceVariants.map((voiceType) => {
                let template;
                if (voiceType === 'dialogue') {
                    template = App.translations[App.state.currentLang].genDialogueAudio || App.translations[App.state.currentLang].genAudio;
                } else if (voiceType === 'default') {
                    template = App.translations[App.state.currentLang].genAudio;
                } else {
                    template = App.translations[App.state.currentLang].genAudioVariant || App.translations[App.state.currentLang].genAudio;
                }
                const buttonText = template.replace('{lang}', value);
                if (buttonText.includes('{voice}')) {
                    buttonText = buttonText.replace('{voice}', voiceLabels?.[voiceType] || voiceType);
                } else if (voiceType !== 'default' && voiceType !== 'dialogue') {
                    buttonText = buttonText + ' (' + (voiceLabels?.[voiceType] || voiceType) + ')';
                }
                return '\n' +
                    '<button class="generate-explanation-audio-btn bg-white/20 hover:bg-white/30 text-white text-sm py-2 px-3 rounded-md flex items-center justify-center" data-lang="' + key + '" data-voice="' + voiceType + '">\n' +
                    '    <span class="btn-text">' + buttonText + '</span>\n' +
                    '    <div class="loader ml-2 hidden"></div>\n' +
                    '</button>';
            }).join('');
        }).join('');

        const explanationAudioSectionHTML = Object.entries(App.translations[App.state.currentLang].lessonLangTabs).map((entry) => {
            const key = entry[0], value = entry[1];
            return voiceVariants.map((voiceType) => {
                let downloadTemplate = App.translations[App.state.currentLang].downloadAudio;
                if (voiceType === 'dialogue') {
                    downloadTemplate = App.translations[App.state.currentLang].downloadDialogueAudio || downloadTemplate;
                }
                const downloadText = downloadTemplate.replace('{lang}', value);
                let voiceBadge = '';
                if (voiceType === 'dialogue') {
                    const badgeText = App.translations[App.state.currentLang].dialogueBadge || 'Dialogue';
                    voiceBadge = '<span class="text-xs uppercase tracking-wide text-indigo-200 font-semibold">' + badgeText + '</span>';
                } else if (voiceType !== 'default') {
                    voiceBadge = '<span class="text-xs uppercase tracking-wide text-indigo-200 font-semibold">' + (voiceLabels?.[voiceType] || voiceType) + '</span>';
                }
                return '\n' +
                    '<div id="audio-player-' + key + '-' + voiceType + '" class="hidden flex-col items-center gap-2">\n' +
                    '    ' + voiceBadge + '\n' +
                    '    <audio controls class="w-full"></audio>\n' +
                    '    <a href="#" class="download-link text-sm text-cyan-300 hover:underline">' + downloadText + '</a>\n' +
                    '</div>';
            }).join('');
        }).join('');

        lessonContainer.innerHTML =
            '<div class="bg-blue-900/10 backdrop-blur-md rounded-xl shadow-lg p-6 md:p-8 border-2 border-white/20 text-white space-y-8">' +
            '    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">' +
            '        <div>' +
            '            <h3 class="text-2xl font-bold mb-4 text-center">"' + selectedTopicName + '"</h3>' +
            '            <div class="flex justify-center flex-wrap gap-2 mb-4" id="lesson-lang-tabs">' +
            '                ' + explanationLangTabsHTML +
            '            </div>' +
            '            <p id="lesson-explanation" class="text-indigo-200 leading-relaxed min-h-[120px]">' + App.state.currentLesson.explanation[App.state.currentLang] + '</p>' +
            '            <div class="grid grid-cols-2 md:grid-cols-2 gap-2 mt-4" id="lesson-audio-buttons">' +
            '                ' + explanationAudioButtonsHTML +
            '            </div>' +
            '            <div class="mt-4 space-y-2">' +
            '                ' + explanationAudioSectionHTML +
            '            </div>' +
            '        </div>' +
            '        <div class="cursor-pointer">' +
            '            <h4 class="text-xl font-bold mb-4 text-center" data-translate-key="imageTitle">' + App.translations[lang].imageTitle + '</h4>' +
            '            <img id="lesson-image" src="' + (App.state.currentLesson.imageUrl || 'https://placehold.co/600x600/1e1b4b/9ca3af?text=Loading...') + '" alt="Lesson image" class="rounded-lg shadow-lg w-full aspect-square object-cover">' +
            '        </div>' +
            '    </div>' +
            (App.state.currentLesson.vocabulary ? (
                '    <div>' +
                '        <h4 class="text-xl font-bold mb-4" data-translate-key="vocabTitle">' + App.translations[lang].vocabTitle + '</h4>' +
                '        <div id="vocabulary-list" class="grid grid-cols-1 md:grid-cols-2 gap-4">' + App.views.platform.createVocabularyHtmlForLang(lang) + '</div>' +
                '    </div>'
            ) : '') +
            (App.state.currentLesson.phrases ? (
                '    <div>' +
                '        <h4 class="text-xl font-bold mb-4" data-translate-key="phraseTitle">' + App.translations[lang].phraseTitle + '</h4>' +
                '        <div id="phrases-list" class="space-y-4">' + App.views.platform.createPhrasesHtmlForLang(lang) + '</div>' +
                '    </div>'
            ) : '') +
            '</div>';

        const lessonImage = document.getElementById('lesson-image');
        if (lessonImage) {
            lessonImage.addEventListener('click', () => {
                const modalImage = document.getElementById('modal-image');
                const imageModal = document.getElementById('image-modal');
                if (modalImage) modalImage.src = lessonImage.src;
                if (imageModal) {
                    imageModal.classList.remove('hidden');
                    imageModal.classList.add('flex');
                }
            });
        }
    },

    // --- Generate lesson ---

    generateLesson: async function() {
        const generateLessonBtn = document.getElementById('generate-lesson-btn');
        const errorMessage = document.getElementById('error-message');
        const lessonContainer = document.getElementById('lesson-container');
        const topicSelect = document.getElementById('topic-select');
        const customTopicInput = document.getElementById('custom-topic-input');

        App.utils.setLoading(generateLessonBtn, true);
        errorMessage.classList.add('hidden');
        lessonContainer.classList.add('hidden');
        App.state.currentLesson = null;
        App.state.explanationAudioBlobs = {};

        try {
            const age = document.querySelector('input[name="age"]:checked').value;
            const subject = document.querySelector('input[name="subject"]:checked').value;
            const lessonType = document.querySelector('input[name="lesson-type"]:checked').value;
            App.state.currentLessonType = lessonType;
            const topicValue = topicSelect.value;
            let topic = topicValue;
            if (topicValue === '__custom__') {
                const customValue = customTopicInput?.value.trim();
                if (!customValue) {
                    throw new Error(App.views.platform._getCustomTopicErrorText());
                }
                topic = customValue;
            }
            const langName = new Intl.DisplayNames(['en'], {type: 'language'}).of(subject.toLowerCase().includes('english') ? 'en' : App.state.currentLang);

            const systemPrompt = 'You are an expert curriculum designer. Your task is to generate a mini-lesson as a single, valid JSON object. The lesson is for a ' + age + ' old student, the format is "' + lessonType + '". All property names in the JSON must be enclosed in double quotes. Output ONLY the JSON object.';
            const userPrompt = 'Generate a mini-lesson about "' + topic + '" in the subject of ' + subject + '. The main learning language for this lesson is ' + langName + '.\n' +
'The lesson must include:\n' +
'1.  An "explanation" paragraph about the topic, tailored to the lesson type "' + lessonType + '". **This explanation must be detailed and between 500 and 600 words.** Provide this explanation in an object with four language versions: Traditional Chinese (\u7E41\u9AD4\u4E2D\u6587), English, Vietnamese (Ti\u1EBFng Vi\u1EC7t), and Japanese (\u65E5\u672C\u8A9E).\n' +
'2.  If the lesson type is NOT "AI\u63D0\u554F", include a list of 5-7 core "vocabulary" words. The "word" field must be in the main learning language (' + langName + '). For each word:\n' +
'    a. Provide its "translation" in an object with all four languages (zh-Hant, en, vi, ja).\n' +
'    b. Provide an IPA "phonetic" transcription as a single string.\n' +
'    c. Provide a simple "example_sentence" as an object with all four languages (zh-Hant, en, vi, ja).\n' +
'3.  If the lesson type is NOT "AI\u63D0\u554F", include a list of 3-4 simple, practical "phrases". The "phrase" field must be in the main learning language (' + langName + '). For each phrase, provide its "translation" in an object with all four languages.\n' +
'4.  An "image_prompt" for an image generation model to create a colorful, friendly, cartoon-style illustration for this lesson.\n' +
'\n' +
'Output ONLY a single, valid JSON object in the following format. Omit "vocabulary" and "phrases" keys if the lesson type is "AI\u63D0\u554F". Ensure all property names are double-quoted.\n' +
'{\n' +
'  "explanation": { "zh-Hant": "...", "en": "...", "vi": "...", "ja": "..." },\n' +
'  "vocabulary": [\n' +
'    { "word": "...", "phonetic": "...", "example_sentence": { "zh-Hant": "...", "en": "...", "vi": "...", "ja": "..." }, "translation": { "zh-Hant": "...", "en": "...", "vi": "...", "ja": "..." } }\n' +
'  ],\n' +
'  "phrases": [\n' +
'    { "phrase": "...", "translation": { "zh-Hant": "...", "en": "...", "vi": "...", "ja": "..." } }\n' +
'  ],\n' +
'  "image_prompt": "..."\n' +
'}';

            const rawJsonResponse = await App.api.callGeminiAPI(userPrompt, systemPrompt);
            let cleanedJson = rawJsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstBrace = cleanedJson.indexOf('{');
            const lastBrace = cleanedJson.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
                cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
            }

            try {
                App.state.currentLesson = JSON.parse(cleanedJson);
            } catch (parseError) {
                console.error("Failed to parse JSON:", parseError, "Raw response:", rawJsonResponse, "Cleaned JSON:", cleanedJson);
                throw new Error('Invalid JSON received from API: ' + parseError.message);
            }

            if (App.state.currentLesson.image_prompt) {
                App.state.currentLesson.imageUrl = await App.api.callImagenAPI(App.state.currentLesson.image_prompt);
            }

            App.state.currentLesson.selectedTopicName = topic;
            App.views.platform.renderLesson();
            lessonContainer.classList.remove('hidden');

            // Save lesson to history (guarded)
            if (App.state.isAuthenticated && typeof saveLessonToHistory === 'function') {
                saveLessonToHistory({
                    lesson_type: lessonType,
                    subject: subject,
                    topic: topic,
                    age_group: age,
                    content: App.state.currentLesson
                });
            }

        } catch (error) {
            console.error("Lesson Generation Error:", error);
            App.utils.displayError(errorMessage, App.translations[App.state.currentLang].lessonError.replace('{message}', error.message));
        } finally {
            App.utils.setLoading(generateLessonBtn, false);
        }
    },

    // --- Play audio click handler ---

    playAudio: async function(e) {
        const button = e.target.closest('.play-audio-btn');
        if (!button) return;
        const textToSpeak = button.dataset.textToSpeak;
        if (!textToSpeak) return;

        const errorDisplay = App.views.platform.getAudioErrorDisplay(button);
        errorDisplay.classList.add('hidden');

        const audioKey = App.views.platform.getAudioButtonKey(button);
        const cached = App.state.generatedAudioCache.get(audioKey);
        const isLessonAudio = Boolean(button.closest('#platform-view'));
        const speechProfile = isLessonAudio
            ? App.utils.getLessonSpeechProfile(button.dataset.lessonLang || App.utils.getActiveLessonLanguage())
            : null;

        const handlePlaybackError = (playError) => {
            console.error("Audio playback error:", playError);
            App.utils.displayError(errorDisplay, 'Audio playback failed: ' + playError.message);
        };

        try {
            if (cached) {
                App.utils.playAudioBlob(cached.blob, speechProfile, handlePlaybackError);
                App.views.platform.showDownloadButton(button);
                return;
            }
            const audioBlob = await App.api.callTTSAPI(textToSpeak, button, { speechProfile: speechProfile });
            App.views.platform.cacheGeneratedAudio(audioKey, audioBlob);
            App.utils.playAudioBlob(audioBlob, speechProfile, handlePlaybackError);
            App.views.platform.showDownloadButton(button);
        } catch (error) {
            console.error("Audio playback error:", error);
            App.utils.displayError(errorDisplay, 'Audio Error: ' + error.message);
        }
    }

};
