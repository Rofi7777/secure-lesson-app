window.App = window.App || {};
App.views = App.views || {};

App.views.tutoring = {

    renderTutoringVocabulary: function(items) {
        var tutoringVocabCard = document.getElementById('tutoring-vocab-card');
        var tutoringVocabContainer = document.getElementById('tutoring-vocabulary-container');
        if (!tutoringVocabCard || !tutoringVocabContainer) return;
        if (!Array.isArray(items) || items.length === 0) {
            tutoringVocabContainer.innerHTML = '';
            tutoringVocabCard.classList.add('hidden');
            return;
        }
        var phoneticLabel = App.translations[App.state.currentLang]?.phoneticLabel || 'Phonetic';
        var exampleLabel = App.translations[App.state.currentLang]?.exampleLabel || 'Example';
        tutoringVocabContainer.innerHTML = items.map(function(item, index) {
            var wordText = typeof item?.word === 'string' && item.word.trim() ? item.word.trim() : 'Word ' + (index + 1);
            var meaningText = typeof item?.meaning === 'string' ? item.meaning.trim() : '';
            var phoneticText = typeof item?.phonetic === 'string' ? item.phonetic.trim() : '';
            var exampleText = typeof item?.example === 'string' ? item.example.trim() : '';
            var wordSpeechAttr = App.utils.encodeForDataAttr(wordText);
            var exampleSpeechAttr = exampleText ? App.utils.encodeForDataAttr(exampleText) : '';
            var wordButton = wordSpeechAttr ? '\n' +
                '    <button class="play-audio-btn flex-shrink-0" data-text-to-speak="' + wordSpeechAttr + '" title="Play word audio" aria-label="Play word audio">\n' +
                '        <i class="fas fa-play"></i>\n' +
                '        <div class="audio-loader"></div>\n' +
                '    </button>' : '';
            var exampleButton = exampleSpeechAttr ? '\n' +
                '    <button class="play-audio-btn flex-shrink-0" data-text-to-speak="' + exampleSpeechAttr + '" title="Play example audio" aria-label="Play example audio">\n' +
                '        <i class="fas fa-play"></i>\n' +
                '        <div class="audio-loader"></div>\n' +
                '    </button>' : '';
            return '\n' +
                '<div class="p-4 bg-white/10 rounded-lg flex flex-col gap-4 md:flex-row md:items-start">\n' +
                '    <div class="flex-1">\n' +
                '        <p class="font-bold text-lg text-yellow-300">' + wordText + '</p>\n' +
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
        var analyzeHomeworkBtn = document.getElementById('analyze-homework-btn');
        var tutoringErrorMessage = document.getElementById('tutoring-error-message');
        var tutoringResultsView = document.getElementById('tutoring-results-view');
        var tutoringLevelSelect = document.getElementById('tutoring-level');
        var tutoringSubjectSelect = document.getElementById('tutoring-subject');
        var tutoringLanguageSelect = document.getElementById('tutoring-language');
        var tutoringCustomSubjectInput = document.getElementById('tutoring-custom-subject-input');
        var keyConceptsContainer = document.getElementById('key-concepts-container');
        var problemAnalysisContainer = document.getElementById('problem-analysis-container');

        App.utils.setLoading(analyzeHomeworkBtn, true);
        tutoringErrorMessage.classList.add('hidden');
        tutoringResultsView.classList.add('hidden');

        try {
            if (!App.state.tutoringFiles.length) {
                var noFileMessage = App.translations[App.state.currentLang]?.tutoring?.noFileError || App.translations['en']?.tutoring?.noFileError || 'Please upload at least one file first.';
                throw new Error(noFileMessage);
            }
            var primaryFile = App.state.tutoringFiles[0];
            var fileCount = App.state.tutoringFiles.length;
            var base64Image = await App.utils.base64FromFile(primaryFile);
            var level = tutoringLevelSelect.value;
            var subject = tutoringSubjectSelect.value;
            if (subject === 'Other' || subject === '\u5176\u4ED6' || subject === 'Kh\u00E1c' || subject === '\u305D\u306E\u4ED6') {
                subject = tutoringCustomSubjectInput.value || 'Custom';
            }
            var language = tutoringLanguageSelect.options[tutoringLanguageSelect.selectedIndex].text;

            // Log user behavior (guarded)
            if (typeof logUserBehavior === 'function') {
                await logUserBehavior('tutoring_used', {
                    level: level,
                    subject: subject,
                    language: language,
                    file_count: fileCount,
                });
            }

            var systemPrompt = 'You are an AI tutor analyzing homework. Output a valid JSON object. All property names must be double-quoted. Output ONLY the JSON object.';
            var prompt = 'Analyze this homework image' + (fileCount > 1 ? ' (1st of ' + fileCount + ' uploaded files)' : '') + '. The student\'s level is ' + level + ', the subject is ' + subject + '. Provide all text in ' + language + '.\n' +
'1. Identify the key concepts being tested in the homework.\n' +
'2. Provide a step-by-step analysis for each distinct problem you can see.\n' +
'3. Extract exactly six high-impact vocabulary words that appear in, or are essential to, the assignment. For each vocabulary entry, include:\n' +
'   - "word": the vocabulary term in ' + language + '\n' +
'   - "meaning": a short definition or translation in ' + language + '\n' +
'   - "phonetic": an IPA (or syllable-style) pronunciation guide\n' +
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
'        { "word": "term", "meaning": "short meaning", "phonetic": "IPA", "example": "example sentence" }\n' +
'    ]\n' +
'}';
            var rawJsonResponse = await App.api.callGeminiAPI(prompt, systemPrompt, base64Image);
            var cleanedJson = rawJsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            var firstBrace = cleanedJson.indexOf('{');
            var lastBrace = cleanedJson.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
                cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
            }
            var results;
            try {
                results = JSON.parse(cleanedJson);
            } catch (parseError) {
                console.error("Failed to parse homework JSON:", parseError, "Raw response:", rawJsonResponse, "Cleaned JSON:", cleanedJson);
                throw new Error('Invalid JSON received from API: ' + parseError.message);
            }
            var keyConcepts = Array.isArray(results.keyConcepts) ? results.keyConcepts : [];
            var problemAnalysis = Array.isArray(results.problemAnalysis) ? results.problemAnalysis : [];
            var vocabularyItems = Array.isArray(results.vocabulary) ? results.vocabulary.slice(0, 6) : [];

            var keyConceptsHtml = keyConcepts
                .map(function(concept) { return typeof concept === 'string' ? concept.trim() : ''; })
                .filter(Boolean)
                .map(function(concept) {
                    var speechAttr = App.utils.encodeForDataAttr(concept);
                    var buttonHtml = speechAttr ? '\n' +
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

            var problemAnalysisHtml = problemAnalysis.map(function(prob, index) {
                var problemTitle = typeof prob?.problem === 'string' && prob.problem.trim() ? prob.problem.trim() : 'Problem ' + (index + 1);
                var solutionText = typeof prob?.solution === 'string' ? prob.solution : '';
                var feedbackText = typeof prob?.feedback === 'string' ? prob.feedback : '';
                var speechParts = [problemTitle, solutionText, feedbackText].map(App.utils.normalizeSpeechText).filter(Boolean);
                var speechAttr = speechParts.length ? App.utils.encodeForDataAttr(speechParts.join('. ')) : '';
                var solutionHtml = solutionText ? '<p class="mt-2 whitespace-pre-wrap">' + solutionText + '</p>' : '';
                var feedbackHtml = feedbackText ? '<p class="mt-2 text-sm italic text-indigo-200">' + feedbackText + '</p>' : '';
                var buttonHtml = speechAttr ? '\n' +
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

            App.views.tutoring.renderTutoringVocabulary(vocabularyItems);
            tutoringResultsView.classList.remove('hidden');

            // Save tutoring session to history (guarded)
            if (App.state.isAuthenticated && typeof saveTutoringToHistory === 'function') {
                saveTutoringToHistory({
                    level: level,
                    subject: subject,
                    language: language,
                    analysis_content: results,
                    file_urls: App.state.tutoringFiles.map(function(f) { return f.name; })
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
