window.App = window.App || {};
App.views = App.views || {};

App.views.aiTutor = {

    renderExpertCards: function() {
        var aiTutorExpertGroup = document.getElementById('ai-tutor-expert-group');
        var selectedId = aiTutorExpertGroup.querySelector('.expert-card.selected')?.dataset.expertId;
        aiTutorExpertGroup.innerHTML = Object.values(App.data.aiExpertsData).map(function(expert) {
            return '<div class="expert-card bg-white/20 p-4 rounded-lg flex items-center space-x-4 ' + (expert.id === selectedId ? 'selected' : '') + '" data-expert-id="' + expert.id + '">'
                + '<div class="text-3xl bg-white/20 p-3 rounded-full">' + expert.icon + '</div>'
                + '<div>'
                + '<h4 class="font-bold text-white">' + (expert.name[App.state.currentLang] || expert.name['en']) + '</h4>'
                + '<p class="text-sm text-indigo-200">' + (expert.description[App.state.currentLang] || expert.description['en']) + '</p>'
                + '</div>'
                + '</div>';
        }).join('');
    },

    renderTutorCategories: function() {
        var aiTutorCategoryGroup = document.getElementById('ai-tutor-category-group');
        var categories = (App.translations[App.state.currentLang].aiTutor.categories || App.translations['en'].aiTutor.categories);
        aiTutorCategoryGroup.innerHTML = Object.entries(categories).map(function(entry) {
            var key = entry[0];
            var value = entry[1];
            return '<div class="flex items-center">'
                + '<input id="cat-' + key + '" type="checkbox" value="' + key + '" name="tutor-category" class="w-4 h-4 text-yellow-400 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500">'
                + '<label for="cat-' + key + '" class="ml-2 text-sm font-medium text-white">' + value + '</label>'
                + '</div>';
        }).join('');
    },

    getAdviceOrDiagnosis: async function(isDoctor, followUpText) {
        if (followUpText === undefined) followUpText = null;

        // AI Doctor feature removed — only tutor mode supported
        var chatHistory = App.state.aiTutorChatHistory;
        var responseContainer = document.getElementById('ai-tutor-response-container');
        var inputEl = document.getElementById('ai-tutor-input');
        var expertGroup = document.getElementById('ai-tutor-expert-group');
        var button = document.getElementById('get-advice-btn');
        var errorEl = document.getElementById('ai-tutor-error-message');

        var userInput = followUpText || inputEl.value.trim();
        if (!userInput) return;

        var selectedExpertEl = expertGroup.querySelector('.expert-card.selected');
        // Use chat history's last expert if available (for follow-ups)
        var lastExpertId = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].expertId : null;
        var currentExpertId = selectedExpertEl ? selectedExpertEl.dataset.expertId : lastExpertId;

        if (!currentExpertId) {
            App.utils.displayError(errorEl, "Please select an expert.");
            return;
        }

        App.utils.setLoading(button, true);
        errorEl.classList.add('hidden');
        responseContainer.classList.remove('hidden');

        responseContainer.querySelector('#follow-up-section')?.remove();
        responseContainer.innerHTML += '<div class="flex justify-end mb-4"><div class="chat-bubble user p-3">' + userInput + '</div></div>';
        if (!followUpText) inputEl.value = "";

        var loadingBubble = document.createElement('div');
        loadingBubble.className = "flex justify-start mb-4";
        loadingBubble.innerHTML = '<div class="chat-bubble bot p-3 flex justify-center items-center"><div class="loader" style="border-color: #9ca3af; border-bottom-color: transparent;"></div></div>';
        responseContainer.appendChild(loadingBubble);
        responseContainer.scrollTop = responseContainer.scrollHeight;

        try {
            var expertData = App.data.aiExpertsData[currentExpertId];
            if (!expertData) {
                App.utils.displayError(errorEl, "Expert not found.");
                return;
            }

            var isFirstTurn = chatHistory.length === 0;
            var base64Image = null;

            chatHistory.push({ role: 'user', text: userInput, expertId: currentExpertId }); // Store expertId with the turn
            var fullPrompt = chatHistory.map(function(turn) { return turn.role + ': ' + turn.text; }).join('\n');

            var rawJsonResponse = await App.api.callGeminiAPI(fullPrompt, expertData.systemPrompt, base64Image);
            var cleanedJson = rawJsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            var firstBrace = cleanedJson.indexOf('{');
            var lastBrace = cleanedJson.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
                cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
            }
            var responseData;
            try {
                responseData = JSON.parse(cleanedJson);
            } catch (parseError) {
                console.error("Failed to parse chat JSON:", parseError, "Raw response:", rawJsonResponse, "Cleaned JSON:", cleanedJson);
                throw new Error('Invalid JSON received from API: ' + parseError.message);
            }

            var formattedAdvice = App.utils.simpleMarkdownParse(responseData.advice);
            chatHistory.push({ role: 'model', text: responseData.advice, expertId: currentExpertId }); // Store expertId with the turn

            loadingBubble.outerHTML = '<div class="flex justify-start mb-4"><div class="chat-bubble bot p-4 prose prose-sm max-w-none text-slate-800">' + formattedAdvice + '</div></div>';

            var followUpQuestions = responseData.followUpQuestions;
            if (followUpQuestions && followUpQuestions.length > 0) {
                var expertName = expertData.name[App.state.currentLang] || expertData.name['en'];
                var followUpHTML = ''
                    + '<div id="follow-up-section" class="mt-6">'
                    + '<div class="chat-bubble bot summary p-4 space-y-3">'
                    + '<h4 class="font-bold flex items-center gap-2 text-lg" style="color: ' + expertData.color + ';">'
                    + '<i class="fas fa-question-circle opacity-80"></i>'
                    + '<span>' + App.translations[App.state.currentLang].aiTutor.summaryTitle.replace('{expertName}', expertName) + '</span>'
                    + '</h4>'
                    + followUpQuestions.map(function(q) { return '<button class="suggested-question-btn w-full text-left p-2 bg-white/60 hover:bg-white rounded-md transition text-slate-800">' + q + '</button>'; }).join('')
                    + '</div>'
                    + '<div class="mt-4 relative">'
                    + '<input type="text" class="follow-up-input w-full p-3 pr-16 bg-white/20 border border-white/30 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none text-white placeholder-gray-300" placeholder="' + App.translations[App.state.currentLang].aiTutor.followupPlaceholder + '">'
                    + '<button class="send-follow-up-btn absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500 text-white rounded-md h-8 w-10 flex items-center justify-center hover:bg-emerald-600">'
                    + '<i class="fas fa-paper-plane"></i>'
                    + '</button>'
                    + '</div>'
                    + '</div>';
                responseContainer.insertAdjacentHTML('beforeend', followUpHTML);
            }

            responseContainer.scrollTop = responseContainer.scrollHeight;

        } catch (error) {
            console.error("Chat Error:", error);
            loadingBubble.remove();
            App.utils.displayError(errorEl, 'Failed to get response: ' + error.message);
        } finally {
            App.utils.setLoading(button, false);
        }
    }

};
