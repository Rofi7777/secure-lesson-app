window.App = window.App || {};

App.i18n = {

    // --- Callback registry for language change notifications ---
    _languageCallbacks: [],

    registerLanguageCallback: function(fn) {
        App.i18n._languageCallbacks.push(fn);
    },

    // --- Get common UI string (with fallback to English) ---
    t: function(key) {
        const lang = App.state.currentLang;
        return (App.translations[lang] && App.translations[lang].common && App.translations[lang].common[key]) ||
               (App.translations['en'] && App.translations['en'].common && App.translations['en'].common[key]) ||
               key;
    },

    // --- Core language setter ---
    setLanguage: function(lang) {
        const previousLang = App.state.currentLang;
        App.state.currentLang = lang;
        document.documentElement.lang = lang;

        // Log language change behavior
        if (previousLang && previousLang !== lang && App.state.isAuthenticated) {
            if (typeof logUserBehavior === 'function') {
                logUserBehavior('language_changed', {
                    from_language: previousLang,
                    to_language: lang,
                });
            }
        }

        document.querySelectorAll('[data-translate-key]').forEach((el) => {
            const key = el.dataset.translateKey;
            const keys = key.split('.');
            let translation = App.translations[lang];
            try {
                for (let i = 0; i < keys.length; i++) {
                    translation = translation[keys[i]];
                }
            } catch (e) {
                translation = undefined;
            }

            if (translation === undefined) {
                console.warn('[i18n] Missing translation key "' + key + '" for lang "' + lang + '"');
            }

            if (typeof translation === 'string') {
                if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
                    el.placeholder = translation;
                } else if (el.hasAttribute('contenteditable') && el.dataset.placeholderKey !== undefined) {
                    // Simplified: always update the placeholder attribute value
                    el.setAttribute('data-placeholder-key', translation);
                } else {
                    // Check if it's a button text span
                    if (el.classList.contains('btn-text')) {
                        el.textContent = translation;
                    } else {
                        el.innerHTML = translation;
                    }
                }
            } else if (typeof translation === 'object' && el.id === 'lesson-type-group') {
                // Handle radio button group labels
                Object.entries(translation).forEach((pair) => {
                    const label = el.querySelector('label[for="type-' + pair[0] + '"]');
                    if (label) label.textContent = pair[1];
                });
            } else if (typeof translation === 'object' && el.id === 'storybook-style-group') {
                // Handle storybook style labels
                const storybookTranslations = App.translations[lang].storybook;
                if (storybookTranslations) {
                    Object.entries(storybookTranslations).forEach((pair) => {
                        if (pair[0].startsWith('style')) {
                            const styleKey = pair[0].replace('style', '').toLowerCase();
                            const label = el.querySelector('label[for="style-' + styleKey + '"]');
                            if (label) label.textContent = pair[1];
                        }
                    });
                }
            }
        });

        App.i18n.updateAllSelectOptions();
        const subjectGroup = document.getElementById('subject-group');
        const checkedSubject = subjectGroup ? subjectGroup.querySelector('input[name="subject"]:checked') : null;
        if (checkedSubject) {
            App.i18n.updateTopicSelection(checkedSubject.value);
        }

        // Re-render view components
        if (App.views && App.views.aiTutor) {
            if (App.views.aiTutor.renderExpertCards) App.views.aiTutor.renderExpertCards();
            if (App.views.aiTutor.renderTutorCategories) App.views.aiTutor.renderTutorCategories();
        }

        App.i18n.updateStorybookSummary(App.state.storybookFiles ? App.state.storybookFiles.length : 0);
        App.i18n.updateTutoringSummary(App.state.tutoringFiles ? App.state.tutoringFiles.length : 0);

        const generateStoryBtn = document.getElementById('generate-story-btn');
        const analyzeHomeworkBtn = document.getElementById('analyze-homework-btn');
        const fileNameDisplay = document.getElementById('file-name-display');

        if (generateStoryBtn) generateStoryBtn.disabled = App.state.storybookFiles.length === 0;
        if (analyzeHomeworkBtn) analyzeHomeworkBtn.disabled = App.state.tutoringFiles.length === 0;
        if (fileNameDisplay) {
            if (App.state.tutoringFiles.length > 0) {
                fileNameDisplay.textContent = App.state.tutoringFiles.map((file) => file.name).join(', ');
            } else {
                const noFile = (App.translations[App.state.currentLang] && App.translations[App.state.currentLang].tutoring && App.translations[App.state.currentLang].tutoring.noFileSelected) ||
                    (App.translations['en'] && App.translations['en'].tutoring && App.translations['en'].tutoring.noFileSelected) ||
                    'No file selected';
                fileNameDisplay.textContent = noFile;
            }
        }

        App.i18n.syncCustomTopicOptionLabel();

        if (App.state.currentLesson) {
            if (App.views && App.views.platform && App.views.platform.renderLesson) {
                App.views.platform.renderLesson();
            }
        }

        // Ensure button texts are updated correctly
        document.querySelectorAll('button[data-translate-key]').forEach((btn) => {
            const key = btn.dataset.translateKey;
            const keys = key.split('.');
            let translation = App.translations[lang];
            try { for (let i = 0; i < keys.length; i++) { translation = translation[keys[i]]; } } catch(e) { translation = undefined; }
            if (typeof translation === 'string') {
                const textSpan = btn.querySelector('.btn-text');
                if (textSpan) { textSpan.textContent = translation; } else { btn.textContent = translation; }
            }
        });

        // Ensure select labels are updated correctly
        document.querySelectorAll('label[data-translate-key]').forEach((lbl) => {
            const key = lbl.dataset.translateKey;
            const keys = key.split('.');
            let translation = App.translations[lang];
            try { for (let i = 0; i < keys.length; i++) { translation = translation[keys[i]]; } } catch(e) { translation = undefined; }
            if (typeof translation === 'string') { lbl.textContent = translation; }
        });

        // Notify registered callbacks
        App.i18n._languageCallbacks.forEach((fn) => { fn(lang); });
    },

    // --- Localized text helpers ---
    getLocalizedText: function(entry) {
        if (!entry) return '';
        if (typeof entry === 'string') return entry;
        return entry[App.state.currentLang] || entry['en'] || Object.values(entry)[0] || '';
    },

    getDebateTranslation: function(path) {
        const segments = path.split('.');
        let node = App.translations[App.state.currentLang] && App.translations[App.state.currentLang].debateCoach;
        let fallbackNode = App.translations['en'] && App.translations['en'].debateCoach;
        for (let i = 0; i < segments.length; i++) {
            node = node && node[segments[i]];
            fallbackNode = fallbackNode && fallbackNode[segments[i]];
        }
        return typeof node === 'string' ? node : (typeof fallbackNode === 'string' ? fallbackNode : '');
    },

    // --- File summary text helpers ---
    getStorybookSelectedText: function(count) {
        const template = (App.translations[App.state.currentLang] && App.translations[App.state.currentLang].storybook && App.translations[App.state.currentLang].storybook.selectedCount) ||
            (App.translations['en'] && App.translations['en'].storybook && App.translations['en'].storybook.selectedCount) ||
            'Selected {count} file(s)';
        return template.replace('{count}', count);
    },

    getTutoringSelectedText: function(count) {
        const template = (App.translations[App.state.currentLang] && App.translations[App.state.currentLang].tutoring && App.translations[App.state.currentLang].tutoring.selectedCount) ||
            (App.translations['en'] && App.translations['en'].tutoring && App.translations['en'].tutoring.selectedCount) ||
            'Selected {count} file(s)';
        return template.replace('{count}', count);
    },

    getDoctorSelectedText: function(count) {
        const template = (App.translations[App.state.currentLang] && App.translations[App.state.currentLang].aiDoctor && App.translations[App.state.currentLang].aiDoctor.selectedCount) ||
            (App.translations['en'] && App.translations['en'].aiDoctor && App.translations['en'].aiDoctor.selectedCount) ||
            'Selected {count} photo(s)';
        return template.replace('{count}', count);
    },

    // --- Custom topic option text ---
    getCustomTopicOptionText: function() {
        return (App.translations[App.state.currentLang] && App.translations[App.state.currentLang].topicCustomOption) ||
            (App.translations['en'] && App.translations['en'].topicCustomOption) ||
            'Custom topic';
    },

    getCustomTopicErrorText: function() {
        return (App.translations[App.state.currentLang] && App.translations[App.state.currentLang].topicCustomError) ||
            (App.translations['en'] && App.translations['en'].topicCustomError) ||
            'Please enter your custom topic.';
    },

    // --- Summary update functions ---
    updateStorybookSummary: function(count) {
        const storybookFileSummary = document.getElementById('storybook-file-summary');
        if (!storybookFileSummary) return;
        if (count > 0) {
            storybookFileSummary.textContent = App.i18n.getStorybookSelectedText(count);
            storybookFileSummary.classList.remove('hidden');
        } else {
            storybookFileSummary.textContent = '';
            storybookFileSummary.classList.add('hidden');
        }
    },

    updateTutoringSummary: function(count) {
        const tutoringFileSummary = document.getElementById('tutoring-file-summary');
        if (!tutoringFileSummary) return;
        if (count > 0) {
            tutoringFileSummary.textContent = App.i18n.getTutoringSelectedText(count);
            tutoringFileSummary.classList.remove('hidden');
        } else {
            tutoringFileSummary.textContent = '';
            tutoringFileSummary.classList.add('hidden');
        }
    },

    updateDoctorSummary: function(count) {
        const aiDoctorFileSummary = document.getElementById('ai-doctor-file-summary');
        if (!aiDoctorFileSummary) return;
        if (count > 0) {
            aiDoctorFileSummary.textContent = App.i18n.getDoctorSelectedText(count);
            aiDoctorFileSummary.classList.remove('hidden');
        } else {
            aiDoctorFileSummary.textContent = '';
            aiDoctorFileSummary.classList.add('hidden');
        }
    },

    // --- Select options updater ---
    updateAllSelectOptions: function() {
        const langKey = App.state.currentLang;
        const tutoringLevelSelect = document.getElementById('tutoring-level');
        const tutoringSubjectSelect = document.getElementById('tutoring-subject');
        const tutoringLanguageSelect = document.getElementById('tutoring-language');
        const storybookLanguageSelect = document.getElementById('storybook-language');
        const storybookAgeSelect = document.getElementById('storybook-age');

        // Tutoring Levels
        if (tutoringLevelSelect) {
            tutoringLevelSelect.innerHTML = (App.data.tutoring_levels[langKey] || App.data.tutoring_levels['en']).map((level) => {
                return '<option class="text-black">' + level + '</option>';
            }).join('');
        }
        // Tutoring Subjects
        if (tutoringSubjectSelect) {
            tutoringSubjectSelect.innerHTML = (App.data.tutoring_subjects[langKey] || App.data.tutoring_subjects['en']).map((subject) => {
                return '<option class="text-black">' + subject + '</option>';
            }).join('');
        }
        // Tutoring/Storybook languages
        const langOptions = Object.keys(App.translations).map((key) => {
            const langName = new Intl.DisplayNames([langKey], {type: 'language'}).of(key) || key;
            return '<option class="text-black" value="' + key + '">' + langName.charAt(0).toUpperCase() + langName.slice(1) + '</option>';
        }).join('');
        if (tutoringLanguageSelect) {
            tutoringLanguageSelect.innerHTML = langOptions;
            tutoringLanguageSelect.value = App.state.currentLang;
        }
        if (storybookLanguageSelect) {
            storybookLanguageSelect.innerHTML = langOptions;
            storybookLanguageSelect.value = App.state.currentLang;
        }
        // Storybook Ages
        if (storybookAgeSelect) {
            storybookAgeSelect.innerHTML = (App.data.storybook_ages[langKey] || App.data.storybook_ages['en']).map((age) => {
                return '<option class="text-black" value="' + age + '">' + age + '</option>';
            }).join('');
        }
    },

    // --- Custom topic label sync ---
    syncCustomTopicOptionLabel: function() {
        const topicSelect = document.getElementById('topic-select');
        if (!topicSelect) return;
        const customOption = topicSelect.querySelector('option[value="__custom__"]');
        if (customOption) {
            const customTopicInput = document.getElementById('custom-topic-input');
            const customValue = customTopicInput ? customTopicInput.value.trim() : '';
            customOption.textContent = customValue
                ? App.i18n.getCustomTopicOptionText() + ' (' + customValue + ')'
                : App.i18n.getCustomTopicOptionText();
        }
    },

    // --- Custom topic UI updater ---
    updateCustomTopicUI: function() {
        const customTopicWrapper = document.getElementById('custom-topic-wrapper');
        if (!customTopicWrapper) return;
        const subjectGroup = document.getElementById('subject-group');
        const topicSelect = document.getElementById('topic-select');
        const subjectInput = subjectGroup ? subjectGroup.querySelector('input[name="subject"]:checked') : null;
        const subject = subjectInput ? subjectInput.value : '';
        const allowCustom = App.i18n.allowsCustomTopic(subject);
        const isCustomSelected = topicSelect && topicSelect.value === '__custom__';
        App.i18n.syncCustomTopicOptionLabel();
        customTopicWrapper.classList.toggle('hidden', !(allowCustom && isCustomSelected));
    },

    // --- Check if subject allows custom topic ---
    allowsCustomTopic: function(subject) {
        return true; // All subjects support custom topics
    },

    // --- Topic selection updater ---
    updateTopicSelection: function(subject) {
        const topicSelect = document.getElementById('topic-select');
        if (!topicSelect) return;
        const topicsMap = (App.translations[App.state.currentLang] && App.translations[App.state.currentLang].topics) || App.translations['en'].topics;
        const topics = topicsMap[subject] || [];
        const previousValue = topicSelect.value;
        const includeCustom = App.i18n.allowsCustomTopic(subject);
        const options = topics.slice();
        topicSelect.innerHTML = options.map((topic) => {
            return '<option class="text-black">' + topic + '</option>';
        }).join('') + (includeCustom ? '<option class="text-black" value="__custom__">' + App.i18n.getCustomTopicOptionText() + '</option>' : '');

        if (includeCustom && previousValue === '__custom__') {
            topicSelect.value = '__custom__';
        } else if (options.indexOf(previousValue) !== -1) {
            topicSelect.value = previousValue;
        } else if (options.length) {
            topicSelect.value = options[0];
        } else if (includeCustom) {
            topicSelect.value = '__custom__';
        }
        App.i18n.updateCustomTopicUI();
    }

};
