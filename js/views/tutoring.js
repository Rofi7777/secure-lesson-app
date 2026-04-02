window.App = window.App || {};
App.views = App.views || {};

App.views.tutoring = {

    renderTutoringVocabulary: function(items) {
        const tutoringVocabCard = document.getElementById('tutoring-vocab-card');
        const tutoringVocabContainer = document.getElementById('tutoring-vocabulary-container');
        if (!tutoringVocabCard || !tutoringVocabContainer) return;
        if (!Array.isArray(items) || items.length === 0) {
            tutoringVocabContainer.innerHTML = '';
            tutoringVocabCard.classList.add('hidden');
            return;
        }
        const phoneticLabel = App.translations[App.state.currentLang]?.phoneticLabel || 'Phonetic';
        const exampleLabel = App.translations[App.state.currentLang]?.exampleLabel || 'Example';
        tutoringVocabContainer.innerHTML = items.map((item, index) => {
            const wordText = typeof item?.word === 'string' && item.word.trim() ? item.word.trim() : 'Word ' + (index + 1);
            const meaningText = typeof item?.meaning === 'string' ? item.meaning.trim() : '';
            const phoneticText = typeof item?.phonetic === 'string' ? item.phonetic.trim() : '';
            const pinyinText = typeof item?.pinyin === 'string' ? item.pinyin.trim() : (App.pinyin.isActive() ? App.pinyin.getWordPinyin(wordText) : '');
            const exampleText = typeof item?.example === 'string' ? item.example.trim() : '';
            const wordSpeechAttr = App.utils.encodeForDataAttr(wordText);
            const exampleSpeechAttr = exampleText ? App.utils.encodeForDataAttr(exampleText) : '';
            const wordButton = wordSpeechAttr ? '\n' +
                '    <button class="play-audio-btn flex-shrink-0" data-text-to-speak="' + wordSpeechAttr + '" title="Play word audio" aria-label="Play word audio">\n' +
                '        <i class="fas fa-play"></i>\n' +
                '        <div class="audio-loader"></div>\n' +
                '    </button>' : '';
            const exampleButton = exampleSpeechAttr ? '\n' +
                '    <button class="play-audio-btn flex-shrink-0" data-text-to-speak="' + exampleSpeechAttr + '" title="Play example audio" aria-label="Play example audio">\n' +
                '        <i class="fas fa-play"></i>\n' +
                '        <div class="audio-loader"></div>\n' +
                '    </button>' : '';
            return '\n' +
                '<div class="p-4 bg-white/10 rounded-lg flex flex-col gap-4 md:flex-row md:items-start">\n' +
                '    <div class="flex-1">\n' +
                '        <p class="font-bold text-lg text-yellow-300">' + wordText + '</p>\n' +
                (App.pinyin.isActive() && pinyinText ? '        <p class="pinyin-line">' + (App.translations[App.state.currentLang]?.pinyinLabel || 'Pinyin') + ': ' + pinyinText + '</p>\n' : '') +
                (phoneticText ? '        <p class="text-sm text-cyan-300">' + phoneticLabel + ': ' + phoneticText + '</p>\n' : '') +
                (meaningText ? '        <p class="text-sm mt-1 text-white/90">' + meaningText + '</p>\n' : '') +
                (exampleText ? '        <p class="text-sm italic mt-2 text-indigo-200">"' + exampleLabel + ': ' + exampleText + '"</p>\n' : '') +
                '    </div>\n' +
                '    <div class="flex flex-wrap gap-3">\n' +
                '        ' + wordButton + '\n' +
                '        ' + exampleButton + '\n' +
                '    </div>\n' +
                '</div>';
        }).join('');
        tutoringVocabCard.classList.remove('hidden');
    },

    analyzeHomework: async function() {
        const analyzeHomeworkBtn = document.getElementById('analyze-homework-btn');
        const tutoringErrorMessage = document.getElementById('tutoring-error-message');
        const tutoringResultsView = document.getElementById('tutoring-results-view');
        const tutoringLevelSelect = document.getElementById('tutoring-level');
        const tutoringSubjectSelect = document.getElementById('tutoring-subject');
        const tutoringLanguageSelect = document.getElementById('tutoring-language');
        const tutoringCustomSubjectInput = document.getElementById('tutoring-custom-subject-input');
        const keyConceptsContainer = document.getElementById('key-concepts-container');
        const problemAnalysisContainer = document.getElementById('problem-analysis-container');

        App.utils.setLoading(analyzeHomeworkBtn, true);
        tutoringErrorMessage.classList.add('hidden');
        tutoringResultsView.classList.add('hidden');

        try {
            if (!App.state.tutoringFiles.length) {
                const noFileMessage = App.translations[App.state.currentLang]?.tutoring?.noFileError || App.translations['en']?.tutoring?.noFileError || 'Please upload at least one file first.';
                throw new Error(noFileMessage);
            }
            const primaryFile = App.state.tutoringFiles[0];
            const fileCount = App.state.tutoringFiles.length;
            const base64Image = await App.utils.base64FromFile(primaryFile);
            const level = tutoringLevelSelect.value;
            let subject = tutoringSubjectSelect.value;
            if (subject === 'Other' || subject === '\u5176\u4ED6' || subject === 'Kh\u00E1c' || subject === '\u305D\u306E\u4ED6') {
                subject = tutoringCustomSubjectInput.value || 'Custom';
            }
            const language = tutoringLanguageSelect.options[tutoringLanguageSelect.selectedIndex].text;

            // Log user behavior (guarded)
            if (typeof logUserBehavior === 'function') {
                await logUserBehavior('tutoring_used', {
                    level: level,
                    subject: subject,
                    language: language,
                    file_count: fileCount,
                });
            }

            const systemPrompt = 'You are an AI tutor analyzing homework. Output a valid JSON object. All property names must be double-quoted. Output ONLY the JSON object.';
            const prompt = 'Analyze this homework image' + (fileCount > 1 ? ' (1st of ' + fileCount + ' uploaded files)' : '') + '. The student\'s level is ' + level + ', the subject is ' + subject + '. Provide all text in ' + language + '.\n' +
'1. Identify the key concepts being tested in the homework.\n' +
'2. Provide a step-by-step analysis for each distinct problem you can see.\n' +
'3. Extract exactly six high-impact vocabulary words that appear in, or are essential to, the assignment. For each vocabulary entry, include:\n' +
'   - "word": the vocabulary term in ' + language + '\n' +
'   - "meaning": a short definition or translation in ' + language + '\n' +
'   - "phonetic": an IPA (or syllable-style) pronunciation guide\n' +
'   - "pinyin": the Hanyu Pinyin romanization with tone marks (e.g., "nǐ hǎo"). Include only if the word is Chinese; otherwise omit this field.\n' +
'   - "example": a simple example sentence using the word in ' + language + '\n' +
'If fewer than six suitable words exist, include as many as possible.\n' +
'\n' +
'Return ONLY a valid JSON object with the following shape:\n' +
'{\n' +
'    "keyConcepts": ["concept1", "concept2"],\n' +
'    "problemAnalysis": [\n' +
'        { "problem": "Description of problem 1", "solution": "Step-by-step solution for problem 1", "feedback": "Specific feedback for problem 1" }\n' +
'    ],\n' +
'    "vocabulary": [\n' +
'        { "word": "term", "meaning": "short meaning", "phonetic": "IPA", "pinyin": "pīnyīn", "example": "example sentence" }\n' +
'    ]\n' +
'}';
            const rawJsonResponse = await App.api.callGeminiAPI(prompt, systemPrompt, base64Image);
            let cleanedJson = rawJsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstBrace = cleanedJson.indexOf('{');
            const lastBrace = cleanedJson.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
                cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
            }
            let results;
            try {
                results = JSON.parse(cleanedJson);
            } catch (parseError) {
                console.error("Failed to parse homework JSON:", parseError, "Raw response:", rawJsonResponse, "Cleaned JSON:", cleanedJson);
                throw new Error('Invalid JSON received from API: ' + parseError.message);
            }
            const keyConcepts = Array.isArray(results.keyConcepts) ? results.keyConcepts : [];
            const problemAnalysis = Array.isArray(results.problemAnalysis) ? results.problemAnalysis : [];
            const vocabularyItems = Array.isArray(results.vocabulary) ? results.vocabulary.slice(0, 6) : [];

            const keyConceptsHtml = keyConcepts
                .map((concept) => typeof concept === 'string' ? concept.trim() : '')
                .filter(Boolean)
                .map((concept) => {
                    const speechAttr = App.utils.encodeForDataAttr(concept);
                    const buttonHtml = speechAttr ? '\n' +
                        '<button class="play-audio-btn flex-shrink-0" data-text-to-speak="' + speechAttr + '">\n' +
                        '    <i class="fas fa-play"></i>\n' +
                        '    <div class="audio-loader"></div>\n' +
                        '</button>' : '';
                    return '\n' +
                        '<div class="p-3 bg-white/10 rounded-lg flex justify-between items-center gap-3">\n' +
                        '    <span>' + concept + '</span>\n' +
                        '    ' + buttonHtml + '\n' +
                        '</div>';
                }).join('');
            keyConceptsContainer.innerHTML = keyConceptsHtml;

            const problemAnalysisHtml = problemAnalysis.map((prob, index) => {
                const problemTitle = typeof prob?.problem === 'string' && prob.problem.trim() ? prob.problem.trim() : 'Problem ' + (index + 1);
                const solutionText = typeof prob?.solution === 'string' ? prob.solution : '';
                const feedbackText = typeof prob?.feedback === 'string' ? prob.feedback : '';
                const speechParts = [problemTitle, solutionText, feedbackText].map(App.utils.normalizeSpeechText).filter(Boolean);
                const speechAttr = speechParts.length ? App.utils.encodeForDataAttr(speechParts.join('. ')) : '';
                const solutionHtml = solutionText ? '<p class="mt-2 whitespace-pre-wrap">' + solutionText + '</p>' : '';
                const feedbackHtml = feedbackText ? '<p class="mt-2 text-sm italic text-indigo-200">' + feedbackText + '</p>' : '';
                const buttonHtml = speechAttr ? '\n' +
                    '     <button class="play-audio-btn flex-shrink-0 ml-4" data-text-to-speak="' + speechAttr + '">\n' +
                    '         <i class="fas fa-play"></i>\n' +
                    '         <div class="audio-loader"></div>\n' +
                    '     </button>' : '';
                return '\n' +
                    '<div class="p-4 bg-white/10 rounded-lg">\n' +
                    '    <div class="flex justify-between items-start gap-4">\n' +
                    '         <div>\n' +
                    '            <h4 class="font-bold text-yellow-300">' + problemTitle + '</h4>\n' +
                    '            ' + solutionHtml + '\n' +
                    '            ' + feedbackHtml + '\n' +
                    '         </div>\n' +
                    '         ' + buttonHtml + '\n' +
                    '    </div>\n' +
                    '</div>';
            }).join('');
            problemAnalysisContainer.innerHTML = problemAnalysisHtml;

            App.state.tutoringVocabularyItems = vocabularyItems;
            App.views.tutoring.renderTutoringVocabulary(vocabularyItems);
            tutoringResultsView.classList.remove('hidden');

            // Save tutoring session to history (guarded)
            if (App.state.isAuthenticated && typeof saveTutoringToHistory === 'function') {
                saveTutoringToHistory({
                    level: level,
                    subject: subject,
                    language: language,
                    analysis_content: results,
                    file_urls: App.state.tutoringFiles.map((f) => f.name)
                });
            }

        } catch (error) {
            console.error("Homework Analysis Error:", error);
            App.utils.displayError(tutoringErrorMessage, 'Analysis failed: ' + error.message);
        } finally {
            App.utils.setLoading(analyzeHomeworkBtn, false);
        }
    }

};
