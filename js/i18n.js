window.App = window.App || {};

App.i18n = {

    // --- Callback registry for language change notifications ---
    _languageCallbacks: [],

    registerLanguageCallback: function(fn) {
        App.i18n._languageCallbacks.push(fn);
    },

    // --- Core language setter ---
    setLanguage: function(lang) {
        var previousLang = App.state.currentLang;
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

        document.querySelectorAll('[data-translate-key]').forEach(function(el) {
            var key = el.dataset.translateKey;
            var keys = key.split('.');
            var translation = App.translations[lang];
            try {
                for (var i = 0; i < keys.length; i++) {
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
                Object.entries(translation).forEach(function(pair) {
                    var label = el.querySelector('label[for="type-' + pair[0] + '"]');
                    if (label) label.textContent = pair[1];
                });
            } else if (typeof translation === 'object' && el.id === 'storybook-style-group') {
                // Handle storybook style labels
                var storybookTranslations = App.translations[lang].storybook;
                if (storybookTranslations) {
                    Object.entries(storybookTranslations).forEach(function(pair) {
                        if (pair[0].startsWith('style')) {
                            var styleKey = pair[0].replace('style', '').toLowerCase();
                            var label = el.querySelector('label[for="style-' + styleKey + '"]');
                            if (label) label.textContent = pair[1];
                        }
                    });
                }
            }
        });

        App.i18n.updateAllSelectOptions();
        var subjectGroup = document.getElementById('subject-group');
        var checkedSubject = subjectGroup ? subjectGroup.querySelector('input[name="subject"]:checked') : null;
        if (checkedSubject) {
            App.i18n.updateTopicSelection(checkedSubject.value);
        }

        // Re-render view components (safety-checked)
        if (App.views && App.views.aiTutor && App.views.aiTutor.renderExpertCards) {
            App.views.aiTutor.renderExpertCards();
        }
        if (App.views && App.views.aiDoctor && App.views.aiDoctor.renderDoctorCards) {
            App.views.aiDoctor.renderDoctorCards();
        }
        if (App.views && App.views.aiTutor && App.views.aiTutor.renderTutorCategories) {
            App.views.aiTutor.renderTutorCategories();
        }
        if (App.views && App.views.debate && App.views.debate.populateDebateSelects) {
            App.views.debate.populateDebateSelects();
        }
        if (App.views && App.views.debate && App.views.debate.renderDebateModules) {
            App.views.debate.renderDebateModules();
        }

        App.i18n.updateStorybookSummary(App.state.storybookFiles ? App.state.storybookFiles.length : 0);
        App.i18n.updateTutoringSummary(App.state.tutoringFiles ? App.state.tutoringFiles.length : 0);

        var generateStoryBtn = document.getElementById('generate-story-btn');
        var analyzeHomeworkBtn = document.getElementById('analyze-homework-btn');
        var fileNameDisplay = document.getElementById('file-name-display');

        if (generateStoryBtn) generateStoryBtn.disabled = App.state.storybookFiles.length === 0;
        if (analyzeHomeworkBtn) analyzeHomeworkBtn.disabled = App.state.tutoringFiles.length === 0;
        if (fileNameDisplay) {
            if (App.state.tutoringFiles.length > 0) {
                fileNameDisplay.textContent = App.state.tutoringFiles.map(function(file) { return file.name; }).join(', ');
            } else {
                var noFile = (App.translations[App.state.currentLang] && App.translations[App.state.currentLang].tutoring && App.translations[App.state.currentLang].tutoring.noFileSelected) ||
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
        document.querySelectorAll('button[data-translate-key]').forEach(function(btn) {
            var key = btn.dataset.translateKey;
            var keys = key.split('.');
            var translation = App.translations[lang];
            try { for (var i = 0; i < keys.length; i++) { translation = translation[keys[i]]; } } catch(e) { translation = undefined; }
            if (typeof translation === 'string') {
                var textSpan = btn.querySelector('.btn-text');
                if (textSpan) { textSpan.textContent = translation; } else { btn.textContent = translation; }
            }
        });

        // Ensure select labels are updated correctly
        document.querySelectorAll('label[data-translate-key]').forEach(function(lbl) {
            var key = lbl.dataset.translateKey;
            var keys = key.split('.');
            var translation = App.translations[lang];
            try { for (var i = 0; i < keys.length; i++) { translation = translation[keys[i]]; } } catch(e) { translation = undefined; }
            if (typeof translation === 'string') { lbl.textContent = translation; }
        });

        // Notify registered callbacks
        App.i18n._languageCallbacks.forEach(function(fn) { fn(lang); });
    },

    // --- Localized text helpers ---
    getLocalizedText: function(entry) {
        if (!entry) return '';
        if (typeof entry === 'string') return entry;
        return entry[App.state.currentLang] || entry['en'] || Object.values(entry)[0] || '';
    },

    getDebateTranslation: function(path) {
        var segments = path.split('.');
        var node = App.translations[App.state.currentLang] && App.translations[App.state.currentLang].debateCoach;
        var fallbackNode = App.translations['en'] && App.translations['en'].debateCoach;
        for (var i = 0; i < segments.length; i++) {
            node = node && node[segments[i]];
            fallbackNode = fallbackNode && fallbackNode[segments[i]];
        }
        return typeof node === 'string' ? node : (typeof fallbackNode === 'string' ? fallbackNode : '');
    },

    // --- File summary text helpers ---
    getStorybookSelectedText: function(count) {
        var template = (App.translations[App.state.currentLang] && App.translations[App.state.currentLang].storybook && App.translations[App.state.currentLang].storybook.selectedCount) ||
            (App.translations['en'] && App.translations['en'].storybook && App.translations['en'].storybook.selectedCount) ||
            'Selected {count} file(s)';
        return template.replace('{count}', count);
    },

    getTutoringSelectedText: function(count) {
        var template = (App.translations[App.state.currentLang] && App.translations[App.state.currentLang].tutoring && App.translations[App.state.currentLang].tutoring.selectedCount) ||
            (App.translations['en'] && App.translations['en'].tutoring && App.translations['en'].tutoring.selectedCount) ||
            'Selected {count} file(s)';
        return template.replace('{count}', count);
    },

    getDoctorSelectedText: function(count) {
        var template = (App.translations[App.state.currentLang] && App.translations[App.state.currentLang].aiDoctor && App.translations[App.state.currentLang].aiDoctor.selectedCount) ||
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
        var storybookFileSummary = document.getElementById('storybook-file-summary');
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
        var tutoringFileSummary = document.getElementById('tutoring-file-summary');
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
        var aiDoctorFileSummary = document.getElementById('ai-doctor-file-summary');
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
        var langKey = App.state.currentLang;
        var tutoringLevelSelect = document.getElementById('tutoring-level');
        var tutoringSubjectSelect = document.getElementById('tutoring-subject');
        var tutoringLanguageSelect = document.getElementById('tutoring-language');
        var storybookLanguageSelect = document.getElementById('storybook-language');
        var storybookAgeSelect = document.getElementById('storybook-age');

        // Tutoring Levels
        if (tutoringLevelSelect) {
            tutoringLevelSelect.innerHTML = (App.data.tutoring_levels[langKey] || App.data.tutoring_levels['en']).map(function(level) {
                return '<option class="text-black">' + level + '</option>';
            }).join('');
        }
        // Tutoring Subjects
        if (tutoringSubjectSelect) {
            tutoringSubjectSelect.innerHTML = (App.data.tutoring_subjects[langKey] || App.data.tutoring_subjects['en']).map(function(subject) {
                return '<option class="text-black">' + subject + '</option>';
            }).join('');
        }
        // Tutoring/Storybook languages
        var langOptions = Object.keys(App.translations).map(function(key) {
            var langName = new Intl.DisplayNames([langKey], {type: 'language'}).of(key) || key;
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
            storybookAgeSelect.innerHTML = (App.data.storybook_ages[langKey] || App.data.storybook_ages['en']).map(function(age) {
                return '<option class="text-black" value="' + age + '">' + age + '</option>';
            }).join('');
        }
    },

    // --- Custom topic label sync ---
    syncCustomTopicOptionLabel: function() {
        var topicSelect = document.getElementById('topic-select');
        if (!topicSelect) return;
        var customOption = topicSelect.querySelector('option[value="__custom__"]');
        if (customOption) {
            var customTopicInput = document.getElementById('custom-topic-input');
            var customValue = customTopicInput ? customTopicInput.value.trim() : '';
            customOption.textContent = customValue
                ? App.i18n.getCustomTopicOptionText() + ' (' + customValue + ')'
                : App.i18n.getCustomTopicOptionText();
        }
    },

    // --- Custom topic UI updater ---
    updateCustomTopicUI: function() {
        var customTopicWrapper = document.getElementById('custom-topic-wrapper');
        if (!customTopicWrapper) return;
        var subjectGroup = document.getElementById('subject-group');
        var topicSelect = document.getElementById('topic-select');
        var subjectInput = subjectGroup ? subjectGroup.querySelector('input[name="subject"]:checked') : null;
        var subject = subjectInput ? subjectInput.value : '';
        var allowCustom = App.i18n.allowsCustomTopic(subject);
        var isCustomSelected = topicSelect && topicSelect.value === '__custom__';
        App.i18n.syncCustomTopicOptionLabel();
        customTopicWrapper.classList.toggle('hidden', !(allowCustom && isCustomSelected));
    },

    // --- Check if subject allows custom topic ---
    allowsCustomTopic: function(subject) {
        return true; // All subjects support custom topics
    },

    // --- Topic selection updater ---
    updateTopicSelection: function(subject) {
        var topicSelect = document.getElementById('topic-select');
        if (!topicSelect) return;
        var topicsMap = (App.translations[App.state.currentLang] && App.translations[App.state.currentLang].topics) || App.translations['en'].topics;
        var topics = topicsMap[subject] || [];
        var previousValue = topicSelect.value;
        var includeCustom = App.i18n.allowsCustomTopic(subject);
        var options = topics.slice();
        topicSelect.innerHTML = options.map(function(topic) {
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
