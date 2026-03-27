window.App = window.App || {};
App.views = App.views || {};

App.views.storybook = {

    generateStory: async function() {
        var generateStoryBtn = document.getElementById('generate-story-btn');
        var storybookErrorMessage = document.getElementById('storybook-error-message');
        var storyOutputContainer = document.getElementById('story-output-container');
        var audioControls = document.getElementById('audio-controls');
        var storyDisplayContainer = document.getElementById('story-display-container');
        var playStoryBtn = document.getElementById('play-story-btn');
        var storybookLanguageSelect = document.getElementById('storybook-language');
        var storybookAgeSelect = document.getElementById('storybook-age');

        App.utils.setLoading(generateStoryBtn, true);
        storybookErrorMessage.classList.add('hidden');
        storyOutputContainer.classList.add('hidden');
        audioControls.classList.add('hidden');
        if (App.state.storyAudioUrl) URL.revokeObjectURL(App.state.storyAudioUrl);
        App.state.storyAudioBlob = null;
        App.state.storyAudioUrl = null;

        try {
            if (!App.state.storybookFiles.length) {
                var noImageMessage = App.translations[App.state.currentLang]?.storybook?.noImageError || App.translations['en']?.storybook?.noImageError || 'Please upload at least one illustration first.';
                throw new Error(noImageMessage);
            }

            var base64Image = await App.utils.base64FromFile(App.state.storybookFiles[0]);
            var lang = storybookLanguageSelect.options[storybookLanguageSelect.selectedIndex].text;
            var age = storybookAgeSelect.value;
            var style = document.querySelector('input[name="style"]:checked').value;
            var charName = document.getElementById('storybook-char-name').value;

            var prompt = 'Based on this image, write a ' + style + ' children\'s story suitable for a ' + age + ' old child. The story should be in ' + lang + '. ' + (charName ? 'The main character\'s name is ' + charName + '.' : '') + ' **The story must be detailed and between 500 and 600 words.**';

            var storyText = await App.api.callGeminiAPI(prompt, "", base64Image);
            storyDisplayContainer.textContent = storyText;
            storyOutputContainer.classList.remove('hidden');

            var audioBlob = await App.api.callTTSAPI(storyText, playStoryBtn);
            App.state.storyAudioBlob = audioBlob;
            App.state.storyAudioUrl = URL.createObjectURL(audioBlob);
            audioControls.classList.remove('hidden');
            playStoryBtn.disabled = false;

            // Save story to history (guarded)
            if (App.state.isAuthenticated && typeof saveStoryToHistory === 'function') {
                saveStoryToHistory({
                    story_text: storyText,
                    language: lang,
                    age_group: age,
                    style: style,
                    character_name: charName || null,
                    image_urls: Array.from(App.state.storybookFiles).map(function(f) { return f.name; }),
                    audio_url: App.state.storyAudioUrl
                });
            }

        } catch (error) {
            console.error("Story Generation Error:", error);
            App.utils.displayError(storybookErrorMessage, 'Story generation failed: ' + error.message);
        } finally {
            App.utils.setLoading(generateStoryBtn, false);
        }
    }

};
