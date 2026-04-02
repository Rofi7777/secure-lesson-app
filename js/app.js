window.App = window.App || {};
App.views = App.views || {};

document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM Elements (looked up once) ---
    const els = {
        // Global
        languageSwitcher: document.getElementById('language-switcher'),
        mainNav: document.getElementById('main-nav'),
        views: document.querySelectorAll('.view-content'),

        // Platform View
        generateLessonBtn: document.getElementById('generate-lesson-btn'),
        lessonContainer: document.getElementById('lesson-container'),
        topicSelect: document.getElementById('topic-select'),
        customTopicWrapper: document.getElementById('custom-topic-wrapper'),
        customTopicInput: document.getElementById('custom-topic-input'),
        errorMessage: document.getElementById('error-message'),
        subjectGroup: document.getElementById('subject-group'),

        // Tutoring View
        startUploadBtn: document.getElementById('start-upload-btn'),
        tutoringInitialView: document.getElementById('tutoring-initial-view'),
        tutoringUploadView: document.getElementById('tutoring-upload-view'),
        tutoringResultsView: document.getElementById('tutoring-results-view'),
        fileDropZone: document.getElementById('file-drop-zone'),
        homeworkFileInput: document.getElementById('homework-file-input'),
        fileNameDisplay: document.getElementById('file-name-display'),
        tutoringFileSummary: document.getElementById('tutoring-file-summary'),
        analyzeHomeworkBtn: document.getElementById('analyze-homework-btn'),
        tutoringLevelSelect: document.getElementById('tutoring-level'),
        tutoringSubjectSelect: document.getElementById('tutoring-subject'),
        tutoringLanguageSelect: document.getElementById('tutoring-language'),
        tutoringCustomSubjectWrapper: document.getElementById('tutoring-custom-subject-wrapper'),
        tutoringCustomSubjectInput: document.getElementById('tutoring-custom-subject-input'),
        keyConceptsContainer: document.getElementById('key-concepts-container'),
        tutoringVocabCard: document.getElementById('tutoring-vocab-card'),
        tutoringVocabContainer: document.getElementById('tutoring-vocabulary-container'),
        problemAnalysisContainer: document.getElementById('problem-analysis-container'),
        tutoringErrorMessage: document.getElementById('tutoring-error-message'),

        // Storybook View
        startStorybookBtn: document.getElementById('start-storybook-upload-btn'),
        storybookInitialView: document.getElementById('storybook-initial-view'),
        storybookMainView: document.getElementById('storybook-main-view'),
        storybookFileDropZone: document.getElementById('storybook-file-drop-zone'),
        storybookFileInput: document.getElementById('storybook-file-input'),
        storybookPreviewImg: document.getElementById('storybook-preview-img'),
        storybookUploadPlaceholder: document.getElementById('storybook-upload-placeholder'),
        storybookFileSummary: document.getElementById('storybook-file-summary'),
        generateStoryBtn: document.getElementById('generate-story-btn'),
        storyOutputContainer: document.getElementById('story-output-container'),
        storyDisplayContainer: document.getElementById('story-display-container'),
        audioControls: document.getElementById('audio-controls'),
        playStoryBtn: document.getElementById('play-story-btn'),
        downloadAudioBtn: document.getElementById('download-audio-btn'),
        storybookLanguageSelect: document.getElementById('storybook-language'),
        storybookAgeSelect: document.getElementById('storybook-age'),
        storybookErrorMessage: document.getElementById('storybook-error-message'),

        // AI Tutor View
        aiTutorInput: document.getElementById('ai-tutor-input'),
        aiTutorCategoryGroup: document.getElementById('ai-tutor-category-group'),
        aiTutorExpertGroup: document.getElementById('ai-tutor-expert-group'),
        getAdviceBtn: document.getElementById('get-advice-btn'),
        aiTutorResponseContainer: document.getElementById('ai-tutor-response-container'),
        aiTutorErrorMessage: document.getElementById('ai-tutor-error-message'),

        // Modal
        imageModal: document.getElementById('image-modal'),
        modalImage: document.getElementById('modal-image'),
        closeModalBtn: document.getElementById('close-modal'),
    };

    // Make elements available globally for other modules
    App.els = els;

    // --- View Switching ---
    function switchView(viewId) {
        els.views.forEach(view => view.classList.add('hidden'));
        document.getElementById(viewId)?.classList.remove('hidden');
        els.mainNav.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewId);
        });
        // Clear chat history when switching away from tutor view
        if (viewId !== 'ai-tutor-view') {
            App.state.aiTutorChatHistory = [];
            els.aiTutorResponseContainer.innerHTML = '';
            els.aiTutorResponseContainer.classList.add('hidden');
        }
        if (viewId === 'admin-view') {
            App.views.admin.loadAdminData();
        }
        if (viewId === 'platform-view') {
            renderDashboard();
        }
    }

    // --- Learning Dashboard ---
    function renderDashboard() {
        const dashEl = document.getElementById('learning-dashboard');
        if (!dashEl || !App.learningTracker) return;
        const stats = App.learningTracker.getStats();
        if (stats.totalLessons === 0) {
            dashEl.classList.add('hidden');
            return;
        }
        dashEl.classList.remove('hidden');
        document.getElementById('dash-total').textContent = stats.totalLessons;
        document.getElementById('dash-streak').textContent = stats.streak;
        document.getElementById('dash-days').textContent = stats.activeDays;

        const recentEl = document.getElementById('dash-recent');
        const lang = App.state.currentLang;
        const dashT = App.translations[lang]?.dashboard || App.translations['en']?.dashboard || {};
        if (stats.recentTopics.length > 0) {
            recentEl.innerHTML = '<p class="text-sm font-medium text-indigo-200 mb-2">' + (dashT.recentTitle || 'Recent') + '</p>' +
                stats.recentTopics.slice(0, 5).map(t => {
                    const date = new Date(t.ts).toLocaleDateString();
                    return '<div class="flex justify-between items-center bg-white/5 rounded px-3 py-2 text-sm">' +
                        '<span class="text-white">' + t.topic + ' <span class="text-indigo-300">(' + t.subject + ')</span></span>' +
                        '<span class="text-indigo-300 text-xs">' + date + '</span></div>';
                }).join('');
        }
    }

    // --- Navigation ---
    function handleNavClick(e) {
        const btn = e.target.closest('.nav-btn');
        if (btn) {
            switchView(btn.dataset.view);
        }
    }

    // --- Lesson Events (delegated from lessonContainer) ---
    async function handleLessonEvents(e) {
        const langTabBtn = e.target.closest('.lesson-lang-btn');
        if (langTabBtn) {
            const lang = langTabBtn.dataset.lang;
            document.getElementById('lesson-explanation').textContent = App.state.currentLesson.explanation[lang];
            // Update vocabulary and phrases based on new lang
            const vocabList = document.getElementById('vocabulary-list');
            const phrasesList = document.getElementById('phrases-list');
            if (vocabList) vocabList.innerHTML = App.views.platform.createVocabularyHtmlForLang(lang);
            if (phrasesList) phrasesList.innerHTML = App.views.platform.createPhrasesHtmlForLang(lang);
            // Update active tab
            els.lessonContainer.querySelectorAll('.lesson-lang-btn').forEach(btn => btn.classList.remove('active'));
            langTabBtn.classList.add('active');
            return;
        }

        const genAudioBtn = e.target.closest('.generate-explanation-audio-btn');
        if (genAudioBtn) {
            const lang = genAudioBtn.dataset.lang;
            const voiceType = genAudioBtn.dataset.voice || 'default';
            const text = App.state.currentLesson.explanation[lang];
            if (!text) return;

            els.errorMessage.classList.add('hidden');
            App.utils.setLoading(genAudioBtn, true);
            try {
                const speechProfile = App.utils.getLessonSpeechProfile(lang);
                let audioBlob;
                if (voiceType === 'dialogue') {
                    audioBlob = await App.views.platform.generateDialogueAudio(text, lang);
                } else {
                    const voiceName = App.config.voiceProfiles[voiceType] || App.config.voiceProfiles.default;
                    audioBlob = await App.api.callTTSAPI(text, null, { speechProfile, voiceName });
                }
                const blobKey = `${lang}-${voiceType}`;
                App.state.explanationAudioBlobs[blobKey] = audioBlob;

                const playerContainer = document.getElementById(`audio-player-${lang}-${voiceType}`);
                const audioEl = playerContainer.querySelector('audio');
                const downloadLink = playerContainer.querySelector('.download-link');

                const audioUrl = URL.createObjectURL(audioBlob);
                audioEl.src = audioUrl;
                App.utils.applyPlaybackRate(audioEl, speechProfile);
                downloadLink.href = audioUrl;
                let downloadSuffix = '';
                if (voiceType !== 'default') {
                    downloadSuffix = voiceType === 'dialogue' ? '-dialogue' : `-${voiceType}`;
                }
                downloadLink.download = `explanation-${lang}${downloadSuffix}.wav`;

                playerContainer.classList.remove('hidden');
                playerContainer.classList.add('flex');
            } catch (error) {
                console.error("Explanation Audio Error:", error);
                App.utils.displayError(els.errorMessage, `Audio generation for ${lang} failed: ${error.message}`);
            } finally {
                App.utils.setLoading(genAudioBtn, false);
            }
            return;
        }

        const playBtn = e.target.closest('.play-audio-btn');
        if (playBtn) {
            App.views.platform.playAudio(e);
        }
    }

    // --- Follow-up Click (AI Tutor) ---
    function handleFollowUpClick(e, isDoctor) {
        const suggestedBtn = e.target.closest('.suggested-question-btn');
        if (suggestedBtn) {
            App.views.aiTutor.getAdviceOrDiagnosis(isDoctor, suggestedBtn.textContent);
            return;
        }

        const sendBtn = e.target.closest('.send-follow-up-btn');
        if (sendBtn) {
            const input = sendBtn.previousElementSibling;
            if (input && input.value.trim()) {
                App.views.aiTutor.getAdviceOrDiagnosis(isDoctor, input.value.trim());
            }
            return;
        }
    }

    // --- Chat Button Status ---
    function checkChatButtonStatus(inputEl, expertGroup, buttonEl) {
        const text = inputEl.value.trim();
        const expertSelected = expertGroup.querySelector('.expert-card.selected');
        buttonEl.disabled = !(text && expertSelected);
    }

    // --- AI Personalization Stubs (no-op in internal mode) ---
    async function logUserBehavior(actionType, actionDetails = {}) {
        return;
    }

    async function callGeminiAPIWithPersonalization(userPrompt, baseSystemPrompt = '', imageBase64 = null, context = {}) {
        const personalizedPrompt = null;
        const finalSystemPrompt = personalizedPrompt
            ? `${baseSystemPrompt}\n\n${personalizedPrompt}`
            : baseSystemPrompt;
        return await App.api.callGeminiAPI(userPrompt, finalSystemPrompt, imageBase64);
    }

    // Expose stubs globally for any module that might reference them
    App.logUserBehavior = logUserBehavior;
    App.callGeminiAPIWithPersonalization = callGeminiAPIWithPersonalization;

    // --- init() — all event bindings ---
    function init() {
        els.mainNav.addEventListener('click', handleNavClick);
        els.languageSwitcher.addEventListener('change', (e) => App.i18n.setLanguage(e.target.value));

        // Admin tab switching
        const adminTabPending = document.getElementById('admin-tab-pending');
        const adminTabAuthorized = document.getElementById('admin-tab-authorized');
        const adminPendingTab = document.getElementById('admin-pending-tab');
        const adminAuthorizedTab = document.getElementById('admin-authorized-tab');
        const refreshPendingBtn = document.getElementById('refresh-pending-btn');
        const refreshAuthorizedBtn = document.getElementById('refresh-authorized-btn');

        adminTabPending?.addEventListener('click', () => {
            adminTabPending.classList.add('border-yellow-400', 'text-yellow-400');
            adminTabPending.classList.remove('border-transparent');
            adminTabAuthorized?.classList.remove('border-yellow-400', 'text-yellow-400');
            adminTabAuthorized?.classList.add('border-transparent');
            adminPendingTab?.classList.remove('hidden');
            adminAuthorizedTab?.classList.add('hidden');
        });

        adminTabAuthorized?.addEventListener('click', () => {
            adminTabAuthorized.classList.add('border-yellow-400', 'text-yellow-400');
            adminTabAuthorized.classList.remove('border-transparent');
            adminTabPending?.classList.remove('border-yellow-400', 'text-yellow-400');
            adminTabPending?.classList.add('border-transparent');
            adminAuthorizedTab?.classList.remove('hidden');
            adminPendingTab?.classList.add('hidden');
        });

        refreshPendingBtn?.addEventListener('click', async () => {
            const container = document.getElementById('pending-users-container');
            try {
                container.innerHTML = '<div class="text-center text-indigo-200 py-8"><div class="loader mx-auto mb-2"></div><p>載入中...</p></div>';
                const result = await App.views.admin.callAdminFunction('get_pending_users');
                App.views.admin.renderPendingUsers(result.users || []);
            } catch (error) {
                container.innerHTML = `<div class="text-center text-red-300 py-8"><p>載入失敗: ${error.message}</p></div>`;
            }
        });

        refreshAuthorizedBtn?.addEventListener('click', async () => {
            const container = document.getElementById('authorized-users-container');
            try {
                container.innerHTML = '<div class="text-center text-indigo-200 py-8"><div class="loader mx-auto mb-2"></div><p>載入中...</p></div>';
                const result = await App.views.admin.callAdminFunction('get_authorized_users');
                App.views.admin.renderAuthorizedUsers(result.users || []);
            } catch (error) {
                container.innerHTML = `<div class="text-center text-red-300 py-8"><p>載入失敗: ${error.message}</p></div>`;
            }
        });

        // Platform view bindings
        els.generateLessonBtn.addEventListener('click', App.views.platform.generateLesson);
        els.subjectGroup.addEventListener('change', (e) => {
            if (e.target.name === 'subject') {
                App.i18n.updateTopicSelection(e.target.value);
                if (els.customTopicInput) els.customTopicInput.value = '';
                App.i18n.updateCustomTopicUI();
            }
        });
        els.lessonContainer.addEventListener('click', handleLessonEvents);
        els.closeModalBtn.addEventListener('click', () => {
            els.imageModal.classList.add('hidden');
            els.imageModal.classList.remove('flex');
        });

        // Close details modal
        const closeDetailsModalBtn = document.getElementById('close-details-modal');
        const detailsModal = document.getElementById('details-modal');
        if (closeDetailsModalBtn && detailsModal) {
            closeDetailsModalBtn.addEventListener('click', () => {
                detailsModal.classList.add('hidden');
                detailsModal.classList.remove('flex');
            });
            detailsModal.addEventListener('click', (e) => {
                if (e.target === detailsModal) {
                    detailsModal.classList.add('hidden');
                    detailsModal.classList.remove('flex');
                }
            });
        }

        // Tutoring view bindings
        els.startUploadBtn.addEventListener('click', () => {
            els.tutoringInitialView.classList.add('hidden');
            els.tutoringUploadView.classList.remove('hidden');
            App.state.tutoringFiles = [];
            if (els.homeworkFileInput) els.homeworkFileInput.value = '';
            if (els.fileNameDisplay) els.fileNameDisplay.textContent = App.translations[App.state.currentLang]?.tutoring?.noFileSelected || App.translations['en']?.tutoring?.noFileSelected || 'No file selected';
            App.i18n.updateTutoringSummary(0);
            els.analyzeHomeworkBtn.disabled = true;
        });
        App.utils.setupFileHandling(
            els.fileDropZone,
            els.homeworkFileInput,
            null,
            null,
            els.fileNameDisplay,
            els.analyzeHomeworkBtn,
            (files) => App.state.tutoringFiles = files,
            {
                multiple: true,
                maxFiles: 10,
                acceptPrefix: null,
                onFilesProcessed: (files) => {
                    App.i18n.updateTutoringSummary(files.length);
                    els.analyzeHomeworkBtn.disabled = files.length === 0;
                }
            }
        );
        els.tutoringSubjectSelect.addEventListener('change', (e) => {
            const otherValues = ['Other', '其他', 'Khác', 'その他'];
            els.tutoringCustomSubjectWrapper.classList.toggle('hidden', !otherValues.includes(e.target.value));
        });
        els.analyzeHomeworkBtn.addEventListener('click', App.views.tutoring.analyzeHomework);
        els.tutoringResultsView.addEventListener('click', (e) => App.views.platform.playAudio(e));

        // Topic / custom topic bindings
        els.topicSelect.addEventListener('change', () => {
            App.i18n.updateCustomTopicUI();
            if (els.topicSelect.value !== '__custom__') {
                if (els.customTopicInput && !els.customTopicInput.value.trim()) {
                    App.i18n.syncCustomTopicOptionLabel();
                }
            } else if (els.customTopicInput) {
                els.customTopicInput.focus();
            }
        });
        if (els.customTopicInput) {
            els.customTopicInput.addEventListener('input', () => {
                if (els.topicSelect.value === '__custom__') {
                    App.i18n.syncCustomTopicOptionLabel();
                }
            });
        }

        // Storybook view bindings
        els.startStorybookBtn.addEventListener('click', () => {
            els.storybookInitialView.classList.add('hidden');
            els.storybookMainView.classList.remove('hidden');
            App.state.storybookFiles = [];
            if (els.storybookFileInput) els.storybookFileInput.value = '';
            if (els.storybookPreviewImg) {
                els.storybookPreviewImg.src = '';
                els.storybookPreviewImg.classList.add('hidden');
            }
            if (els.storybookUploadPlaceholder) els.storybookUploadPlaceholder.classList.remove('hidden');
            App.i18n.updateStorybookSummary(0);
            if (els.generateStoryBtn) els.generateStoryBtn.disabled = true;
        });
        App.utils.setupFileHandling(
            els.storybookFileDropZone,
            els.storybookFileInput,
            els.storybookPreviewImg,
            els.storybookUploadPlaceholder,
            null,
            els.generateStoryBtn,
            (files) => App.state.storybookFiles = files,
            {
                multiple: true,
                maxFiles: 10,
                acceptPrefix: 'image/',
                onFilesProcessed: (files) => {
                    App.i18n.updateStorybookSummary(files.length);
                    els.generateStoryBtn.disabled = files.length === 0;
                }
            }
        );
        els.generateStoryBtn.addEventListener('click', App.views.storybook.generateStory);
        els.playStoryBtn.addEventListener('click', () => {
            if (App.state.storyAudioUrl) new Audio(App.state.storyAudioUrl).play();
        });
        els.downloadAudioBtn.addEventListener('click', () => {
            if (App.state.storyAudioBlob) {
                const url = URL.createObjectURL(App.state.storyAudioBlob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'story.wav';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            }
        });

        // AI Tutor view bindings
        els.aiTutorExpertGroup.addEventListener('click', (e) => {
            const card = e.target.closest('.expert-card');
            if (card) {
                els.aiTutorExpertGroup.querySelectorAll('.expert-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                checkChatButtonStatus(els.aiTutorInput, els.aiTutorExpertGroup, els.getAdviceBtn);
            }
        });
        els.aiTutorInput.addEventListener('input', () => checkChatButtonStatus(els.aiTutorInput, els.aiTutorExpertGroup, els.getAdviceBtn));
        els.getAdviceBtn.addEventListener('click', () => App.views.aiTutor.getAdviceOrDiagnosis(false));
        els.aiTutorResponseContainer.addEventListener('click', (e) => handleFollowUpClick(e, false));

        // Pinyin toggle init
        App.pinyin.init();

        // --- Startup ---
        App.i18n.setLanguage(App.state.currentLang);
        switchView('platform-view');
    }

    init();
});
