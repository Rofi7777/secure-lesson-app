
    document.addEventListener('DOMContentLoaded', () => {

        // --- State Management ---
        let currentLang = 'zh-Hant';
        let currentLesson = null;
        let storyAudioBlob = null;
        let storyAudioUrl = null;
        let aiTutorChatHistory = [];
        let aiDoctorChatHistory = [];
        let storybookFiles = [];
        let tutoringFiles = [];
        let aiDoctorFiles = [];
        let explanationAudioBlobs = {};
        let currentLessonType = '教學課程';
        let audioButtonCounter = 0;
        const generatedAudioCache = new Map();
        let debateState = {
            motionId: 'ban-homework',
            side: 'pro',
            level: 'beginner',
            customMotionTitle: '',
            timers: {},
            recording: {
                case: { status: 'idle' },
                rebuttal: { status: 'idle' },
                crossfire: { status: 'idle' },
                feedback: { status: 'idle' },
                oral: { status: 'idle' }
            },
            moduleResults: {
                case: null,
                rebuttal: null,
                crossfire: null,
                feedback: null,
                oral: null
            },
            showBilingualMotion: true
        };
        const lessonAudioLanguages = new Set(['en', 'zh-Hant', 'vi', 'ja']);
        const lessonSpeechProfiles = {
            'Under 5': { apiRate: 0.6, playbackRate: 0.8 },
            '6-10 years': { apiRate: 0.85, playbackRate: 0.9 }
        };
        const voiceProfiles = {
            default: 'Kore', // Neutral/female-friendly voice
            female: 'Kore',
            male: 'Puck' // Distinct male voice provided by Gemini TTS
        };

        function getSelectedLessonAgeGroup() {
            return document.querySelector('input[name="age"]:checked')?.value || '';
        }

        function getActiveLessonLanguage() {
            return document.querySelector('#lesson-lang-tabs .lesson-lang-btn.active')?.dataset.lang || null;
        }

        function getLessonSpeechProfile(languageHint) {
            const ageGroup = getSelectedLessonAgeGroup();
            const profile = lessonSpeechProfiles[ageGroup];
            if (!profile) return null;

            const lang = languageHint || getActiveLessonLanguage();
            if (lang && !lessonAudioLanguages.has(lang)) return null;

            return { ...profile };
        }
        
        function applyPlaybackRate(mediaEl, speechProfile) {
            if (!speechProfile?.playbackRate || !mediaEl) return;
            if (typeof mediaEl.playbackRate === 'number') {
                mediaEl.playbackRate = speechProfile.playbackRate;
                mediaEl.defaultPlaybackRate = speechProfile.playbackRate;
            }
            if ('preservesPitch' in mediaEl) mediaEl.preservesPitch = true;
            if ('mozPreservesPitch' in mediaEl) mediaEl.mozPreservesPitch = true;
            if ('webkitPreservesPitch' in mediaEl) mediaEl.webkitPreservesPitch = true;
        }
        
        function playAudioBlob(blob, speechProfile = null, onPlaybackError = null) {
            if (!blob) {
                if (typeof onPlaybackError === 'function') {
                    onPlaybackError(new Error('No audio data was generated.'));
                }
                return;
            }
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            let revoked = false;
            const cleanup = () => {
                if (!revoked) {
                    URL.revokeObjectURL(audioUrl);
                    revoked = true;
                }
            };
            audio.addEventListener('ended', cleanup, { once: true });
            audio.addEventListener('error', () => {
                cleanup();
                if (typeof onPlaybackError === 'function') {
                    onPlaybackError(new Error('Audio element was unable to decode the generated file.'));
                }
            }, { once: true });
            applyPlaybackRate(audio, speechProfile);
            const playPromise = audio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(error => {
                    cleanup();
                    if (typeof onPlaybackError === 'function') {
                        onPlaybackError(error);
                    } else {
                        console.error('Audio playback error:', error);
                    }
                });
            }
        }
        
        function splitTextIntoDialogueSentences(text) {
            if (!text) return [];
            const normalized = text.replace(/\r/g, '\n').trim();
            if (!normalized) return [];
            let sentences = normalized.match(/[^。！？!?…]+[。！？!?…]?/gu) || [];
            sentences = sentences.map(s => s.trim()).filter(Boolean);
            if (sentences.length < 2) {
                const byLine = normalized.split(/\n+/).map(s => s.trim()).filter(Boolean);
                if (byLine.length > sentences.length) sentences = byLine;
            }
            if (sentences.length < 2 && normalized.length > 40) {
                const mid = Math.floor(normalized.length / 2);
                const firstHalf = normalized.slice(0, mid).trim();
                const secondHalf = normalized.slice(mid).trim();
                sentences = [firstHalf, secondHalf].filter(Boolean);
            }
            return sentences.length ? sentences : [normalized];
        }
        
        async function concatWavBlobs(blobs) {
            if (!blobs.length) throw new Error('No audio segments to merge.');
            if (blobs.length === 1) return blobs[0];
            const buffers = await Promise.all(blobs.map(blob => blob.arrayBuffer()));
            const headerBytes = new Uint8Array(buffers[0].slice(0, 44));
            const totalDataLength = buffers.reduce((sum, buffer) => sum + Math.max(0, buffer.byteLength - 44), 0);
            const outputBuffer = new ArrayBuffer(44 + totalDataLength);
            const outputBytes = new Uint8Array(outputBuffer);
            outputBytes.set(headerBytes, 0);
            const view = new DataView(outputBuffer);
            view.setUint32(4, 36 + totalDataLength, true);
            view.setUint32(40, totalDataLength, true);
            let offset = 44;
            for (const buffer of buffers) {
                const dataBytes = new Uint8Array(buffer, 44);
                outputBytes.set(dataBytes, offset);
                offset += dataBytes.byteLength;
            }
            return new Blob([outputBuffer], { type: 'audio/wav' });
        }
        
        async function generateDialogueAudio(text, lang) {
            const sentences = splitTextIntoDialogueSentences(text);
            const voiceOrder = ['female', 'male'];
            const speechProfile = getLessonSpeechProfile(lang);
            const localeVoiceLabels = translations[currentLang]?.voiceLabels || {};
            const segments = sentences.map((sentence, idx) => {
                const voiceKey = voiceOrder[idx % voiceOrder.length];
                const voiceName = voiceProfiles[voiceKey] || voiceProfiles.default;
                const labelPrefix = localeVoiceLabels[voiceKey] ? `${localeVoiceLabels[voiceKey]}：` : '';
                return {
                    text: `${labelPrefix}${sentence}`,
                    voiceName
                };
            });
            const blobs = [];
            for (const segment of segments) {
                const segmentBlob = await callTTSAPI(segment.text, null, { speechProfile, voiceName: segment.voiceName });
                blobs.push(segmentBlob);
            }
            return concatWavBlobs(blobs);
        }

        // --- Translation Data ---
        const translations = {
            'zh-Hant': {
                main_title: 'LingoVerse AI', main_subtitle: '您的 AI 學習宇宙',
                nav: { learningPlatform: '多語言學習平台', studentTutoring: '學生課程輔導', storybookReading: '兒童繪本朗讀', aiTutor: 'AI 助教', aiDoctor: 'AI 小醫生', debateCoach: 'AI 辯論教練' },
                pageTitle: '多語言學習平台', pageSubtitle: '開始今天的學習冒險吧！', ageTitle: '1. 選擇年齡',
                age_under_5: '5歲以下', age_6_10: '6-10歲', age_10_15: '10-15歲', age_15_20: '15-20歲', age_over_20: '20歲以上',
                subjectTitle: '2. 選擇課程類型', subjectKidsEn: '兒童英文', subjectAdultEn: '成人英文', subjectSci: '科學', subjectMath: '數學', subjectHist: '歷史', subjectGeo: '地理',
                lessonTypeTitle: '3. 選擇類型',
                lessonType: { course: '教學課程', story: '啟發故事', vocab: '5個字彙與例句', qa: 'AI提問', dialogue: '雙人博客' },
                topicTitle: '4. 選擇主題', generateBtn: '生成學習計畫', imageTitle: 'AI 生成圖片', vocabTitle: '核心單字', phraseTitle: '實用短句', 
                topicCustomLabel: '自訂主題', topicCustomPlaceholder: '請輸入想學習的主題', topicCustomOption: '自訂主題', topicCustomError: '請先輸入自訂主題內容。',
                lessonLangTabs: { en: 'English', 'zh-Hant': '繁體中文', vi: 'Tiếng Việt', ja: '日本語' },
                genAudio: '生成{lang}語音',
                genAudioVariant: '生成{lang}{voice}語音',
                genDialogueAudio: '生成{lang}對話語音',
                downloadDialogueAudio: '下載{lang}對話語音',
                voiceLabels: { female: '女聲', male: '男聲' },
                dialogueBadge: '對話',
                downloadAudio: '下載{lang}語音',
                phoneticLabel: '音標', exampleLabel: '例句',
                downloadAudioBtn: '下載語音 (WAV)', imageError: '圖片生成失敗', audioError: '語音生成失敗', lessonError: '課程生成失敗: {message}',
                topics: {
                    'KidsEnglish': ['動物', '家庭', '顏色', '數字', '食物', '衣服', '身體部位', '天氣', '情緒', '學校'],
                    'AdultEnglish': ['商務會議', '旅行與觀光', '餐廳點餐', '工作面試', '社交活動', '健康與健身', '科技與網路', '購物', '新聞與時事', '電影與音樂'],
                    'Science': ['太陽系', '光合作用', '水循環', '人體骨骼', '物質三態', '電路基礎', '食物鏈', '火山與地震', '天氣與氣候', '細胞結構'],
                    'Math': ['加法與減法', '乘法與除法', '分數', '幾何形狀', '時間', '金錢計算', '測量長度與重量', '圖表與數據', '基礎代數', '機率'],
                    'History': ['中國歷史', '越南歷史', '古埃及文明', '古羅馬', '文藝復興', '大航海時代', '工業革命', '第一次世界大戰', '第二次世界大戰', '現代科技史'],
                    'Geography': ['世界首都', '著名地標', '海洋與大陸', '主要山脈', '世界主要河流', '世界沙漠', '熱帶雨林', '板塊構造', '氣候帶', '人類遷徙']
                },
                tutoring: {
                    title: '學生課程輔導', subtitle: '拍照上傳作業，AI助教立即為您分析與指導！從此告別檢查作業的煩惱，讓AI提供專業的解題步驟、概念說明與個人化練習。', startUploadBtn: '立即上傳作業',
                    uploadTitle: '上傳作業', dragDropText: '點擊或拖曳檔案至此（可一次上傳 1-10 個檔案）', noFileSelected: '尚未選擇檔案',
                    levelLabel: '程度', subjectLabel: '科目', languageLabel: '語言', customSubjectLabel: '自定義科目', customSubjectPlaceholder: '請輸入科目名稱',
                    analyzeBtn: '開始分析', conceptsTitle: '重點導學', vocabTitle: '重點字彙', analysisTitle: '作業解析',
                    selectedCount: '已選擇 {count} 個檔案（最多 10 個）',
                    noFileError: '請先上傳至少一個檔案。'
                },
                storybook: {
                    title: '兒童繪本朗讀', subtitle: '上傳一張圖片，讓 AI 為您創作出獨一無二的有聲故事書！您可以選擇語言、年齡、風格，並隨意編輯，與孩子一同享受閱讀的樂趣。', startUploadBtn: '上傳繪本插圖',
                    illustrationTitle: '繪本插圖', dragDropText: '點擊或拖曳 1-10 張圖片', settingsTitle: '故事設定',
                    languageLabel: '語言', ageLabel: '年齡層', styleLabel: '故事風格', styleWarm: '暖心風格', styleAdventure: '冒險風格',
                    charNameLabel: '主要角色名稱 (選填)', charNamePlaceholder: '例如: 小兔子邦邦', generateBtn: '生成故事',
                    storyTitle: 'AI 創作的故事', storyPlaceholder: '點擊「生成故事」開始創作...',
                    selectedCount: '已選擇 {count} 張插圖（最多 10 張）',
                    noImageError: '請先上傳至少一張插圖。'
                },
                aiTutor: {
                    title: '🤖 AI 助教', subtitle: '向我們的 AI 專家團隊諮詢您孩子學習與行為上的問題。', inputLabel: '① 問題輸入區',
                    inputPlaceholder: '請詳細描述您觀察到的孩子學習或行為問題... (支援多語言：中文/英文/越南文)',
                    categoryLabel: '② 問題分類選擇', categories: { 'learning': '學習方法', 'behavior': '行為心理', 'language': '語言發展', 'emotion': '情緒管理', 'social': '社交關係', 'other': '其他' },
                    expertLabel: '③ AI 專家面板 (Expert Personas)', getAdviceBtn: '獲取建議',
                    summaryTitle: '{expertName} 總結與提問', followupLabel: '🤔 繼續追問', followupPlaceholder: '或者在這裡輸入您的下一個問題...', sendBtn: '傳送'
                },
                aiDoctor: {
                    title: '👩‍⚕️ AI 小醫生', subtitle: '描述症狀並上傳照片(選填)，我們的專業 AI 團隊將提供初步分析。', 
                    symptomLabel: '① 症狀描述', symptomPlaceholder: '請詳細描述您的症狀，例如：頭痛、胃痛、疲倦...',
                    uploadLabel: '② 上傳照片 (選填)', uploadText: '上傳患部或藥物照片（可一次上傳 1-10 張）',
                    expertLabel: '③ 選擇 AI 專家', getDiagnosisBtn: '獲取初步診斷',
                    selectedCount: '已選擇 {count} 張照片（最多 10 張）',
                    noFileError: '請先上傳至少一張照片。'
                },
                debateCoach: {
                    title: 'AI 辯論教練',
                    subtitle: '讓孩子透過 AI 練習辯論思維與英文表達力！',
                    settingsTitle: '練習設定',
                    selectMotion: '選擇辯論主題',
                    selectSide: '選擇立場',
                    selectLevel: '選擇等級',
                    settingsHint: '切換設定後，下方練習模組會載入對應的假資料。',
                    sidePro: '正方',
                    sideCon: '反方',
                    levelBeginner: '初階',
                    levelAdvanced: '進階',
                    practiceTitle: '練習模組',
                    practiceSubtitle: '點擊模組標題展開練習內容與工具',
                    motionLabel: '辯論題幹',
                    hint_ai_en_eval: 'AI 主要以英文評估。若以中文輸入，我們會先轉為英文再評估。',
                    toggle_bilingual: '顯示中英對照',
                    badges: { timer: '只計時', record: '錄音+AI評估' },
                    buttons: {
                        startTimer: '開始（只計時）',
                        recordStart: '錄音並開始',
                        stopRecording: '停止錄音',
                        recordRebuttal: '錄音反駁',
                        recordCrossfire: '錄音作答',
                        recordFeedback: '錄音取得評分',
                        recordOral: '錄音跟讀',
                        feedbackEvaluate: 'AI 教練評分',
                        showReference: '顯示參考稿'
                    },
                    statuses: {
                        uploading: '上傳中…',
                        transcribing: '語音轉寫中…',
                        evaluating: 'AI 評估中…'
                    },
                    panels: {
                        logic: '邏輯結構',
                        delivery: '口說表現',
                        rewrite: '改寫建議'
                    },
                    metrics: {
                        wpm: '每分鐘字數',
                        fillers: '填充詞',
                        pauses: '過長停頓次數'
                    },
                    caseNotesLabel: '口述重點筆記',
                    caseNotesPlaceholder: '列出你想強調的主張、例子與結論句。',
                    progressLabel: '錄音狀態',
                    resultPlaceholder: '完成錄音後，AI 會在此顯示評估結果。',
                    rebuttalResult: {
                        effectiveness: '反駁有效度',
                        directness: '直接回答率',
                        weighing: '建議 Weighing 句型'
                    },
                    crossfireResult: {
                        directness: '是否直接回答',
                        followup: '建議追問句',
                        language: '語病提醒'
                    },
                    feedbackExtras: {
                        audioLabel: '語音上傳/錄音',
                        scoresLabel: '評分面向',
                        referenceToggle: '顯示參考稿',
                        referenceHint: '以下為 AI 生成的 30–60 秒參考稿，可用於跟讀。'
                    },
                    oral: {
                        title: '口述/朗讀訓練（Beta）',
                        desc: '貼上你的稿子，按下錄音跟讀，AI 會標示卡詞與節奏建議。',
                        placeholder: '請貼上要練習的段落或立論稿...',
                        btnRecord: '錄音跟讀',
                        btnStop: '停止錄音',
                        resultPronunciation: '發音/卡詞',
                        resultPacing: '節奏/停頓'
                    },
                    tooltips: {
                        case: '依據 PEEL 結構練 60 秒立論，可選擇單純倒數或錄音並獲得 AI 評估。',
                        rebuttal: '閱讀模擬對手論點後，錄音提出反駁，AI 會標註力度與直接性。',
                        crossfire: '勾選三題後錄音回答，AI 檢查是否直接作答並提供追問建議。',
                        feedback: '貼上文字或錄音，AI 依內容/反駁/表達/策略給 40 分量表與指標。',
                        oral: '朗讀貼上的文字，AI 標示卡詞、發音與節奏問題，提供練習建議。'
                    },
                    modules: {
                        case60s: '一分鐘立論（60 秒 Case）',
                        rebuttal: '反駁衝刺（Rebuttal Sprint）',
                        crossfire: '交互質詢（Crossfire Builder）',
                        feedback: 'AI 教練回饋（AI Coach Feedback）'
                    },
                    timerLabel: '倒數計時',
                    startTimer: '開始',
                    resetTimer: '重設',
                    structureHeading: '立論結構',
                    structure: { claim: '主張', reason: '理由', evidence: '證據', closing: '結語' },
                    practiceNote: '請在 60 秒內完成口說演練，並在下方輸入框記錄重點。',
                    notesPlaceholder: '在此記錄你的口說提綱或重點...',
                    opponentHeading: '模擬對手論點',
                    yourResponse: '你的反駁',
                    evaluateBtn: 'AI 評估',
                    evaluationHeading: 'AI 評估回饋',
                    questionsHeading: '質詢題庫',
                    questionsNote: '請勾選最多三題進行回答練習。',
                    responseHeading: '回答草稿',
                    responsePlaceholder: '撰寫你的回答策略或重點...',
                    feedbackPrompt: '貼上或撰寫你的辯論稿',
                    feedbackPlaceholder: '將稿子貼在這裡，AI 將提供分數與改進建議...',
                    feedbackBtn: 'AI 教練評分',
                    feedbackResultHeading: 'AI 教練回饋',
                    rubricTitle: '辯論評分規準',
                    rubric: {
                        content: '內容',
                        refutation: '反駁',
                        delivery: '表達',
                        strategy: '策略',
                        total: '總分'
                    },
                    rubricDescriptions: {
                        content: '內容：論點清晰、有邏輯、有證據',
                        refutation: '反駁：能指出對手漏洞並提出合理反駁',
                        delivery: '表達：語速自然、發音清晰、語氣自信',
                        strategy: '策略：結構完整、時間掌控良好',
                        total: '總分（滿分 40 分）'
                    },
                    customMotion: {
                        option: '自訂主題',
                        label: '自訂辯論主題',
                        placeholder: '請輸入想要辯論的議題，例如：本院支持延長暑假。',
                        note: '輸入後，練習模組會提供空白模板，請自行填寫關鍵亮點。',
                        moduleNote: '下方各模組為空白模板，請在此整理你的論點、反駁與交互問題。',
                        fallbackTitle: '自訂辯論議題',
                        structure: {
                            claim: '在此草擬你的主張：你想要成立的命題是什麼？',
                            reason: '列出能支持主張的核心理由或原則。',
                            evidence: '紀錄你打算引用的證據、數據或真實案例。',
                            closing: '寫下總結句，重申對方若不接受將付出的代價。'
                        },
                        opponentPoints: [
                            '預先寫下對手可能提出的反對理由或攻擊線。',
                            '標記你需要補強的資訊或資料來源。',
                            '記錄準備在交互詰問時追問的問題。'
                        ],
                        questions: [
                            '對方最可能追問的核心焦點是什麼？',
                            '本題關鍵字如何定義才有利於我方？',
                            '若被質疑影響力，你會怎麼回應？',
                            '若被質疑可行性，你會怎麼回應？',
                            '有哪些價值衝突需要優先澄清？',
                            '若對方要求證據來源，你會引用什麼資料？',
                            '當被要求做權衡時，你的優先順序是？',
                            '對方若提出替代方案，你如何比較並勝出？'
                        ],
                        rebuttal: {
                            summary: '先肯定對方亮點 -> 指出漏洞或盲點 -> 拉回我方框架或價值。',
                            tips: [
                                '記錄準備引用的關鍵字或逐字句，方便口說時提起。',
                                '寫下兩個你最想反擊的重點，並練習一句話切入。'
                            ]
                        },
                        coach: {
                            score: '完成練習後，請為內容 / 反駁 / 表達 / 策略四個面向打分並寫下理由。',
                            tips: [
                                '簡述本次亮點與想改進之處，方便下一輪調整。',
                                '設定下一次練習的具體行動，例如補資料或重排架構。'
                            ]
                        }
                    }
                }
            },
            'en': {
                main_title: 'LingoVerse AI', main_subtitle: 'Your AI Learning Universe',
                nav: { learningPlatform: 'Learning Platform', studentTutoring: 'Student Tutoring', storybookReading: 'Storybook Reading', aiTutor: 'AI Tutor', aiDoctor: 'AI Doctor', debateCoach: 'AI Debate Coach' },
                pageTitle: 'Multilingual Learning Platform', pageSubtitle: "Let's start today's learning adventure!", ageTitle: '1. Select Age',
                age_under_5: 'Under 5', age_6_10: '6-10 years', age_10_15: '10-15 years', age_15_20: '15-20 years', age_over_20: 'Over 20',
                subjectTitle: '2. Select Course Type', subjectKidsEn: "Kids' English", subjectAdultEn: "Adult English", subjectSci: 'Science', subjectMath: 'Math', subjectHist: 'History', subjectGeo: 'Geography',
                lessonTypeTitle: '3. Select Type',
                lessonType: { course: 'Course', story: 'Story', vocab: '5 Vocab & Sentences', qa: 'AI Q&A', dialogue: 'Dialogue' },
                topicTitle: '4. Select Topic', generateBtn: 'Generate Learning Plan', imageTitle: 'AI Generated Image', vocabTitle: 'Core Vocabulary', phraseTitle: 'Useful Phrases',
                topicCustomLabel: 'Custom Topic', topicCustomPlaceholder: 'Type a topic you want to learn', topicCustomOption: 'Custom topic', topicCustomError: 'Please enter your custom topic first.',
                lessonLangTabs: { en: 'English', 'zh-Hant': 'Chinese', vi: 'Vietnamese', ja: 'Japanese' },
                genAudio: 'Generate {lang} Audio',
                genAudioVariant: 'Generate {lang} Audio ({voice})',
                genDialogueAudio: 'Generate {lang} Dialogue Audio',
                downloadDialogueAudio: 'Download {lang} Dialogue Audio',
                voiceLabels: { female: 'Female Voice', male: 'Male Voice' },
                dialogueBadge: 'Dialogue',
                downloadAudio: 'Download {lang} Audio',
                phoneticLabel: 'Phonetic', exampleLabel: 'Example',
                downloadAudioBtn: 'Download Audio (WAV)', imageError: 'Image generation failed', audioError: 'Audio generation failed', lessonError: 'Lesson Generation Error: {message}',
                topics: {
                    'KidsEnglish': ['Animals', 'Family', 'Colors', 'Numbers', 'Food', 'Clothes', 'Body Parts', 'Weather', 'Emotions', 'School'],
                    'AdultEnglish': ['Business Meetings', 'Travel & Tourism', 'Ordering at a Restaurant', 'Job Interviews', 'Social Events', 'Health & Fitness', 'Technology & Internet', 'Shopping', 'News & Current Events', 'Movies & Music'],
                    'Science': ['Solar System', 'Photosynthesis', 'Water Cycle', 'Human Skeleton', 'States of Matter', 'Basic Circuits', 'Food Chain', 'Volcanoes & Earthquakes', 'Weather & Climate', 'Cell Structure'],
                    'Math': ['Addition & Subtraction', 'Multiplication & Division', 'Fractions', 'Geometric Shapes', 'Time', 'Money', 'Measurement', 'Charts & Data', 'Basic Algebra', 'Probability'],
                    'History': ['Chinese History', 'Vietnamese History', 'Ancient Egypt', 'Ancient Rome', 'The Renaissance', 'Age of Discovery', 'Industrial Revolution', 'World War I', 'World War II', 'Modern Tech History'],
                    'Geography': ['World Capitals', 'Famous Landmarks', 'Oceans & Continents', 'Mountain Ranges', 'Major Rivers', 'Deserts', 'Rainforests', 'Tectonic Plates', 'Climate Zones', 'Human Migration']
                },
                tutoring: {
                    title: 'Student Tutoring', subtitle: 'Upload a photo of homework, and the AI tutor will immediately analyze and guide you! Say goodbye to the hassle of checking homework.', startUploadBtn: 'Upload Homework Now',
                    uploadTitle: 'Upload Homework', dragDropText: 'Click or drag files here (upload 1-10 items at a time)', noFileSelected: 'No file selected',
                    levelLabel: 'Level', subjectLabel: 'Subject', languageLabel: 'Language', customSubjectLabel: 'Custom Subject', customSubjectPlaceholder: 'Enter subject name',
                    analyzeBtn: 'Start Analysis', conceptsTitle: 'Key Concepts', vocabTitle: 'Key Vocabulary', analysisTitle: 'Homework Analysis',
                    selectedCount: 'Selected {count} file(s) (max 10)',
                    noFileError: 'Please upload at least one file first.'
                },
                storybook: {
                    title: 'Storybook Reading', subtitle: 'Upload an image and let AI create a unique audio storybook for you! You can choose the language, age, style, and edit it freely.', startUploadBtn: 'Upload Illustration',
                    illustrationTitle: 'Illustration', dragDropText: 'Click or drag 1-10 images', settingsTitle: 'Story Settings',
                    languageLabel: 'Language', ageLabel: 'Age Group', styleLabel: 'Story Style', styleWarm: 'Heartwarming', styleAdventure: 'Adventure',
                    charNameLabel: 'Main Character Name (Optional)', charNamePlaceholder: 'e.g., Bonny the Bunny', generateBtn: 'Generate Story',
                    storyTitle: "AI's Creative Story", storyPlaceholder: 'Click "Generate Story" to begin...',
                    selectedCount: 'Selected {count} illustration(s) (max 10)',
                    noImageError: 'Please upload at least one illustration first.'
                },
                aiTutor: {
                    title: '🤖 AI Tutor', subtitle: 'Ask our AI expert team about your child’s learning & behavior.', inputLabel: '① Problem Input Area',
                    inputPlaceholder: 'Describe the learning or behavioral problems you observe in your child... (Supports multiple languages: Chinese/English/Vietnamese)',
                    categoryLabel: '② Select Problem Category', categories: { 'learning': 'Learning Methods', 'behavior': 'Behavioral Psychology', 'language': 'Language Development', 'emotion': 'Emotion Management', 'social': 'Social Skills', 'other': 'Other' },
                    expertLabel: '③ Expert Personas Panel', getAdviceBtn: 'Get Advice',
                    summaryTitle: "{expertName}'s Summary & Questions", followupLabel: '🤔 Follow-up Questions', followupPlaceholder: 'Or enter your next question here...', sendBtn: 'Send'
                },
                aiDoctor: {
                    title: '👩‍⚕️ AI Doctor', subtitle: "Describe symptoms and upload a photo (optional). Our professional AI team will provide a preliminary analysis.", 
                    symptomLabel: '① Symptom Description', symptomPlaceholder: "Please describe your symptoms in detail, e.g., headache, stomachache, fatigue...",
                    uploadLabel: '② Upload Photo (Optional)', uploadText: 'Upload photo of the affected area or medication (upload 1-10 images)',
                    expertLabel: '③ Select AI Expert', getDiagnosisBtn: 'Get Preliminary Analysis',
                    selectedCount: 'Selected {count} photo(s) (max 10)',
                    noFileError: 'Please upload at least one photo first.'
                },
                debateCoach: {
                    title: 'AI Debate Coach',
                    subtitle: 'Help kids practise debate thinking and English expression with AI!',
                    settingsTitle: 'Practice Settings',
                    selectMotion: 'Choose a motion',
                    selectSide: 'Choose a side',
                    selectLevel: 'Choose a level',
                    settingsHint: 'Adjust the settings to load fresh mock content in the practice modules.',
                    sidePro: 'Pro',
                    sideCon: 'Con',
                    levelBeginner: 'Beginner',
                    levelAdvanced: 'Advanced',
                    practiceTitle: 'Practice Modules',
                    practiceSubtitle: 'Tap a module title to open the activities and tools',
                    motionLabel: 'Debate Motion',
                    hint_ai_en_eval: 'AI evaluates in English. If you respond in Chinese or another language, we will translate it into English before scoring.',
                    toggle_bilingual: 'Show bilingual motion',
                    badges: { timer: 'Timer only', record: 'Record + AI review' },
                    buttons: {
                        startTimer: 'Start (timer only)',
                        recordStart: 'Record & start',
                        stopRecording: 'Stop recording',
                        recordRebuttal: 'Record rebuttal',
                        recordCrossfire: 'Record answer',
                        recordFeedback: 'Record for scoring',
                        recordOral: 'Record & read aloud',
                        feedbackEvaluate: 'AI Coach Feedback',
                        showReference: 'Show reference script'
                    },
                    statuses: {
                        uploading: 'Uploading…',
                        transcribing: 'Transcribing audio…',
                        evaluating: 'AI scoring…'
                    },
                    panels: {
                        logic: 'Logic & PEEL',
                        delivery: 'Delivery',
                        rewrite: 'Rewrite tip'
                    },
                    metrics: {
                        wpm: 'Words per minute',
                        fillers: 'Filler words',
                        pauses: 'Long pauses'
                    },
                    caseNotesLabel: 'Speech notes',
                    caseNotesPlaceholder: 'Capture your claim, examples, transitions, or reminders.',
                    progressLabel: 'Recording status',
                    resultPlaceholder: 'Run a recording to see AI feedback here.',
                    rebuttalResult: {
                        effectiveness: 'Rebuttal strength',
                        directness: 'Directness',
                        weighing: 'Suggested weighing sentence'
                    },
                    crossfireResult: {
                        directness: 'Direct answer?',
                        followup: 'Follow-up prompts',
                        language: 'Language issues'
                    },
                    feedbackExtras: {
                        audioLabel: 'Audio upload / recording',
                        scoresLabel: 'Score breakdown',
                        referenceToggle: 'Show reference script',
                        referenceHint: 'Here is a 30–60 second sample you can shadow.'
                    },
                    oral: {
                        title: 'Oral / Reading Lab (Beta)',
                        desc: 'Paste a script, record yourself reading, and let AI flag pacing or pronunciation issues.',
                        placeholder: 'Paste the speech or paragraph you want to practise…',
                        btnRecord: 'Record & shadow',
                        btnStop: 'Stop recording',
                        resultPronunciation: 'Pronunciation / stumbles',
                        resultPacing: 'Pacing / pauses'
                    },
                    tooltips: {
                        case: 'Practise a 60-second case with PEEL guidance. Choose timer-only or record for AI scoring.',
                        rebuttal: 'Review opponent lines, record a rebuttal, and see where AI says you hit or miss.',
                        crossfire: 'Select up to three questions, record your crossfire replies, and get directness + follow-up tips.',
                        feedback: 'Paste or record a speech for Content / Refutation / Delivery / Strategy scores plus speaking metrics.',
                        oral: 'Read any script aloud; AI marks mispronunciations, fillers, and pacing so you can adjust.'
                    },
                    modules: {
                        case60s: '60-Second Case',
                        rebuttal: 'Rebuttal Sprint',
                        crossfire: 'Crossfire Builder',
                        feedback: 'AI Coach Feedback'
                    },
                    timerLabel: 'Countdown',
                    startTimer: 'Start',
                    resetTimer: 'Reset',
                    structureHeading: 'Case Structure',
                    structure: { claim: 'Claim', reason: 'Reason', evidence: 'Evidence', closing: 'Closing' },
                    practiceNote: 'Use the full minute to speak aloud and jot key points below.',
                    notesPlaceholder: 'Capture your outline or speaking notes here...',
                    opponentHeading: 'Simulated opponent points',
                    yourResponse: 'Your rebuttal',
                    evaluateBtn: 'AI Evaluation',
                    evaluationHeading: 'AI Feedback',
                    questionsHeading: 'Crossfire Question Bank',
                    questionsNote: 'Select up to three questions to practise answering.',
                    responseHeading: 'Response Draft',
                    responsePlaceholder: 'Write your answer strategy or bullet points...',
                    feedbackPrompt: 'Paste or draft your debate script',
                    feedbackPlaceholder: 'Drop your script here to receive a score and coaching tips...',
                    feedbackBtn: 'Score with AI Coach',
                    feedbackResultHeading: 'AI Coach Feedback',
                    rubricTitle: 'Debate Rubric',
                    rubric: {
                        content: 'Content',
                        refutation: 'Refutation',
                        delivery: 'Delivery',
                        strategy: 'Strategy',
                        total: 'Total'
                    },
                    rubricDescriptions: {
                        content: 'Content: Clear arguments supported by logic and evidence',
                        refutation: 'Refutation: Identify gaps in the opponent’s case and answer persuasively',
                        delivery: 'Delivery: Natural pace, clear pronunciation, confident tone',
                        strategy: 'Strategy: Structured flow with solid time management',
                        total: 'Total (40 points possible)'
                    },
                    customMotion: {
                        option: 'Custom motion',
                        label: 'Set your own debate motion',
                        placeholder: 'Type the motion you want to practise, e.g., "This house supports extending the summer vacation."',
                        note: 'Once entered, the practice modules switch to blank templates so you can craft your own content.',
                        moduleNote: 'The modules below are blank templates - map out your case, rebuttals, and crossfire questions.',
                        fallbackTitle: 'Custom debate motion',
                        structure: {
                            claim: 'Draft your claim: What exactly do you want the judges to adopt?',
                            reason: 'List the core reasons or principles that make your claim compelling.',
                            evidence: 'Note the evidence, data, or case studies you plan to cite.',
                            closing: 'Write a closing that restates impact and the risk of rejecting your proposal.'
                        },
                        opponentPoints: [
                            'Brainstorm likely opponent pushes or counter-claims you expect to hear.',
                            'Flag facts or sources you still need to verify or strengthen.',
                            'Capture questions you want to ask during crossfire.'
                        ],
                        questions: [
                            'What is the single biggest issue the other side will press you on?',
                            'How can you define the key terms to keep the debate in your favour?',
                            'If impact is challenged, how will you defend its importance?',
                            'If feasibility is challenged, what proof will you provide?',
                            'Which value conflicts must you clarify first?',
                            'If pressed for sources, which reports or experts will you cite?',
                            'When forced to weigh harms and benefits, what is your priority order?',
                            'If an alternative plan appears, how will you compare and still win?'
                        ],
                        rebuttal: {
                            summary: 'Acknowledge what sounds strong -> expose the hole -> pull the debate back to your framing or value.',
                            tips: [
                                'Jot keywords or verbatim lines you plan to deliver so you can rehearse them aloud.',
                                'Write the two rebuttal punches you most want to land, then practise saying them in one sentence.'
                            ]
                        },
                        coach: {
                            score: 'After each run, score Content / Refutation / Delivery / Strategy and jot why.',
                            tips: [
                                'Summarise the highlights and the tweaks you want next time.',
                                'Set a concrete next step - e.g., gather data, rewrite structure, or refine timing.'
                            ]
                        }
                    }
                }
            },
            'vi': {
                main_title: 'LingoVerse AI', main_subtitle: 'Vũ trụ học tập AI của bạn',
                nav: { learningPlatform: 'Nền tảng học tập', studentTutoring: 'Gia sư học sinh', storybookReading: 'Đọc truyện', aiTutor: 'Trợ lý AI', aiDoctor: 'Bác sĩ AI', debateCoach: 'Huấn luyện viên tranh biện AI' },
                pageTitle: 'Nền tảng học tập đa ngôn ngữ', pageSubtitle: 'Hãy bắt đầu cuộc phiêu lưu học tập hôm nay!', ageTitle: '1. Chọn độ tuổi',
                age_under_5: 'Dưới 5 tuổi', age_6_10: '6-10 tuổi', age_10_15: '10-15 tuổi', age_15_20: '15-20 tuổi', age_over_20: 'Trên 20 tuổi',
                subjectTitle: '2. Chọn loại khóa học', subjectKidsEn: 'Tiếng Anh trẻ em', subjectAdultEn: 'Tiếng Anh người lớn', subjectSci: 'Khoa học', subjectMath: 'Toán học', subjectHist: 'Lịch sử', subjectGeo: 'Địa lý',
                lessonTypeTitle: '3. Chọn loại',
                lessonType: { course: 'Khóa học', story: 'Câu chuyện', vocab: '5 từ vựng & câu', qa: 'Hỏi đáp AI', dialogue: 'Đối thoại' },
                topicTitle: '4. Chọn chủ đề', generateBtn: 'Tạo kế hoạch học tập', imageTitle: 'Hình ảnh do AI tạo', vocabTitle: 'Từ vựng cốt lõi', phraseTitle: 'Cụm từ hữu ích',
                topicCustomLabel: 'Chủ đề tự chọn', topicCustomPlaceholder: 'Nhập chủ đề bạn muốn học', topicCustomOption: 'Tự đặt chủ đề', topicCustomError: 'Vui lòng nhập chủ đề tự chọn trước.',
                lessonLangTabs: { en: 'Tiếng Anh', 'zh-Hant': 'Tiếng Trung', vi: 'Tiếng Việt', ja: 'Tiếng Nhật' },
                genAudio: 'Tạo âm thanh {lang}',
                genAudioVariant: 'Tạo âm thanh {lang} ({voice})',
                genDialogueAudio: 'Tạo âm thanh hội thoại {lang}',
                downloadDialogueAudio: 'Tải âm thanh hội thoại {lang}',
                voiceLabels: { female: 'Giọng nữ', male: 'Giọng nam' },
                dialogueBadge: 'Hội thoại',
                downloadAudio: 'Tải xuống âm thanh {lang}',
                phoneticLabel: 'Phiên âm', exampleLabel: 'Ví dụ',
                downloadAudioBtn: 'Tải xuống âm thanh (WAV)', imageError: 'Tạo ảnh thất bại', audioError: 'Tạo âm thanh thất bại', lessonError: 'Lỗi tạo bài học: {message}',
                topics: {
                    'KidsEnglish': ['Động vật', 'Gia đình', 'Màu sắc', 'Số', 'Thức ăn', 'Quần áo', 'Các bộ phận cơ thể', 'Thời tiết', 'Cảm xúc', 'Trường học'],
                    'AdultEnglish': ['Họp kinh doanh', 'Du lịch', 'Đặt món ăn', 'Phỏng vấn xin việc', 'Sự kiện xã hội', 'Sức khỏe', 'Công nghệ', 'Mua sắm', 'Tin tức', 'Phim & Âm nhạc'],
                    'Science': ['Hệ mặt trời', 'Quang hợp', 'Vòng tuần hoàn nước', 'Bộ xương người', 'Các trạng thái vật chất', 'Mạch điện', 'Chuỗi thức ăn', 'Núi lửa', 'Thời tiết & Khí hậu', 'Cấu trúc tế bào'],
                    'Math': ['Phép cộng và trừ', 'Phép nhân và chia', 'Phân số', 'Hình học', 'Thời gian', 'Tiền', 'Đo lường', 'Biểu đồ', 'Đại số', 'Xác suất'],
                    'History': ['Lịch sử Trung Quốc', 'Lịch sử Việt Nam', 'Ai Cập cổ đại', 'La Mã cổ đại', 'Phục hưng', 'Thời đại khám phá', 'Cách mạng công nghiệp', 'Thế chiến I', 'Thế chiến II', 'Lịch sử công nghệ'],
                    'Geography': ['Thủ đô thế giới', 'Địa danh', 'Đại dương', 'Dãy núi', 'Sông lớn', 'Sa mạc', 'Rừng nhiệt đới', 'Mảng kiến tạo', 'Vùng khí hậu', 'Di cư']
                },
                tutoring: {
                    title: 'Gia sư cho học sinh', subtitle: 'Tải ảnh bài tập lên, trợ lý AI sẽ phân tích và hướng dẫn bạn ngay lập tức! Tạm biệt nỗi phiền toái khi kiểm tra bài tập.', startUploadBtn: 'Tải bài tập lên ngay',
                    uploadTitle: 'Tải bài tập lên', dragDropText: 'Nhấp hoặc kéo tệp vào đây (tối đa 1-10 tệp mỗi lần)', noFileSelected: 'Chưa chọn tệp',
                    levelLabel: 'Cấp độ', subjectLabel: 'Môn học', languageLabel: 'Ngôn ngữ', customSubjectLabel: 'Môn học tùy chỉnh', customSubjectPlaceholder: 'Nhập tên môn học',
                    analyzeBtn: 'Bắt đầu phân tích', conceptsTitle: 'Khái niệm chính', vocabTitle: 'Từ vựng trọng tâm', analysisTitle: 'Phân tích bài tập',
                    selectedCount: 'Đã chọn {count} tệp (tối đa 10)',
                    noFileError: 'Vui lòng tải lên ít nhất một tệp trước.'
                },
                storybook: {
                    title: 'Đọc truyện', subtitle: 'Tải lên một hình ảnh và để AI tạo ra một cuốn truyện có âm thanh độc đáo cho bạn! Bạn có thể chọn ngôn ngữ, độ tuổi, phong cách và chỉnh sửa thoải mái.', startUploadBtn: 'Tải lên hình minh họa',
                    illustrationTitle: 'Hình minh họa', dragDropText: 'Nhấp hoặc kéo 1-10 hình ảnh', settingsTitle: 'Cài đặt truyện',
                    languageLabel: 'Ngôn ngữ', ageLabel: 'Nhóm tuổi', styleLabel: 'Phong cách truyện', styleWarm: 'Ấm áp', styleAdventure: 'Phiêu lưu',
                    charNameLabel: 'Tên nhân vật chính (Tùy chọn)', charNamePlaceholder: 'Ví dụ: Thỏ Bonny', generateBtn: 'Tạo truyện',
                    storyTitle: 'Câu chuyện sáng tạo của AI', storyPlaceholder: 'Nhấp vào "Tạo truyện" để bắt đầu...',
                    selectedCount: 'Đã chọn {count} hình minh họa (tối đa 10)',
                    noImageError: 'Vui lòng tải lên ít nhất một hình minh họa trước.'
                },
                aiTutor: {
                    title: '🤖 Trợ lý AI', subtitle: 'Hỏi nhóm chuyên gia AI của chúng tôi về các vấn đề học tập và hành vi của con bạn.', inputLabel: '① Khu vực nhập vấn đề',
                    inputPlaceholder: 'Mô tả các vấn đề học tập hoặc hành vi bạn quan sát được ở con mình... (Hỗ trợ nhiều ngôn ngữ: Trung/Anh/Việt)',
                    categoryLabel: '② Chọn loại vấn đề', categories: { 'learning': 'Phương pháp học tập', 'behavior': 'Tâm lý hành vi', 'language': 'Phát triển ngôn ngữ', 'emotion': 'Quản lý cảm xúc', 'social': 'Quan hệ xã hội', 'other': 'Khác' },
                    expertLabel: '③ Bảng điều khiển chuyên gia AI', getAdviceBtn: 'Nhận lời khuyên',
                    summaryTitle: 'Tóm tắt & câu hỏi của {expertName}', followupLabel: '🤔 Hỏi thêm', followupPlaceholder: 'Hoặc nhập câu hỏi tiếp theo của bạn ở đây...', sendBtn: 'Gửi'
                },
                aiDoctor: {
                    title: '👩‍⚕️ Bác sĩ AI', subtitle: 'Mô tả các triệu chứng và tải ảnh lên (tùy chọn). Đội ngũ AI chuyên nghiệp của chúng tôi sẽ cung cấp phân tích sơ bộ.', 
                    symptomLabel: '① Mô tả triệu chứng', symptomPlaceholder: 'Vui lòng mô tả chi tiết các triệu chứng của bạn, ví dụ: đau đầu, đau dạ dày, mệt mỏi...',
                    uploadLabel: '② Tải ảnh lên (tùy chọn)', uploadText: 'Tải lên ảnh vùng bị ảnh hưởng hoặc thuốc (1-10 ảnh mỗi lần)',
                    expertLabel: '③ Chọn chuyên gia AI', getDiagnosisBtn: 'Nhận phân tích sơ bộ',
                    selectedCount: 'Đã chọn {count} ảnh (tối đa 10)',
                    noFileError: 'Vui lòng tải lên ít nhất một ảnh.'
                },
                debateCoach: {
                    title: 'Huấn luyện viên tranh biện AI',
                    subtitle: 'Giúp trẻ luyện tư duy tranh biện và diễn đạt tiếng Anh cùng AI!',
                    settingsTitle: 'Thiết lập luyện tập',
                    selectMotion: 'Chọn đề tài tranh biện',
                    selectSide: 'Chọn lập trường',
                    selectLevel: 'Chọn trình độ',
                    settingsHint: 'Thay đổi thiết lập để tải dữ liệu mẫu mới cho các mô-đun luyện tập.',
                    sidePro: 'Phe ủng hộ',
                    sideCon: 'Phe phản đối',
                    levelBeginner: 'Cơ bản',
                    levelAdvanced: 'Nâng cao',
                    practiceTitle: 'Các mô-đun luyện tập',
                    practiceSubtitle: 'Nhấp tiêu đề để mở hoạt động và công cụ',
                    motionLabel: 'Đề tài tranh biện',
                    hint_ai_en_eval: 'AI sẽ chấm điểm bằng tiếng Anh. Nếu bạn nhập tiếng Việt/Trung, hệ thống sẽ dịch sang tiếng Anh trước khi chấm.',
                    toggle_bilingual: 'Hiển thị song ngữ Trung/Anh',
                    badges: { timer: 'Chỉ đếm giờ', record: 'Ghi âm + AI chấm' },
                    buttons: {
                        startTimer: 'Bắt đầu (chỉ đếm giờ)',
                        recordStart: 'Ghi âm & bắt đầu',
                        stopRecording: 'Dừng ghi âm',
                        recordRebuttal: 'Ghi âm phản biện',
                        recordCrossfire: 'Ghi âm trả lời',
                        recordFeedback: 'Ghi âm để chấm điểm',
                        recordOral: 'Ghi âm luyện đọc',
                        feedbackEvaluate: 'AI Coach chấm điểm',
                        showReference: 'Hiển thị bản mẫu'
                    },
                    statuses: {
                        uploading: 'Đang tải lên…',
                        transcribing: 'Đang chuyển giọng nói…',
                        evaluating: 'AI đang chấm…'
                    },
                    panels: {
                        logic: 'Cấu trúc lập luận',
                        delivery: 'Trình bày',
                        rewrite: 'Gợi ý viết lại'
                    },
                    metrics: {
                        wpm: 'Từ / phút',
                        fillers: 'Từ đệm',
                        pauses: 'Ngắt quá dài'
                    },
                    caseNotesLabel: 'Ghi chú nói',
                    caseNotesPlaceholder: 'Liệt kê luận điểm, ví dụ và câu kết bạn muốn nhấn mạnh.',
                    progressLabel: 'Trạng thái ghi âm',
                    resultPlaceholder: 'Ghi âm để xem phản hồi AI tại đây.',
                    rebuttalResult: {
                        effectiveness: 'Hiệu quả phản biện',
                        directness: 'Độ trực tiếp',
                        weighing: 'Câu weighing gợi ý'
                    },
                    crossfireResult: {
                        directness: 'Trả lời trực tiếp?',
                        followup: 'Câu hỏi gợi ý tiếp theo',
                        language: 'Lỗi diễn đạt'
                    },
                    feedbackExtras: {
                        audioLabel: 'Tải / ghi âm',
                        scoresLabel: 'Thang điểm',
                        referenceToggle: 'Hiển thị bản đọc mẫu',
                        referenceHint: 'Đoạn mẫu 30–60 giây để bạn đọc theo.'
                    },
                    oral: {
                        title: 'Luyện đọc / nói to (Beta)',
                        desc: 'Dán đoạn văn, ghi âm đọc to và để AI đánh dấu phát âm, nhịp điệu.',
                        placeholder: 'Dán đoạn bạn muốn luyện...',
                        btnRecord: 'Ghi âm luyện đọc',
                        btnStop: 'Dừng ghi âm',
                        resultPronunciation: 'Phát âm / vấp',
                        resultPacing: 'Nhịp / ngắt'
                    },
                    tooltips: {
                        case: 'Luyện case 60 giây với PEEL, có thể chỉ đếm giờ hoặc ghi âm để AI chấm.',
                        rebuttal: 'Xem luận điểm đối thủ, ghi âm phản biện và nhận đánh giá sức nặng.',
                        crossfire: 'Chọn tối đa 3 câu hỏi, ghi âm trả lời để AI kiểm tra tính trực tiếp và gợi ý truy vấn.',
                        feedback: 'Dán hoặc ghi âm bài nói để nhận điểm Nội dung/Phản biện/Trình bày/Chiến lược cùng chỉ số nói.',
                        oral: 'Đọc to đoạn văn; AI đánh dấu lỗi phát âm, từ đệm và nhịp để bạn điều chỉnh.'
                    },
                    modules: {
                        case60s: 'Case 60 giây',
                        rebuttal: 'Phản biện nhanh',
                        crossfire: 'Xây dựng chất vấn',
                        feedback: 'Phản hồi từ AI Coach'
                    },
                    timerLabel: 'Đồng hồ đếm ngược',
                    startTimer: 'Bắt đầu',
                    resetTimer: 'Đặt lại',
                    structureHeading: 'Cấu trúc lập luận',
                    structure: { claim: 'Luận đề', reason: 'Lý do', evidence: 'Bằng chứng', closing: 'Kết luận' },
                    practiceNote: 'Hãy nói to trong 60 giây và ghi chú ý chính bên dưới.',
                    notesPlaceholder: 'Ghi lại dàn ý hoặc ý chính tại đây...',
                    opponentHeading: 'Luận điểm đối thủ mô phỏng',
                    yourResponse: 'Phản biện của bạn',
                    evaluateBtn: 'AI đánh giá',
                    evaluationHeading: 'Nhận xét của AI',
                    questionsHeading: 'Ngân hàng câu hỏi chất vấn',
                    questionsNote: 'Chọn tối đa ba câu để luyện trả lời.',
                    responseHeading: 'Bản nháp trả lời',
                    responsePlaceholder: 'Viết chiến lược hoặc gạch đầu dòng trả lời...',
                    feedbackPrompt: 'Dán hoặc soạn bài phát biểu của bạn',
                    feedbackPlaceholder: 'Đặt bài viết vào đây để AI chấm điểm và gợi ý cải thiện...',
                    feedbackBtn: 'AI chấm điểm',
                    feedbackResultHeading: 'Phản hồi từ AI Coach',
                    rubricTitle: 'Thang đánh giá tranh biện',
                    rubric: {
                        content: 'Nội dung',
                        refutation: 'Phản biện',
                        delivery: 'Trình bày',
                        strategy: 'Chiến lược',
                        total: 'Tổng điểm'
                    },
                    rubricDescriptions: {
                        content: 'Nội dung: Luận điểm rõ ràng, logic và có bằng chứng',
                        refutation: 'Phản biện: Chỉ ra điểm yếu của đối thủ và phản bác thuyết phục',
                        delivery: 'Trình bày: Tốc độ tự nhiên, phát âm rõ, tự tin',
                        strategy: 'Chiến lược: Cấu trúc mạch lạc, quản lý thời gian tốt',
                        total: 'Tổng điểm (tối đa 40 điểm)'
                    },
                    customMotion: {
                        option: 'Tự đặt chủ đề',
                        label: 'Tự nhập đề tài tranh biện',
                        placeholder: 'Nhập đề tài bạn muốn luyện, ví dụ: "Quốc hội ủng hộ kéo dài kỳ nghỉ hè."',
                        note: 'Sau khi nhập, các mô-đun luyện tập sẽ chuyển sang khung trống để bạn tự xây dựng nội dung.',
                        moduleNote: 'Các mô-đun bên dưới là khung trống, hãy tự ghi lại luận điểm, phản biện và câu hỏi chất vấn.',
                        fallbackTitle: 'Đề tài tranh biện tự chọn',
                        structure: {
                            claim: 'Viết luận đề: bạn muốn thuyết phục ban giám khảo điều gì?',
                            reason: 'Liệt kê những lý do hoặc nguyên tắc cốt lõi giúp luận đề thuyết phục.',
                            evidence: 'Ghi chú số liệu, bằng chứng hoặc ví dụ thực tế sẽ trích dẫn.',
                            closing: 'Soạn câu kết nhấn mạnh tác động và rủi ro nếu đề xuất bị bác bỏ.'
                        },
                        opponentPoints: [
                            'Dự đoán các lập luận hoặc phản công mà đối thủ có thể sử dụng.',
                            'Đánh dấu những thông tin cần kiểm chứng hoặc bổ sung nguồn.',
                            'Ghi lại các câu hỏi muốn dùng trong phần chất vấn.'
                        ],
                        questions: [
                            'Đối thủ sẽ xoáy sâu vào vấn đề trọng tâm nào nhất?',
                            'Bạn sẽ định nghĩa các từ khóa thế nào để cuộc tranh luận có lợi cho mình?',
                            'Nếu bị chất vấn về tác động, bạn sẽ bảo vệ tầm quan trọng ra sao?',
                            'Nếu bị hỏi về tính khả thi, bạn đưa bằng chứng nào?',
                            'Những xung đột giá trị nào cần làm rõ trước?',
                            'Nếu bị đòi nguồn, bạn sẽ trích dẫn báo cáo hay chuyên gia nào?',
                            'Khi phải cân đo lợi hại, thứ tự ưu tiên của bạn là gì?',
                            'Nếu xuất hiện phương án thay thế, bạn sẽ so sánh để vẫn chiến thắng như thế nào?'
                        ],
                        rebuttal: {
                            summary: 'Công nhận điểm mạnh -> chỉ ra lỗ hổng -> kéo cuộc tranh luận về khung giá trị của bạn.',
                            tips: [
                                'Ghi lại từ khóa hoặc câu then chốt để luyện nói to nhiều lần.',
                                'Viết hai đòn phản công quan trọng và tập nói gọn trong một câu.'
                            ]
                        },
                        coach: {
                            score: 'Sau mỗi lượt, hãy tự chấm Nội dung / Phản biện / Trình bày / Chiến lược và ghi lý do.',
                            tips: [
                                'Tóm tắt điểm mạnh và điều muốn cải thiện cho lần kế tiếp.',
                                'Đặt mục tiêu cụ thể cho lần luyện sau, ví dụ bổ sung dữ liệu hoặc điều chỉnh cấu trúc.'
                            ]
                        }
                    }
                }
            },
            'ja': {
                main_title: 'LingoVerse AI', main_subtitle: 'あなたのAI学習ユニバース',
                nav: { learningPlatform: '学習プラットフォーム', studentTutoring: '学生指導', storybookReading: '絵本朗読', aiTutor: 'AIチューター', aiDoctor: 'AIドクター', debateCoach: 'AIディベートコーチ' },
                pageTitle: '多言語学習プラットフォーム', pageSubtitle: '今日の学習冒険を始めましょう！', ageTitle: '1. 年齢を選択',
                age_under_5: '5歳以下', age_6_10: '6-10歳', age_10_15: '10-15歳', age_15_20: '15-20歳', age_over_20: '20歳以上',
                subjectTitle: '2. コースタイプを選択', subjectKidsEn: '子供向け英語', subjectAdultEn: '大人向け英語', subjectSci: '科学', subjectMath: '数学', subjectHist: '歴史', subjectGeo: '地理',
                lessonTypeTitle: '3. タイプを選択',
                lessonType: { course: 'コース', story: '物語', vocab: '5つの語彙と例文', qa: 'AI質疑応答', dialogue: '対話' },
                topicTitle: '4. トピックを選択', generateBtn: '学習プランを生成', imageTitle: 'AI生成画像', vocabTitle: 'コア語彙', phraseTitle: '便利なフレーズ',
                topicCustomLabel: 'カスタムトピック', topicCustomPlaceholder: '学びたいトピックを入力してください', topicCustomOption: 'カスタムトピック', topicCustomError: 'カスタムトピックを入力してください。',
                lessonLangTabs: { en: '英語', 'zh-Hant': '中国語', vi: 'ベトナム語', ja: '日本語' },
                genAudio: '{lang}音声を生成',
                genAudioVariant: '{lang}{voice}音声を生成',
                genDialogueAudio: '{lang}対話音声を生成',
                downloadDialogueAudio: '{lang}対話音声をダウンロード',
                voiceLabels: { female: '女性', male: '男性' },
                dialogueBadge: '対話',
                downloadAudio: '{lang}音声をダウンロード',
                phoneticLabel: '発音記号', exampleLabel: '例文',
                downloadAudioBtn: '音声をダウンロード (WAV)', imageError: '画像生成に失敗しました', audioError: '音声生成に失敗しました', lessonError: 'レッスン生成エラー: {message}',
                topics: {
                    'KidsEnglish': ['動物', '家族', '色', '数字', '食べ物', '服', '体の部位', '天気', '感情', '学校'],
                    'AdultEnglish': ['ビジネス会議', '旅行', 'レストランでの注文', '面接', 'イベント', '健康', 'テクノロジー', '買い物', 'ニュース', '映画と音楽'],
                    'Science': ['太陽系', '光合成', '水の循環', '人体の骨格', '物質の状態', '基本回路', '食物連鎖', '火山と地震', '天気と気候', '細胞の構造'],
                    'Math': ['足し算と引き算', '掛け算と割り算', '分数', '幾何学', '時間', 'お金', '測定', 'グラフ', '代数', '確率'],
                    'History': ['中国の歴史', 'ベトナムの歴史', '古代エジプト', '古代ローマ', 'ルネサンス', '大航海時代', '産業革命', '第一次世界大戦', '第二次世界大戦', '現代技術史'],
                    'Geography': ['世界の首都', '有名な場所', '海洋と大陸', '山脈', '主要な川', '砂漠', '熱帯雨林', 'プレート', '気候帯', '人類の移動']
                },
                tutoring: {
                    title: '学生指導', subtitle: '宿題の写真をアップロードすると、AIチューターがすぐに分析して指導します！宿題チェックの煩わしさから解放されましょう。', startUploadBtn: '宿題をアップロード',
                    uploadTitle: '宿題をアップロード', dragDropText: 'クリックまたはファイルをここにドラッグ（1〜10件まで一括アップロード可能）', noFileSelected: 'ファイルが選択されていません',
                    levelLabel: 'レベル', subjectLabel: '科目', languageLabel: '言語', customSubjectLabel: 'カスタム科目', customSubjectPlaceholder: '科目名を入力',
                    analyzeBtn: '分析を開始', conceptsTitle: '主要概念', vocabTitle: '重要語彙', analysisTitle: '宿題の分析',
                    selectedCount: '選択中のファイル数: {count}（最大10件）',
                    noFileError: '少なくとも1件のファイルをアップロードしてください。'
                },
                storybook: {
                    title: '絵本朗読', subtitle: '画像をアップロードして、AIにユニークなオーディオ絵本を作成させましょう！言語、年齢、スタイルを選択し、自由に編集できます。', startUploadBtn: 'イラストをアップロード',
                    illustrationTitle: 'イラスト', dragDropText: '1〜10枚の画像をクリックまたはドラッグ', settingsTitle: '物語の設定',
                    languageLabel: '言語', ageLabel: '年齢層', styleLabel: '物語のスタイル', styleWarm: '心温まる', styleAdventure: '冒険',
                    charNameLabel: '主人公の名前（任意）', charNamePlaceholder: '例：うさぎのボニー', generateBtn: '物語を生成',
                    storyTitle: 'AIの創作物語', storyPlaceholder: '「物語を生成」をクリックして開始...',
                    selectedCount: '選択中の挿絵: {count} 枚 (最大10枚)',
                    noImageError: '少なくとも1枚の挿絵をアップロードしてください。'
                },
                aiTutor: {
                    title: '🤖 AIチューター', subtitle: 'お子様の学習と行動に関する問題をAI専門家チームにご相談ください。', inputLabel: '① 問題入力エリア',
                    inputPlaceholder: 'お子様の学習や行動の問題を詳しく説明してください... (多言語対応：中国語/英語/ベトナム語)',
                    categoryLabel: '② 問題カテゴリを選択', categories: { 'learning': '学習方法', 'behavior': '行動心理', 'language': '言語発達', 'emotion': '感情管理', 'social': '社会的関係', 'other': 'その他' },
                    expertLabel: '③ AI専門家パネル', getAdviceBtn: 'アドバイスを得る',
                    summaryTitle: '{expertName}のまとめと質問', followupLabel: '🤔 追加質問', followupPlaceholder: 'または、次の質問をここに入力してください...', sendBtn: '送信'
                },
                aiDoctor: {
                    title: '👩‍⚕️ AIドクター', subtitle: '症状を説明し、写真をアップロードしてください（任意）。専門のAIチームが一次分析を提供します。', 
                    symptomLabel: '① 症状の説明', symptomPlaceholder: '症状を詳しく説明してください。例：頭痛、胃痛、疲労...',
                    uploadLabel: '② 写真をアップロード（任意）', uploadText: '患部や薬の写真をアップロード（1〜10枚まで）',
                    expertLabel: '③ AI専門家を選択', getDiagnosisBtn: '一次分析を受ける',
                    selectedCount: '選択中の写真: {count} 枚 (最大10枚)',
                    noFileError: '少なくとも1枚の写真をアップロードしてください。'
                },
                debateCoach: {
                    title: 'AIディベートコーチ',
                    subtitle: 'AIと一緒にディベート思考と英語表現力を鍛えましょう！',
                    settingsTitle: '練習設定',
                    selectMotion: '論題を選択',
                    selectSide: '立場を選択',
                    selectLevel: 'レベルを選択',
                    settingsHint: '設定を変更すると、下のモジュールが対応するモックデータで更新されます。',
                    sidePro: '肯定側',
                    sideCon: '否定側',
                    levelBeginner: '初級',
                    levelAdvanced: '上級',
                    practiceTitle: '練習モジュール',
                    practiceSubtitle: 'モジュール名をクリックして内容とツールを表示',
                    motionLabel: '論題表示',
                    hint_ai_en_eval: 'AIは英語で評価します。日本語や中国語で入力した場合は英訳してから採点します。',
                    toggle_bilingual: '中英対照を表示',
                    badges: { timer: 'タイマーのみ', record: '録音+AI評価' },
                    buttons: {
                        startTimer: '開始（タイマーのみ）',
                        recordStart: '録音して開始',
                        stopRecording: '録音を停止',
                        recordRebuttal: '反論を録音',
                        recordCrossfire: '回答を録音',
                        recordFeedback: '録音して採点',
                        recordOral: '録音して朗読',
                        feedbackEvaluate: 'AIコーチ採点',
                        showReference: '参考原稿を表示'
                    },
                    statuses: {
                        uploading: 'アップロード中…',
                        transcribing: '文字起こし中…',
                        evaluating: 'AI評価中…'
                    },
                    panels: {
                        logic: '論理構成',
                        delivery: 'スピーチ',
                        rewrite: '書き換え提案'
                    },
                    metrics: {
                        wpm: '語/分',
                        fillers: 'フィラーワード',
                        pauses: '長いポーズ'
                    },
                    caseNotesLabel: 'スピーチメモ',
                    caseNotesPlaceholder: '主張・例・クロージングのメモを書きましょう。',
                    progressLabel: '録音ステータス',
                    resultPlaceholder: '録音するとここにAIフィードバックが表示されます。',
                    rebuttalResult: {
                        effectiveness: '反論の強度',
                        directness: '直接性',
                        weighing: '推奨ウェイイング文'
                    },
                    crossfireResult: {
                        directness: '直接回答？',
                        followup: '追質問の提案',
                        language: '言い回しの問題'
                    },
                    feedbackExtras: {
                        audioLabel: '音声アップロード/録音',
                        scoresLabel: 'スコア内訳',
                        referenceToggle: '参考原稿を表示',
                        referenceHint: '30〜60秒のサンプル原稿です。シャドーイングに使えます。'
                    },
                    oral: {
                        title: '音読トレーニング（ベータ）',
                        desc: '原稿を貼り付けて録音すると、AIが発音や間の問題を指摘します。',
                        placeholder: '練習したい原稿を貼り付けてください...',
                        btnRecord: '録音して朗読',
                        btnStop: '録音を停止',
                        resultPronunciation: '発音 / つかえ',
                        resultPacing: 'リズム / 間'
                    },
                    tooltips: {
                        case: 'PEEL構造で60秒のケースを練習。タイマーのみか録音+AI評価を選べます。',
                        rebuttal: '相手の論点を読み、録音して反論。AIが強みと不足を示します。',
                        crossfire: '最大3問を選んで回答を録音し、直接性や追質問のヒントを得られます。',
                        feedback: '原稿を貼るか録音すると、内容/反論/表現/戦略と話速指標の評価を得られます。',
                        oral: 'どんな原稿でも音読し、AIが発音・フィラー・間の課題をハイライトします。'
                    },
                    modules: {
                        case60s: '60秒スピーチ',
                        rebuttal: 'リバッタルスプリント',
                        crossfire: 'クロスファイアビルダー',
                        feedback: 'AIコーチフィードバック'
                    },
                    timerLabel: 'カウントダウン',
                    startTimer: 'スタート',
                    resetTimer: 'リセット',
                    structureHeading: '立論構成',
                    structure: { claim: '主張', reason: '理由', evidence: '根拠', closing: 'まとめ' },
                    practiceNote: '60秒間しっかり声に出して練習し、下に重要ポイントをメモしましょう。',
                    notesPlaceholder: 'アウトラインや重要ポイントをここに記録...',
                    opponentHeading: '想定される相手の論点',
                    yourResponse: '自分の反論',
                    evaluateBtn: 'AI評価',
                    evaluationHeading: 'AIフィードバック',
                    questionsHeading: 'クロスファイア質問集',
                    questionsNote: '最大3問まで選んで回答練習ができます。',
                    responseHeading: '回答メモ',
                    responsePlaceholder: '回答の戦略や要点を書きましょう...',
                    feedbackPrompt: '原稿を貼り付けるか入力してください',
                    feedbackPlaceholder: 'ここに原稿を入力するとAIが得点と改善提案を返します...',
                    feedbackBtn: 'AI採点',
                    feedbackResultHeading: 'AIコーチのフィードバック',
                    rubricTitle: 'ディベート評価基準',
                    rubric: {
                        content: '内容',
                        refutation: '反論',
                        delivery: '表現',
                        strategy: '戦略',
                        total: '合計'
                    },
                    rubricDescriptions: {
                        content: '内容：主張が明確で、論理と根拠が揃っている',
                        refutation: '反論：相手の弱点を指摘し、説得力ある反論を示す',
                        delivery: '表現：自然な話速で、発音が明瞭で、自信のある声',
                        strategy: '戦略：構成が整っており、時間配分が良い',
                        total: '合計（40点満点）'
                    },
                    customMotion: {
                        option: 'カスタム論題',
                        label: '独自のディベート論題を入力',
                        placeholder: '練習したい論題を入力してください（例：「本院は夏休みの延長を支持する」）。',
                        note: '入力すると下のモジュールが空のテンプレートになり、自由に内容を作り込めます。',
                        moduleNote: '以下のモジュールは空のテンプレートです。主張・反論・クロスファイアの質問を自由に書き込みましょう。',
                        fallbackTitle: 'カスタム論題',
                        structure: {
                            claim: 'あなたの主張をまとめましょう。審査員に何を認めてほしいですか？',
                            reason: '主張を支える重要な理由や原則を書き出してください。',
                            evidence: '引用したい証拠・データ・事例をメモしておきましょう。',
                            closing: '結論で強調したい影響や、採択しない場合のリスクを書き留めてください。'
                        },
                        opponentPoints: [
                            '相手が言いそうな反論や追及ポイントを事前に洗い出しましょう。',
                            '裏付けが弱い部分や追加で調べたい情報に印をつけましょう。',
                            'クロスファイアで投げかけたい質問を控えておきましょう。'
                        ],
                        questions: [
                            '相手が最も攻めてきそうな論点は何ですか？',
                            'キーワードをどう定義すれば議論の主導権を握れますか？',
                            '影響を疑われたとき、どのように重要性を守りますか？',
                            '実現性を問われたとき、どのような証拠を示しますか？',
                            '価値観の衝突があるなら、何から先に整理しますか？',
                            '根拠を要求された場合、どの資料や専門家を引用しますか？',
                            '利益と不利益を比較するとき、優先順位はどうなりますか？',
                            '代替案を提示されたら、どう比較して優位性を保ちますか？'
                        ],
                        rebuttal: {
                            summary: '強みを認める -> 穴や矛盾を示す -> 議論を自分のフレーム・価値へ引き戻す。',
                            tips: [
                                '口頭で使いたいキーワードやセリフをメモし、繰り返し声に出して練習しましょう。',
                                '特に叩きたい論点を二つ決め、一文で素早く切り込む練習をしましょう。'
                            ]
                        },
                        coach: {
                            score: '毎回の練習後に「内容・反論・表現・戦略」を自己採点し、その理由を書き残しましょう。',
                            tips: [
                                '今回の良かった点と、次回改善したい点を簡潔にまとめましょう。',
                                '次回の具体的なアクション（資料収集・構成の見直し・タイム管理の調整など）を設定しましょう。'
                            ]
                        }
                    }
                }
            }
        };

        const debateMotions = [
            {
                id: 'ban-homework',
                title: {
                    'zh-Hant': '本院認為應該禁止小學生家庭作業',
                    'en': 'This house would ban homework for elementary students',
                    'vi': 'Quốc hội cho rằng nên cấm bài tập về nhà cho học sinh tiểu học',
                    'ja': '本院は小学生の宿題を禁止すべきだと考える'
                },
                sides: {
                    pro: {
                        beginner: {
                            claim: {
                                'zh-Hant': '我們支持禁止小學生家庭作業，讓孩子有更多休息時間。',
                                'en': 'We support banning homework for elementary students so they gain more rest.',
                                'vi': 'Chúng tôi ủng hộ việc bỏ bài tập về nhà để học sinh tiểu học có thêm thời gian nghỉ ngơi.',
                                'ja': '小学生の宿題を禁止し、子どもに休む時間を与えるべきだと考えます。'
                            },
                            reason: {
                                'zh-Hant': '長時間的課堂加上作業會累積壓力與疲勞。',
                                'en': 'Long school days plus extra worksheets pile on unnecessary stress.',
                                'vi': 'Ngày học dài cộng thêm bài tập khiến trẻ bị căng thẳng không cần thiết.',
                                'ja': '長い授業に加えて宿題があると、不要なストレスと疲労がたまります。'
                            },
                            evidence: {
                                'zh-Hant': '兒童幸福感調查顯示作業量與睡眠不足高度相關。',
                                'en': 'Wellness surveys link heavy homework with less sleep for young learners.',
                                'vi': 'Khảo sát sức khỏe cho thấy bài tập nhiều làm giảm giờ ngủ của trẻ.',
                                'ja': '子どものウェルビーイング調査では宿題の多さと睡眠不足に相関があります。'
                            },
                            closing: {
                                'zh-Hant': '減少作業能提升學習動力並增加親子交流時間。',
                                'en': 'Removing homework lifts motivation and opens time for family connection.',
                                'vi': 'Giảm bài tập giúp tăng động lực học và gắn kết gia đình.',
                                'ja': '宿題を減らせば学習意欲が高まり、家族との時間も増えます。'
                            }
                        },
                        advanced: {
                            claim: {
                                'zh-Hant': '逐步取消作業可打造兼顧健康與探究的課後生活。',
                                'en': 'Phasing out homework creates healthier, curiosity-driven afternoons.',
                                'vi': 'Loại bỏ dần bài tập mang lại buổi chiều lành mạnh và đầy khám phá.',
                                'ja': '宿題を段階的に廃止することで健康的で探究的な放課後が実現します。'
                            },
                            reason: {
                                'zh-Hant': '現代素養教育強調遊戲與探究式學習，而非重複抄寫。',
                                'en': 'Modern pedagogy prioritises play and inquiry over repetitive drills.',
                                'vi': 'Giáo dục hiện đại ưu tiên học qua chơi và tìm tòi hơn là luyện tập lặp lại.',
                                'ja': '現代教育は反復練習よりも遊びと探究を重視しています。'
                            },
                            evidence: {
                                'zh-Hant': '芬蘭等高表現國家在低作業量下依舊保持頂尖成績。',
                                'en': 'Systems like Finland stay top ranked despite minimal homework loads.',
                                'vi': 'Các hệ thống như Phần Lan vẫn đạt thành tích cao dù lượng bài tập rất ít.',
                                'ja': 'フィンランドなどの高成績国も宿題がほとんどなくても成果を上げています。'
                            },
                            closing: {
                                'zh-Hant': '讓課堂專注深化學習，晚上則留給興趣、運動與充足睡眠。',
                                'en': 'Class time digs deeper into concepts while evenings foster hobbies, exercise, and sleep.',
                                'vi': 'Giờ học giúp đào sâu kiến thức, buổi tối dành cho sở thích, vận động và ngủ đủ.',
                                'ja': '授業で内容を深め、夜は興味や運動、十分な睡眠に充てられます。'
                            }
                        },
                        opponentPoints: [
                            {
                                'zh-Hant': '作業有助於建立自律與時間管理能力。',
                                'en': 'Homework helps children build discipline and time management.',
                                'vi': 'Bài tập giúp trẻ hình thành tính kỷ luật và kỹ năng quản lý thời gian.',
                                'ja': '宿題は自律心と時間管理能力を育てます。'
                            },
                            {
                                'zh-Hant': '家長需要透過作業了解孩子在學校學了什麼。',
                                'en': 'Parents rely on homework to know what their child learned at school.',
                                'vi': 'Phụ huynh dựa vào bài tập để biết con học gì ở trường.',
                                'ja': '保護者は宿題を通じて学校での学習内容を把握します。'
                            },
                            {
                                'zh-Hant': '提前適應作業量有助於銜接高年級的課業要求。',
                                'en': 'Early exposure prepares students for heavier workloads in upper grades.',
                                'vi': 'Làm quen sớm giúp học sinh chuẩn bị cho khối lượng cấp lớp trên.',
                                'ja': '早いうちから宿題に慣れておくと高学年の学習につながります。'
                            }
                        ],
                        rebuttalFeedback: {
                            summary: {
                                'zh-Hant': '你點出了作業過量造成的壓力，但可以補充更多成功案例。',
                                'en': 'You highlighted the stress from heavy homework; add one more proven example.',
                                'vi': 'Bạn đã nêu rõ áp lực do bài tập, hãy bổ sung thêm ví dụ thực tế.',
                                'ja': '宿題の負担によるストレスに触れましたが、実例をもう一つ加えましょう。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '引用學校或國家政策的數據來佐證你的主張。',
                                    'en': 'Cite data from a school or national policy to back your claim.',
                                    'vi': 'Trích số liệu từ trường hoặc chính sách quốc gia để củng cố luận điểm.',
                                    'ja': '学校や国の政策データを引用して主張を裏付けましょう。'
                                },
                                {
                                    'zh-Hant': '說明如何在沒有作業的情況下維持家長與學生的溝通。',
                                    'en': 'Explain how families can stay involved even without nightly worksheets.',
                                    'vi': 'Giải thích cách gia đình vẫn đồng hành dù không còn bài tập buổi tối.',
                                    'ja': '宿題がなくても保護者と子どもの連携をどう保つか示してください。'
                                }
                            ]
                        },
                        coachFeedback: {
                            score: {
                                'zh-Hant': '分數：內容8、反駁7、表達8、策略8（總分31/40）。',
                                'en': 'Score: Content 8, Refutation 7, Delivery 8, Strategy 8 (31/40).',
                                'vi': 'Điểm: Nội dung 8, Phản biện 7, Trình bày 8, Chiến lược 8 (31/40).',
                                'ja': 'スコア：内容8・反論7・表現8・戦略8（31/40）。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '在開頭先總結政策帶來的三個好處，讓結構更清楚。',
                                    'en': 'Open with three concrete benefits to keep the structure clear.',
                                    'vi': 'Mở đầu bằng ba lợi ích rõ ràng để cấu trúc chặt chẽ hơn.',
                                    'ja': '冒頭で政策の具体的な利点を3つ示し、構成を明確にしましょう。'
                                },
                                {
                                    'zh-Hant': '加入一段親師合作的示例，增加說服力。',
                                    'en': 'Add one family-school partnership example for extra credibility.',
                                    'vi': 'Thêm ví dụ hợp tác gia đình-nhà trường để tăng tính thuyết phục.',
                                    'ja': '家庭と学校の連携例を加えて説得力を高めましょう。'
                                }
                            ]
                        }
                    },
                    con: {
                        beginner: {
                            claim: {
                                'zh-Hant': '我們反對全面禁止作業，因為適量練習能鞏固學習成果。',
                                'en': 'We oppose a full ban because light practice reinforces learning.',
                                'vi': 'Chúng tôi phản đối cấm hoàn toàn vì bài luyện nhẹ giúp củng cố kiến thức.',
                                'ja': '私たちは完全禁止に反対です。適量の宿題は学習定着に役立つからです。'
                            },
                            reason: {
                                'zh-Hant': '短而有意義的作業可以加深記憶與理解。',
                                'en': 'Short, purposeful tasks deepen memory and understanding.',
                                'vi': 'Bài ngắn có mục đích giúp ghi nhớ và hiểu sâu hơn.',
                                'ja': '短く目的のある課題は記憶と理解を深めます。'
                            },
                            evidence: {
                                'zh-Hant': '老師觀察到複習過的學生隔天更有自信。',
                                'en': 'Teachers observe more confident participation from students who review at home.',
                                'vi': 'Giáo viên nhận thấy học sinh ôn bài ở nhà tham gia tự tin hơn.',
                                'ja': '家庭で復習した生徒は翌日自信を持って発言すると報告されています。'
                            },
                            closing: {
                                'zh-Hant': '保留精選作業能建立習慣並讓家長參與學習。',
                                'en': 'Keeping curated homework builds routines and invites family involvement.',
                                'vi': 'Giữ lại bài tập chọn lọc giúp tạo thói quen và gắn kết phụ huynh.',
                                'ja': '厳選した宿題を残すことで習慣が身につき、保護者も関わりやすくなります。'
                            }
                        },
                        advanced: {
                            claim: {
                                'zh-Hant': '作業是連結學校與家庭的橋樑，不應草率取消。',
                                'en': 'Homework bridges school and home; removing it outright is premature.',
                                'vi': 'Bài tập nối kết trường học và gia đình, không nên bỏ vội vàng.',
                                'ja': '宿題は学校と家庭をつなぐ橋であり、性急に無くすべきではありません。'
                            },
                            reason: {
                                'zh-Hant': '設計良好的作業能培養責任感與自我管理能力。',
                                'en': 'Well-designed tasks cultivate responsibility and self-management.',
                                'vi': 'Bài tập được thiết kế tốt rèn trách nhiệm và tự quản.',
                                'ja': '工夫された宿題は責任感とセルフマネジメントを養います。'
                            },
                            evidence: {
                                'zh-Hant': '縱貫研究顯示適量作業與閱讀、數學成長正相關。',
                                'en': 'Longitudinal studies tie moderate homework to gains in reading and math.',
                                'vi': 'Nghiên cứu dài hạn cho thấy lượng bài tập vừa phải giúp tiến bộ đọc và toán.',
                                'ja': '適度な宿題が読解力と数学力の伸びにつながると長期研究が示しています。'
                            },
                            closing: {
                                'zh-Hant': '與其禁止，不如重新設計更精準的作業形式。',
                                'en': 'Instead of banning, redesign homework to be targeted and efficient.',
                                'vi': 'Thay vì cấm, hãy tái thiết kế bài tập cho hiệu quả và đúng trọng tâm.',
                                'ja': '禁止するのではなく、目的に沿った効率的な宿題へ改善すべきです。'
                            }
                        },
                        opponentPoints: [
                            {
                                'zh-Hant': '過多作業會讓孩子筋疲力盡並失去動力。',
                                'en': 'Too much homework leaves children exhausted and unmotivated.',
                                'vi': 'Quá nhiều bài tập khiến trẻ kiệt sức và mất động lực.',
                                'ja': '宿題が多すぎると子どもは疲れ切り、やる気を失います。'
                            },
                            {
                                'zh-Hant': '有些家庭缺乏安靜空間與資源協助孩子。',
                                'en': 'Some families lack quiet space or support to help with assignments.',
                                'vi': 'Nhiều gia đình thiếu không gian yên tĩnh hoặc người hỗ trợ làm bài.',
                                'ja': '静かな学習環境やサポートがない家庭もあります。'
                            },
                            {
                                'zh-Hant': '許多高表現國家已經在低作業量下取得佳績。',
                                'en': 'High-performing systems succeed with little to no homework already.',
                                'vi': 'Nhiều quốc gia thành tích cao vẫn duy trì ít bài tập.',
                                'ja': '宿題が少なくても成果を出している国が既にあります。'
                            }
                        ],
                        rebuttalFeedback: {
                            summary: {
                                'zh-Hant': '你抓住了責任感的角度，但還可以說明減量的具體方法。',
                                'en': 'You focused on responsibility; add details on how to keep quality while trimming load.',
                                'vi': 'Bạn nhấn mạnh trách nhiệm; hãy nói thêm cách giữ chất lượng khi giảm khối lượng.',
                                'ja': '責任感という観点は良いですが、負担を減らしつつ質を保つ方法も述べましょう。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '提出每週作業時數上限，讓方案更具體。',
                                    'en': 'Propose a weekly time cap to make the plan concrete.',
                                    'vi': 'Đề xuất giới hạn số giờ bài tập mỗi tuần để kế hoạch cụ thể hơn.',
                                    'ja': '週当たりの宿題時間の上限を示し、計画を具体化しましょう。'
                                },
                                {
                                    'zh-Hant': '補充一個學生陪伴或課後輔導的替代做法。',
                                    'en': 'Mention an alternative like mentoring or after-school support.',
                                    'vi': 'Đưa ra phương án thay thế như cố vấn hoặc hỗ trợ sau giờ học.',
                                    'ja': 'メンタリングや放課後支援など代替策を加えると効果的です。'
                                }
                            ]
                        },
                        coachFeedback: {
                            score: {
                                'zh-Hant': '分數：內容8、反駁8、表達7、策略7（總分30/40）。',
                                'en': 'Score: Content 8, Refutation 8, Delivery 7, Strategy 7 (30/40).',
                                'vi': 'Điểm: Nội dung 8, Phản biện 8, Trình bày 7, Chiến lược 7 (30/40).',
                                'ja': 'スコア：内容8・反論8・表現7・戦略7（30/40）。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '在結尾強調如何衡量作業品質，增加可行性。',
                                    'en': 'Close by showing how you will measure assignment quality for feasibility.',
                                    'vi': 'Kết luận bằng cách nêu cách đo chất lượng bài tập để tăng tính khả thi.',
                                    'ja': '宿題の質をどう測るかを示し、実現性をアピールしましょう。'
                                },
                                {
                                    'zh-Hant': '加入學生或家長的回饋，引導聽眾共鳴。',
                                    'en': 'Add student or parent feedback to build emotional resonance.',
                                    'vi': 'Thêm phản hồi của học sinh hoặc phụ huynh để tạo sự đồng cảm.',
                                    'ja': '生徒や保護者の声を取り入れ、共感を引き出しましょう。'
                                }
                            ]
                        }
                    }
                },
                questions: [
                    {
                        'zh-Hant': '這項政策想解決的核心問題是什麼？',
                        'en': 'What core problem does this policy aim to solve?',
                        'vi': 'Chính sách này muốn giải quyết vấn đề cốt lõi nào?',
                        'ja': 'この政策が解決したい核心課題は何ですか？'
                    },
                    {
                        'zh-Hant': '十歲孩子每天做多少作業才算健康？',
                        'en': 'How much nightly homework is healthy for a ten-year-old?',
                        'vi': 'Học sinh 10 tuổi nên làm bài mỗi tối trong bao lâu là hợp lý?',
                        'ja': '10歳の子どもにとって健康的な宿題時間はどれくらいですか？'
                    },
                    {
                        'zh-Hant': '若不寫作業，你如何衡量責任感與自律？',
                        'en': 'Without homework, how will you measure responsibility and self-management?',
                        'vi': 'Nếu không có bài tập, bạn đo lường trách nhiệm và tự quản thế nào?',
                        'ja': '宿題がない場合、責任感や自己管理力をどう測定しますか？'
                    },
                    {
                        'zh-Hant': '政策如何協助缺乏資源的家庭？',
                        'en': 'How will the policy support families with limited resources?',
                        'vi': 'Chính sách sẽ hỗ trợ gia đình thiếu điều kiện ra sao?',
                        'ja': '資源の少ない家庭をどのように支援しますか？'
                    },
                    {
                        'zh-Hant': '有哪些國際案例證明你的立場可行？',
                        'en': 'Which international examples make your side credible?',
                        'vi': 'Ví dụ quốc tế nào chứng minh lập trường của bạn?',
                        'ja': 'あなたの立場を裏付ける国際的な事例は何ですか？'
                    },
                    {
                        'zh-Hant': '作業期待改變後，教師會如何調整課堂？',
                        'en': 'When homework expectations change, how should teachers adapt lessons?',
                        'vi': 'Khi kỳ vọng về bài tập đổi khác, giáo viên sẽ điều chỉnh tiết dạy thế nào?',
                        'ja': '宿題の前提が変わったとき、教師は授業をどう調整しますか？'
                    },
                    {
                        'zh-Hant': '家長在放學後應扮演什麼角色？',
                        'en': 'What role should parents play after school under your plan?',
                        'vi': 'Theo kế hoạch của bạn, phụ huynh đóng vai trò gì sau giờ học?',
                        'ja': 'あなたの計画では放課後に保護者はどんな役割を担いますか？'
                    },
                    {
                        'zh-Hant': '你如何確保低作業量也能維持學習成果？',
                        'en': 'How will you ensure low homework still preserves learning outcomes?',
                        'vi': 'Làm sao bảo đảm ít bài tập mà kết quả học tập vẫn giữ vững?',
                        'ja': '宿題を減らしても学習成果を維持できる仕組みは？'
                    }
                ]
            },
            {
                id: 'school-uniforms',
                title: {
                    'zh-Hant': '本院支持校服制度',
                    'en': 'This house supports requiring school uniforms',
                    'vi': 'Quốc hội ủng hộ việc áp dụng đồng phục học đường',
                    'ja': '本院は学校制服制度を支持する'
                },
                sides: {
                    pro: {
                        beginner: {
                            claim: {
                                'zh-Hant': '我們支持制服，讓每位學生以同樣的起點進教室。',
                                'en': 'We support uniforms so every student walks in on equal footing.',
                                'vi': 'Chúng tôi ủng hộ đồng phục để mọi học sinh bắt đầu như nhau.',
                                'ja': '制服を導入し、すべての生徒が同じ立場で教室に入るべきです。'
                            },
                            reason: {
                                'zh-Hant': '統一服裝能降低外表比較與品牌壓力。',
                                'en': 'Shared attire lowers pressure to compete over fashion and brands.',
                                'vi': 'Trang phục giống nhau giảm áp lực so bì thời trang.',
                                'ja': '同じ服装はファッションやブランドの競争を和らげます。'
                            },
                            evidence: {
                                'zh-Hant': '校長回報導入制服後走廊衝突明顯下降。',
                                'en': 'Principals report fewer hallway conflicts after adopting uniforms.',
                                'vi': 'Nhiều hiệu trưởng cho biết xung đột giảm sau khi áp dụng đồng phục.',
                                'ja': '制服導入後は廊下でのトラブルが減ったと報告されています。'
                            },
                            closing: {
                                'zh-Hant': '制服打造安全、專注的學習氛圍。',
                                'en': 'Uniforms create a safer, more focused learning climate.',
                                'vi': 'Đồng phục tạo môi trường học an toàn và tập trung.',
                                'ja': '制服は安全で集中できる学習環境を作ります。'
                            }
                        },
                        advanced: {
                            claim: {
                                'zh-Hant': '制服是一種建立包容校園文化的策略。',
                                'en': 'Uniforms are a strategy to build an inclusive school culture.',
                                'vi': 'Đồng phục là chiến lược xây dựng văn hóa trường học bao trùm.',
                                'ja': '制服は包摂的な校風を築く戦略です。'
                            },
                            reason: {
                                'zh-Hant': '它淡化經濟差距，讓焦點回到品格與表現。',
                                'en': 'They mute visible income gaps and keep focus on character and performance.',
                                'vi': 'Đồng phục làm mờ chênh lệch thu nhập, giúp tập trung vào phẩm chất và thành tích.',
                                'ja': '経済格差を目立たなくし、人格や成果に集中させます。'
                            },
                            evidence: {
                                'zh-Hant': '英國與新加坡將制服與出勤率、守時改善連結。',
                                'en': 'Countries like the UK and Singapore tie uniforms to better attendance and punctuality.',
                                'vi': 'Anh và Singapore ghi nhận đồng phục giúp cải thiện chuyên cần và đúng giờ.',
                                'ja': '英国やシンガポールでは制服が出席率と時間厳守の向上につながっています。'
                            },
                            closing: {
                                'zh-Hant': '一致的服裝傳達尊重、專業與歸屬感。',
                                'en': 'Shared attire signals respect, professionalism, and belonging.',
                                'vi': 'Trang phục thống nhất thể hiện sự tôn trọng, chuyên nghiệp và gắn kết.',
                                'ja': '統一された装いは敬意と所属意識を示します。'
                            }
                        },
                        opponentPoints: [
                            {
                                'zh-Hant': '制服壓抑了學生的個性與創造力。',
                                'en': 'Uniforms silence student individuality and creativity.',
                                'vi': 'Đồng phục làm mất đi cá tính và sự sáng tạo.',
                                'ja': '制服は生徒の個性と創造性を奪います。'
                            },
                            {
                                'zh-Hant': '家庭得多花一筆費用購買制服和替換件。',
                                'en': 'Families must spend extra money on uniforms and replacements.',
                                'vi': 'Gia đình phải tốn thêm tiền mua và thay đồng phục.',
                                'ja': '家庭は制服の購入と買い替えに追加費用がかかります。'
                            },
                            {
                                'zh-Hant': '不合身或不舒適的制服會讓學生分心。',
                                'en': 'Uncomfortable fits distract students throughout the day.',
                                'vi': 'Đồng phục không thoải mái khiến học sinh mất tập trung.',
                                'ja': 'サイズが合わない制服は一日中生徒の集中を妨げます。'
                            }
                        ],
                        rebuttalFeedback: {
                            summary: {
                                'zh-Hant': '你說明了公平性，但可再補充費用輔助的配套。',
                                'en': 'You stressed equity; add how supports offset uniform costs.',
                                'vi': 'Bạn nhấn mạnh sự công bằng; hãy nói thêm cách hỗ trợ chi phí đồng phục.',
                                'ja': '公平性を強調しましたが、費用支援策も触れると良いでしょう。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '提出租借、以物易物或補助方案，化解成本疑慮。',
                                    'en': 'Offer rental, exchange, or subsidy programmes to ease cost concerns.',
                                    'vi': 'Đề xuất chương trình cho thuê, trao đổi hoặc trợ cấp để giảm lo chi phí.',
                                    'ja': 'レンタルや補助制度を提案し、費用の不安を和らげましょう。'
                                },
                                {
                                    'zh-Hant': '說明如何讓學生在配件或徽章上表達自我。',
                                    'en': 'Explain how students can still personalise with badges or accessories.',
                                    'vi': 'Giải thích cách học sinh vẫn thể hiện bản thân qua phù hiệu, phụ kiện.',
                                    'ja': 'バッジやアクセサリーで個性を表現できる点を示してください。'
                                }
                            ]
                        },
                        coachFeedback: {
                            score: {
                                'zh-Hant': '分數：內容8、反駁8、表達7、策略8（總分31/40）。',
                                'en': 'Score: Content 8, Refutation 8, Delivery 7, Strategy 8 (31/40).',
                                'vi': 'Điểm: Nội dung 8, Phản biện 8, Trình bày 7, Chiến lược 8 (31/40).',
                                'ja': 'スコア：内容8・反論8・表現7・戦略8（31/40）。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '在引言快速比較「有制服」與「無制服」的校園氛圍。',
                                    'en': 'In your intro, compare climate with and without uniforms to set contrast.',
                                    'vi': 'Ở phần mở đầu, so sánh bầu không khí khi có và không có đồng phục.',
                                    'ja': '導入部で制服の有無による校内雰囲気の違いを示しましょう。'
                                },
                                {
                                    'zh-Hant': '納入一段學生感言，增加故事性。',
                                    'en': 'Include a student quote to add storytelling.',
                                    'vi': 'Thêm lời kể của học sinh để tạo câu chuyện.',
                                    'ja': '生徒の声を引用してストーリー性を高めましょう。'
                                }
                            ]
                        }
                    },
                    con: {
                        beginner: {
                            claim: {
                                'zh-Hant': '我們反對硬性制服，因為學生需要穿著自由展現自我。',
                                'en': 'We oppose rigid uniforms because students need clothing choice to express themselves.',
                                'vi': 'Chúng tôi phản đối đồng phục cứng nhắc vì học sinh cần tự do ăn mặc.',
                                'ja': '生徒には自己表現のための服装の自由が必要なので制服に反対します。'
                            },
                            reason: {
                                'zh-Hant': '服裝是建立自信與身份的重要方式。',
                                'en': 'What they wear helps build confidence and identity.',
                                'vi': 'Trang phục giúp xây dựng sự tự tin và bản sắc.',
                                'ja': '服装は自信とアイデンティティを育てる手段です。'
                            },
                            evidence: {
                                'zh-Hant': '研究指出允許自由穿著時學生滿意度較高。',
                                'en': 'Studies show higher school satisfaction when dress choice is allowed.',
                                'vi': 'Nghiên cứu cho thấy học sinh hài lòng hơn khi được chọn trang phục.',
                                'ja': '服装の自由がある学校では満足度が高いと研究で示されています。'
                            },
                            closing: {
                                'zh-Hant': '多元穿著培養創意，也教會尊重差異。',
                                'en': 'Varied clothing nurtures creativity and respect for differences.',
                                'vi': 'Trang phục đa dạng nuôi dưỡng sáng tạo và tôn trọng khác biệt.',
                                'ja': '多様な服装は創造性と違いへの敬意を育てます。'
                            }
                        },
                        advanced: {
                            claim: {
                                'zh-Hant': '制式制服忽視了文化、身體與性別表達的需求。',
                                'en': 'Rigid uniforms ignore cultural, physical, and gender expression needs.',
                                'vi': 'Đồng phục cứng nhắc bỏ qua nhu cầu văn hóa, thể chất và biểu hiện giới.',
                                'ja': '画一的な制服は文化的・身体的・ジェンダー表現のニーズを無視します。'
                            },
                            reason: {
                                'zh-Hant': '標準剪裁很難符合不同體型或信仰的需求。',
                                'en': 'Standard cuts rarely fit diverse bodies or faith-based attire.',
                                'vi': 'Kiểu cắt chuẩn hiếm khi phù hợp nhiều vóc dáng hay quy định tôn giáo.',
                                'ja': '標準的な仕立ては体型や宗教的服装に適合しません。'
                            },
                            evidence: {
                                'zh-Hant': '加拿大與美國放寬制服後，學生參與感提升。',
                                'en': 'Schools in Canada and the US saw engagement rise after loosening uniform rules.',
                                'vi': 'Nhiều trường tại Canada và Mỹ tăng mức độ tham gia khi nới lỏng đồng phục.',
                                'ja': 'カナダや米国では制服規定を緩めると参加度が上がりました。'
                            },
                            closing: {
                                'zh-Hant': '應由學生共同制定 dress code，而非強迫穿著同一制服。',
                                'en': 'Students should co-create a dress code instead of enforcing one outfit.',
                                'vi': 'Nên cùng học sinh xây dựng quy định ăn mặc thay vì áp đặt một bộ đồng phục.',
                                'ja': '制服ではなく、生徒と共に服装ルールを作るべきです。'
                            }
                        },
                        opponentPoints: [
                            {
                                'zh-Hant': '制服能減少因品牌與價格造成的霸凌與排擠。',
                                'en': 'Uniforms reduce bullying tied to brands and price tags.',
                                'vi': 'Đồng phục giảm bắt nạt liên quan tới thương hiệu và giá tiền.',
                                'ja': '制服はブランドや価格によるいじめを減らします。'
                            },
                            {
                                'zh-Hant': '一致穿著讓校園安全性與歸屬感更高。',
                                'en': 'Shared attire boosts campus safety and belonging.',
                                'vi': 'Trang phục thống nhất tăng cảm giác an toàn và gắn kết.',
                                'ja': '同じ服装は学校の安全性と所属意識を高めます。'
                            },
                            {
                                'zh-Hant': '大量採購制服反而可能降低家庭支出。',
                                'en': 'Bulk purchasing can actually lower overall family spending.',
                                'vi': 'Mua đồng phục số lượng lớn có thể giảm chi phí chung.',
                                'ja': '制服をまとめて購入すれば家庭の負担が減ることもあります。'
                            }
                        ],
                        rebuttalFeedback: {
                            summary: {
                                'zh-Hant': '你強調自我表達，但建議提出具體的 dress code 替代方案。',
                                'en': 'You focused on expression; present a concrete dress-code alternative.',
                                'vi': 'Bạn nhấn mạnh tự do biểu đạt; hãy đưa ra quy định ăn mặc cụ thể thay thế.',
                                'ja': '自己表現を強調しましたが、代わりの服装ルールを具体的に示しましょう。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '描述如何處理不當穿著的界線，避免聽眾覺得太鬆散。',
                                    'en': 'Explain boundaries for inappropriate outfits so the plan feels grounded.',
                                    'vi': 'Giải thích ranh giới trang phục không phù hợp để kế hoạch không lỏng lẻo.',
                                    'ja': '不適切な服装の基準を示し、計画に実効性を持たせましょう。'
                                },
                                {
                                    'zh-Hant': '加入一個文化或性別友善的具體案例。',
                                    'en': 'Add one example of a culturally or gender-inclusive policy working.',
                                    'vi': 'Đưa ví dụ về chính sách thân thiện văn hóa hoặc giới được áp dụng hiệu quả.',
                                    'ja': '文化やジェンダーに配慮した成功事例を紹介しましょう。'
                                }
                            ]
                        },
                        coachFeedback: {
                            score: {
                                'zh-Hant': '分數：內容7、反駁8、表達8、策略7（總分30/40）。',
                                'en': 'Score: Content 7, Refutation 8, Delivery 8, Strategy 7 (30/40).',
                                'vi': 'Điểm: Nội dung 7, Phản biện 8, Trình bày 8, Chiến lược 7 (30/40).',
                                'ja': 'スコア：内容7・反論8・表現8・戦略7（30/40）。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '用一張表格列出 dress code 原則，提升清晰度。',
                                    'en': 'Use a quick checklist of dress-code principles to boost clarity.',
                                    'vi': 'Dùng bảng liệt kê nguyên tắc trang phục để rõ ràng hơn.',
                                    'ja': '服装ルールのチェックリストを示し、分かりやすくしましょう。'
                                },
                                {
                                    'zh-Hant': '在結尾提醒聽眾此方案也能提升學生參與度。',
                                    'en': 'Close by linking your model to improved student engagement.',
                                    'vi': 'Kết luận bằng cách liên hệ mô hình với việc tăng mức độ tham gia của học sinh.',
                                    'ja': '提案が生徒の参加意欲を高める点を最後に強調しましょう。'
                                }
                            ]
                        }
                    }
                },
                questions: [
                    {
                        'zh-Hant': '你認為 dress code 應優先守護公平還是表達？',
                        'en': 'Should a dress code protect equity or expression first?',
                        'vi': 'Quy định trang phục nên ưu tiên công bằng hay biểu đạt?',
                        'ja': '服装ルールは公平性と表現のどちらを優先すべきですか？'
                    },
                    {
                        'zh-Hant': '對於無法負擔制服的家庭，你提供什麼協助？',
                        'en': 'How will you support families who cannot afford uniforms?',
                        'vi': 'Bạn hỗ trợ thế nào cho gia đình không đủ khả năng mua đồng phục?',
                        'ja': '制服を負担できない家庭への支援策はありますか？'
                    },
                    {
                        'zh-Hant': '服裝與學習表現之間有何研究連結？',
                        'en': 'What research links attire to academic or behavioural outcomes?',
                        'vi': 'Có nghiên cứu nào liên hệ trang phục với kết quả học tập hay hành vi không?',
                        'ja': '服装と学業・行動の関連を示す研究はありますか？'
                    },
                    {
                        'zh-Hant': '文化或宗教服飾如何在制服政策中被尊重？',
                        'en': 'How will cultural or religious attire be accommodated?',
                        'vi': 'Bạn sẽ dung hòa trang phục văn hóa hay tôn giáo như thế nào?',
                        'ja': '文化的・宗教的な服装にはどう対応しますか？'
                    },
                    {
                        'zh-Hant': '誰能決定什麼是「合宜」的穿著？',
                        'en': 'Who decides what counts as appropriate clothing?',
                        'vi': 'Ai sẽ quyết định thế nào là trang phục phù hợp?',
                        'ja': '何が適切な服装かを誰が判断しますか？'
                    },
                    {
                        'zh-Hant': '季節轉換時，如何確保學生舒適？',
                        'en': 'How will you keep students comfortable during seasonal changes?',
                        'vi': 'Khi chuyển mùa, bạn đảm bảo học sinh vẫn thoải mái ra sao?',
                        'ja': '季節の変わり目に生徒の快適さをどう確保しますか？'
                    },
                    {
                        'zh-Hant': '若政策通過或被否決，你打算如何衡量成功？',
                        'en': 'If the policy passes or fails, how will you measure success?',
                        'vi': 'Nếu chính sách được thông qua hoặc bác bỏ, bạn sẽ đo lường thành công thế nào?',
                        'ja': '政策が採択または否決された場合、成功をどう測定しますか？'
                    },
                    {
                        'zh-Hant': '你會如何讓學生參與制服或 dress code 的制定？',
                        'en': 'How will you include students in designing the uniform or dress code?',
                        'vi': 'Bạn sẽ khiến học sinh tham gia xây dựng đồng phục hay quy định trang phục thế nào?',
                        'ja': '制服や服装ルールの策定に生徒をどう参加させますか？'
                    }
                ]
            },
            {
                id: 'screen-time',
                title: {
                    'zh-Hant': '本院認為應限制12歲以下兒童的每日螢幕時間',
                    'en': 'This house would limit daily screen time for children under 12',
                    'vi': 'Quốc hội cho rằng nên giới hạn thời lượng màn hình mỗi ngày cho trẻ dưới 12 tuổi',
                    'ja': '本院は12歳未満の子どもの1日のスクリーン時間を制限すべきだと考える'
                },
                sides: {
                    pro: {
                        beginner: {
                            claim: {
                                'zh-Hant': '我們支持設定螢幕上限，幫助孩子建立健康的數位習慣。',
                                'en': 'We support setting limits so children build healthy digital habits.',
                                'vi': 'Chúng tôi ủng hộ giới hạn để trẻ hình thành thói quen số lành mạnh.',
                                'ja': '子どもが健全なデジタル習慣を身につけるよう上限を設けるべきです。'
                            },
                            reason: {
                                'zh-Hant': '過多螢幕時間會排擠睡眠與戶外活動。',
                                'en': 'Excess screen time crowds out sleep and outdoor play.',
                                'vi': 'Thời gian màn hình quá nhiều chiếm mất giờ ngủ và vận động.',
                                'ja': 'スクリーン時間が多すぎると睡眠や外遊びが犠牲になります。'
                            },
                            evidence: {
                                'zh-Hant': '小兒科協會建議12歲以下每天不超過兩小時。',
                                'en': 'Pediatric associations recommend no more than two hours a day under age twelve.',
                                'vi': 'Hiệp hội nhi khoa khuyến nghị trẻ dưới 12 tuổi không quá hai giờ mỗi ngày.',
                                'ja': '小児科学会は12歳未満は1日2時間以内を推奨しています。'
                            },
                            closing: {
                                'zh-Hant': '明確的限制能鼓勵家庭花時間閱讀與共同活動。',
                                'en': 'Clear limits encourage families to fill time with reading and shared play.',
                                'vi': 'Giới hạn rõ ràng khuyến khích gia đình đọc sách và chơi cùng nhau.',
                                'ja': '明確な制限があれば家族で読書や遊びを楽しめます。'
                            }
                        },
                        advanced: {
                            claim: {
                                'zh-Hant': '立法保障兒童專注力與情緒健康是必要的。',
                                'en': 'Legislating guardrails protects children’s focus and emotional health.',
                                'vi': 'Đặt rào chắn pháp lý để bảo vệ sự tập trung và sức khỏe cảm xúc của trẻ.',
                                'ja': '子どもの集中力と感情の健康を守る法的枠組みが必要です。'
                            },
                            reason: {
                                'zh-Hant': '過度使用與焦慮、注意力不足密切相關。',
                                'en': 'Heavy use is strongly linked to anxiety and attention issues.',
                                'vi': 'Lạm dụng màn hình liên quan chặt chẽ đến lo âu và thiếu tập trung.',
                                'ja': '過度な利用は不安や注意欠如と強い関連があります。'
                            },
                            evidence: {
                                'zh-Hant': '世界衛生組織研究指出超過上限風險明顯上升。',
                                'en': 'WHO reports show risks spike beyond recommended thresholds.',
                                'vi': 'Báo cáo WHO cho thấy rủi ro tăng mạnh khi vượt khuyến nghị.',
                                'ja': 'WHOの報告では推奨時間を超えるとリスクが急増します。'
                            },
                            closing: {
                                'zh-Hant': '制度化限制迫使平台與家長共同建立保護機制。',
                                'en': 'Codifying limits pushes platforms and parents to build safeguards together.',
                                'vi': 'Thiết lập luật buộc nền tảng và phụ huynh cùng xây dựng biện pháp bảo vệ.',
                                'ja': '法的な上限により、プラットフォームと保護者が協力して安全策を整えます。'
                            }
                        },
                        opponentPoints: [
                            {
                                'zh-Hant': '家庭日程不同，需要更大的彈性。',
                                'en': 'Family schedules differ, so flexibility is essential.',
                                'vi': 'Lịch sinh hoạt gia đình khác nhau nên cần linh hoạt.',
                                'ja': '家庭ごとに生活リズムが違うため柔軟性が必要です。'
                            },
                            {
                                'zh-Hant': '科技也是學習與保持聯繫的重要工具。',
                                'en': 'Technology is vital for learning and staying connected.',
                                'vi': 'Công nghệ cũng rất quan trọng cho học tập và kết nối.',
                                'ja': 'テクノロジーは学習や交流に不可欠です。'
                            },
                            {
                                'zh-Hant': '嚴格限制可能懲罰依賴螢幕輔具的孩子。',
                                'en': 'Strict caps may punish kids who rely on screens for accessibility.',
                                'vi': 'Giới hạn cứng có thể gây bất lợi cho trẻ cần hỗ trợ qua màn hình.',
                                'ja': '厳しい制限は支援機器としてスクリーンを使う子どもを困らせます。'
                            }
                        ],
                        rebuttalFeedback: {
                            summary: {
                                'zh-Hant': '你點出健康風險，但需要交代彈性調整的空間。',
                                'en': 'You flagged health risks; clarify where flexibility remains.',
                                'vi': 'Bạn nêu rủi ro sức khỏe; hãy chỉ rõ những phần linh hoạt.',
                                'ja': '健康リスクを示しましたが、柔軟に対応する余地も説明しましょう。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '說明如何為線上課程或輔具設定例外門檻。',
                                    'en': 'Describe exception pathways for online classes or assistive tech.',
                                    'vi': 'Giải thích cách đặt ngoại lệ cho lớp học trực tuyến hoặc thiết bị hỗ trợ.',
                                    'ja': 'オンライン授業や支援機器の例外枠を具体的に述べましょう。'
                                },
                                {
                                    'zh-Hant': '加入平台責任的條款，讓方案更全面。',
                                    'en': 'Add platform accountability measures to round out the plan.',
                                    'vi': 'Bổ sung trách nhiệm của nền tảng để kế hoạch toàn diện hơn.',
                                    'ja': 'プラットフォームの責任を盛り込み、計画を包括的にしましょう。'
                                }
                            ]
                        },
                        coachFeedback: {
                            score: {
                                'zh-Hant': '分數：內容9、反駁7、表達7、策略8（總分31/40）。',
                                'en': 'Score: Content 9, Refutation 7, Delivery 7, Strategy 8 (31/40).',
                                'vi': 'Điểm: Nội dung 9, Phản biện 7, Trình bày 7, Chiến lược 8 (31/40).',
                                'ja': 'スコア：内容9・反論7・表現7・戦略8（31/40）。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '補上一段統計圖或具體數據，提升震撼力。',
                                    'en': 'Include a quick data snapshot to increase impact.',
                                    'vi': 'Thêm số liệu nhanh để lập luận thuyết phục hơn.',
                                    'ja': '統計データを短く示し、説得力を高めましょう。'
                                },
                                {
                                    'zh-Hant': '描述一個成功實施時間限制的城市或學區案例。',
                                    'en': 'Reference a city or district that implemented limits successfully.',
                                    'vi': 'Nhắc tới một thành phố hay quận áp dụng giới hạn thành công.',
                                    'ja': '時間制限を導入して成功した自治体を紹介してください。'
                                }
                            ]
                        }
                    },
                    con: {
                        beginner: {
                            claim: {
                                'zh-Hant': '我們反對硬性限制，因為每個家庭需要不同的安排。',
                                'en': 'We oppose rigid caps because every family needs different arrangements.',
                                'vi': 'Chúng tôi phản đối giới hạn cứng vì mỗi gia đình có nhu cầu khác nhau.',
                                'ja': '家庭ごとに事情が違うので、画一的な上限には反対します。'
                            },
                            reason: {
                                'zh-Hant': '螢幕也是學習、社交與語言練習的重要工具。',
                                'en': 'Screens support learning, socialisation, and language practice.',
                                'vi': 'Màn hình hỗ trợ học tập, giao tiếp và luyện ngôn ngữ.',
                                'ja': 'スクリーンは学習や交流、言語練習にも役立ちます。'
                            },
                            evidence: {
                                'zh-Hant': '遠距教學與家族聯繫已是日常生活的一部分。',
                                'en': 'Remote classes and family video calls are now part of daily life.',
                                'vi': 'Lớp học trực tuyến và gọi video với gia đình đã trở nên quen thuộc.',
                                'ja': '遠隔授業や家族とのビデオ通話は日常になりました。'
                            },
                            closing: {
                                'zh-Hant': '家長應定制彈性規範，而非被動接受統一時數。',
                                'en': 'Parents should tailor flexible rules instead of a one-size time cap.',
                                'vi': 'Phụ huynh nên xây dựng quy tắc linh hoạt thay vì áp đặt một con số cố định.',
                                'ja': '保護者が家庭に合わせた柔軟なルールを作るべきです。'
                            }
                        },
                        advanced: {
                            claim: {
                                'zh-Hant': '全面限制忽略數位素養是未來必備技能。',
                                'en': 'Blanket limits ignore that digital fluency is a future literacy.',
                                'vi': 'Giới hạn tổng thể bỏ qua việc thành thạo công nghệ là kỹ năng tương lai.',
                                'ja': '包括的な制限はデジタルリテラシーという将来の必須スキルを無視します。'
                            },
                            reason: {
                                'zh-Hant': '重點應放在共同制定媒體使用規範，而不是單一時數。',
                                'en': 'We should focus on co-created media plans, not chasing a single number.',
                                'vi': 'Trọng tâm nên là kế hoạch sử dụng thiết bị do gia đình cùng xây dựng, không chỉ là con số giờ.',
                                'ja': '時間ではなく、家族で作るメディア利用計画に焦点を当てるべきです。'
                            },
                            evidence: {
                                'zh-Hant': '紐西蘭家庭媒體計畫顯示協商規範比硬性限制更有效。',
                                'en': 'New Zealand family media plans show negotiated rules outperform strict bans.',
                                'vi': 'Kế hoạch truyền thông gia đình ở New Zealand cho thấy quy tắc thương lượng hiệu quả hơn cấm đoán.',
                                'ja': 'ニュージーランドの家庭メディア計画では交渉型ルールが禁止より効果的でした。'
                            },
                            closing: {
                                'zh-Hant': '應投資媒體素養與家長指引，而非單一法律限制。',
                                'en': 'Invest in media literacy and parent guides instead of a single legal cap.',
                                'vi': 'Nên đầu tư vào giáo dục truyền thông và hướng dẫn cho phụ huynh thay vì luật cứng.',
                                'ja': '法的制限よりもメディアリテラシー教育や保護者ガイドに投資しましょう。'
                            }
                        },
                        opponentPoints: [
                            {
                                'zh-Hant': '過度使用螢幕會傷害睡眠與注意力。',
                                'en': 'Excess screen time harms sleep and focus.',
                                'vi': 'Dùng màn hình quá nhiều ảnh hưởng xấu đến giấc ngủ và sự tập trung.',
                                'ja': 'スクリーンのやりすぎは睡眠と集中力に悪影響です。'
                            },
                            {
                                'zh-Hant': '醫療專家已提出明確使用上限建議。',
                                'en': 'Health experts already recommend clear upper limits.',
                                'vi': 'Chuyên gia y tế đã đưa ra khuyến nghị rõ ràng về giới hạn.',
                                'ja': '専門家はすでに明確な利用上限を勧告しています。'
                            },
                            {
                                'zh-Hant': '平台演算法會刻意讓孩子上癮，需要外部制衡。',
                                'en': 'Platform algorithms hook kids intentionally, so we need external guardrails.',
                                'vi': 'Thuật toán của nền tảng cố giữ trẻ trên màn hình nên cần hàng rào bên ngoài.',
                                'ja': 'プラットフォームのアルゴリズムは子どもを拘束するため外部の歯止めが必要です。'
                            }
                        ],
                        rebuttalFeedback: {
                            summary: {
                                'zh-Hant': '你成功強調彈性，但請補充如何與醫療建議對齊。',
                                'en': 'You stressed flexibility; now align it with medical guidance.',
                                'vi': 'Bạn nhấn mạnh tính linh hoạt; hãy giải thích sao cho phù hợp khuyến nghị y tế.',
                                'ja': '柔軟性を強調しましたが、医療推奨との整合性も示しましょう。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '提出家庭媒體合約的範例，讓方案可操作。',
                                    'en': 'Share a sample family media contract to show practicality.',
                                    'vi': 'Đưa ví dụ về "hợp đồng" sử dụng thiết bị trong gia đình để dễ áp dụng.',
                                    'ja': '家庭メディア契約の例を示し、実行しやすさを伝えましょう。'
                                },
                                {
                                    'zh-Hant': '說明如何追蹤與回報螢幕使用時間，確保落實。',
                                    'en': 'Explain tracking and reflection habits to ensure follow-through.',
                                    'vi': 'Giải thích cách theo dõi và cùng đánh giá thời gian màn hình.',
                                    'ja': 'スクリーン時間を記録し振り返る方法を提示しましょう。'
                                }
                            ]
                        },
                        coachFeedback: {
                            score: {
                                'zh-Hant': '分數：內容7、反駁7、表達8、策略8（總分30/40）。',
                                'en': 'Score: Content 7, Refutation 7, Delivery 8, Strategy 8 (30/40).',
                                'vi': 'Điểm: Nội dung 7, Phản biện 7, Trình bày 8, Chiến lược 8 (30/40).',
                                'ja': 'スコア：内容7・反論7・表現8・戦略8（30/40）。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '開場可先肯定健康風險，再引出自律框架。',
                                    'en': 'Open by acknowledging health risks before pivoting to self-regulation.',
                                    'vi': 'Mở đầu nên ghi nhận rủi ro sức khỏe rồi chuyển sang khuôn khổ tự quản.',
                                    'ja': '健康リスクを認めた上で自律的な枠組みに話をつなげましょう。'
                                },
                                {
                                    'zh-Hant': '加入家長與孩子共同訂規則的故事，拉近距離。',
                                    'en': 'Add a story of a family co-writing rules to humanise your plan.',
                                    'vi': 'Kể câu chuyện gia đình cùng đặt quy tắc để bài nói gần gũi hơn.',
                                    'ja': '家族がルールを一緒に作った事例を語り、親近感を与えましょう。'
                                }
                            ]
                        }
                    }
                },
                questions: [
                    {
                        'zh-Hant': '你最擔心螢幕過度使用造成哪些健康影響？',
                        'en': 'Which health impacts of screen overuse worry you most?',
                        'vi': 'Bạn lo ngại nhất tác động sức khỏe nào do dùng màn hình quá mức?',
                        'ja': 'スクリーンの使いすぎで最も懸念する健康影響は何ですか？'
                    },
                    {
                        'zh-Hant': '如何區分裝置上的學習時間與娛樂時間？',
                        'en': 'How will you distinguish learning time from entertainment on devices?',
                        'vi': 'Bạn phân biệt thế nào giữa thời gian học và giải trí trên thiết bị?',
                        'ja': '学習時間と娯楽時間をどう区別しますか？'
                    },
                    {
                        'zh-Hant': '家長需要哪些工具來追蹤螢幕使用？',
                        'en': 'What tools do parents need to track screen use?',
                        'vi': 'Phụ huynh cần công cụ nào để theo dõi thời gian màn hình?',
                        'ja': '保護者がスクリーン時間を管理するにはどんなツールが必要ですか？'
                    },
                    {
                        'zh-Hant': '政策如何照顧依賴輔具或特殊教育需求的孩子？',
                        'en': 'How will the policy accommodate accessibility or special education needs?',
                        'vi': 'Chính sách hỗ trợ ra sao cho trẻ cần thiết bị hỗ trợ hoặc giáo dục đặc biệt?',
                        'ja': '支援機器や特別支援が必要な子どもにはどう対応しますか？'
                    },
                    {
                        'zh-Hant': '你會用哪些誘因或罰則讓平台配合？',
                        'en': 'What incentives or penalties ensure platform cooperation?',
                        'vi': 'Bạn sẽ dùng ưu đãi hay chế tài nào để nền tảng phối hợp?',
                        'ja': 'プラットフォームに協力させるためのインセンティブや罰則は？'
                    },
                    {
                        'zh-Hant': '要如何衡量螢幕限制的成效或副作用？',
                        'en': 'How will you measure success or unintended harms from the limits?',
                        'vi': 'Bạn đo lường hiệu quả và tác dụng phụ của giới hạn thế nào?',
                        'ja': '制限の効果や副作用をどう測定しますか？'
                    },
                    {
                        'zh-Hant': '減少螢幕後，你建議用哪些替代活動填補時間？',
                        'en': 'What activities should fill the time when screens are reduced?',
                        'vi': 'Khi giảm màn hình, nên thay bằng hoạt động nào?',
                        'ja': 'スクリーン時間を減らした分、どんな活動で補いますか？'
                    },
                    {
                        'zh-Hant': '你會如何向孩子與照顧者解釋這項期待？',
                        'en': 'How will you communicate the expectations to children and caregivers?',
                        'vi': 'Bạn giải thích kỳ vọng này cho trẻ và người chăm sóc ra sao?',
                        'ja': '子どもと保護者にこの方針をどう伝えますか？'
                    }
                ]
            },
            {
                id: 'vegetarian-day',
                title: {
                    'zh-Hant': '本院支持學校素食日政策',
                    'en': 'This house supports a vegetarian day policy in schools',
                    'vi': 'Quốc hội ủng hộ chính sách ngày ăn chay tại trường học',
                    'ja': '本院は学校のベジタリアンデー政策を支持する'
                },
                sides: {
                    pro: {
                        beginner: {
                            claim: {
                                'zh-Hant': '我們支持每週一次的素食日，讓學生吃得更均衡。',
                                'en': 'We support a weekly vegetarian day so students eat more balanced meals.',
                                'vi': 'Chúng tôi ủng hộ mỗi tuần một ngày ăn chay để học sinh ăn uống cân bằng hơn.',
                                'ja': '週に一度のベジタリアンデーを導入し、栄養バランスを整えましょう。'
                            },
                            reason: {
                                'zh-Hant': '素食選項能增加蔬果與纖維攝取。',
                                'en': 'Plant-based menus increase vegetables and fibre intake.',
                                'vi': 'Thực đơn chay giúp tăng rau củ và chất xơ.',
                                'ja': '植物ベースの献立で野菜と食物繊維が増えます。'
                            },
                            evidence: {
                                'zh-Hant': '營養研究指出素食日能降低加工肉攝取。',
                                'en': 'Nutrition studies show vegetarian days reduce processed meat consumption.',
                                'vi': 'Các nghiên cứu dinh dưỡng cho thấy ngày ăn chay giảm lượng thịt chế biến.',
                                'ja': '栄養研究ではベジタリアンデーが加工肉の摂取を減らすと示されています。'
                            },
                            closing: {
                                'zh-Hant': '這是建立健康飲食習慣的簡單起點。',
                                'en': 'It is a simple starting point for lifelong healthy eating habits.',
                                'vi': 'Đây là bước khởi đầu đơn giản cho thói quen ăn uống lành mạnh lâu dài.',
                                'ja': '生涯にわたる健康的な食生活への簡単な第一歩です。'
                            }
                        },
                        advanced: {
                            claim: {
                                'zh-Hant': '素食日同時推動健康與永續教育。',
                                'en': 'Vegetarian days advance both health and sustainability education.',
                                'vi': 'Ngày ăn chay thúc đẩy cả sức khỏe lẫn giáo dục bền vững.',
                                'ja': 'ベジタリアンデーは健康と持続可能性の教育を同時に進めます。'
                            },
                            reason: {
                                'zh-Hant': '透過體驗式餐點，學生能理解飲食與氣候的連結。',
                                'en': 'Experiential menus help students link diet choices to climate impact.',
                                'vi': 'Thực đơn trải nghiệm giúp học sinh hiểu mối liên hệ giữa ăn uống và khí hậu.',
                                'ja': '体験型の献立で食事と気候の関係を理解できます。'
                            },
                            evidence: {
                                'zh-Hant': '德國與台灣示範學校實施後，廚餘與碳排都下降。',
                                'en': 'Pilot schools in Germany and Taiwan saw food waste and emissions drop.',
                                'vi': 'Các trường thí điểm ở Đức và Đài Loan giảm rác thải thực phẩm và khí thải.',
                                'ja': 'ドイツや台湾のモデル校では食品ロスと排出量が減りました。'
                            },
                            closing: {
                                'zh-Hant': '學生也能學會設計兼顧營養與環境的菜單。',
                                'en': 'Students learn to design menus that balance nutrition and the planet.',
                                'vi': 'Học sinh học cách thiết kế thực đơn cân bằng dinh dưỡng và môi trường.',
                                'ja': '生徒は栄養と環境を両立させた献立づくりを学べます。'
                            }
                        },
                        opponentPoints: [
                            {
                                'zh-Hant': '有些學生需要更高蛋白或特殊飲食才能健康成長。',
                                'en': 'Some students need higher protein or specialised diets to grow well.',
                                'vi': 'Một số học sinh cần nhiều đạm hoặc chế độ ăn đặc biệt để phát triển.',
                                'ja': '高たんぱくや特別な食事が必要な生徒もいます。'
                            },
                            {
                                'zh-Hant': '過敏或宗教飲食限制可能與菜單衝突。',
                                'en': 'Allergies or religious restrictions may conflict with the menu.',
                                'vi': 'Dị ứng hoặc yêu cầu tôn giáo có thể mâu thuẫn với thực đơn.',
                                'ja': 'アレルギーや宗教上の制約が献立と衝突するかもしれません。'
                            },
                            {
                                'zh-Hant': '學生若不喜歡菜色，可能整盒午餐都不吃。',
                                'en': 'If students dislike the dishes, they may skip lunch entirely.',
                                'vi': 'Nếu không thích món ăn, học sinh có thể bỏ bữa trưa.',
                                'ja': '料理が気に入らないと、生徒は昼食を食べない恐れがあります。'
                            }
                        ],
                        rebuttalFeedback: {
                            summary: {
                                'zh-Hant': '你說明健康與永續性，但須補充因應過敏的機制。',
                                'en': 'You covered health and sustainability; add how allergies are accommodated.',
                                'vi': 'Bạn đã nói về sức khỏe và bền vững; hãy bổ sung cách xử lý dị ứng.',
                                'ja': '健康と持続性を説明しましたが、アレルギーへの対応も述べましょう。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '提及客製化餐盒或自選配菜，展現包容性。',
                                    'en': 'Mention custom boxes or mix-and-match stations to show inclusivity.',
                                    'vi': 'Nêu phương án hộp cơm tùy chọn hoặc quầy tự chọn để tăng tính bao trùm.',
                                    'ja': 'カスタム弁当や選べる副菜で包摂性を示しましょう。'
                                },
                                {
                                    'zh-Hant': '補上一個學生因素食日改變飲食的故事，增加感染力。',
                                    'en': 'Share a student story about discovering plant-based meals.',
                                    'vi': 'Kể câu chuyện học sinh thay đổi thói quen nhờ ngày ăn chay.',
                                    'ja': 'ベジタリアンデーで食生活が変わった生徒の話を加えましょう。'
                                }
                            ]
                        },
                        coachFeedback: {
                            score: {
                                'zh-Hant': '分數：內容8、反駁7、表達8、策略8（總分31/40）。',
                                'en': 'Score: Content 8, Refutation 7, Delivery 8, Strategy 8 (31/40).',
                                'vi': 'Điểm: Nội dung 8, Phản biện 7, Trình bày 8, Chiến lược 8 (31/40).',
                                'ja': 'スコア：内容8・反論7・表現8・戦略8（31/40）。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '開場可以用學校餐廳的排碳量對比，建立緊迫感。',
                                    'en': 'Open with a cafeteria carbon comparison to set urgency.',
                                    'vi': 'Mở đầu bằng so sánh lượng phát thải của căn tin để tạo tính cấp bách.',
                                    'ja': '食堂の排出量比較で緊急性を示しましょう。'
                                },
                                {
                                    'zh-Hant': '提供家長參與菜單設計的流程，提升可信度。',
                                    'en': 'Outline how parents join menu design to boost credibility.',
                                    'vi': 'Trình bày quy trình phụ huynh tham gia thiết kế thực đơn để tăng độ tin cậy.',
                                    'ja': '保護者が献立作りに参加する流れを示し、信頼性を高めましょう。'
                                }
                            ]
                        }
                    },
                    con: {
                        beginner: {
                            claim: {
                                'zh-Hant': '我們反對固定素食日，因為飲食需求多樣。',
                                'en': 'We oppose a fixed vegetarian day because student diets are diverse.',
                                'vi': 'Chúng tôi phản đối cố định ngày ăn chay vì nhu cầu dinh dưỡng rất đa dạng.',
                                'ja': '食の多様性があるので固定のベジタリアンデーには反対です。'
                            },
                            reason: {
                                'zh-Hant': '有些學生需要更多蛋白質或特定食材才能健康。',
                                'en': 'Some students require higher protein or specific foods for their health.',
                                'vi': 'Một số học sinh cần nhiều đạm hoặc thực phẩm đặc biệt để khỏe mạnh.',
                                'ja': '健康のために高たんぱくや特定の食材が必要な生徒もいます。'
                            },
                            evidence: {
                                'zh-Hant': '過敏與文化飲食限制可能讓他們無菜可選。',
                                'en': 'Allergies and cultural restrictions can leave them without options.',
                                'vi': 'Dị ứng và văn hóa ăn uống có thể khiến các em không có món phù hợp.',
                                'ja': 'アレルギーや文化的な制約で食べられる物がなくなる恐れがあります。'
                            },
                            closing: {
                                'zh-Hant': '應提供多元菜單讓學生自由選擇，而非強制同一道菜。',
                                'en': 'Offer diverse menus with choice instead of mandating one plate.',
                                'vi': 'Nên cung cấp thực đơn đa dạng để học sinh tự chọn thay vì ép một kiểu.',
                                'ja': '強制ではなく、選択肢のある多様な献立を提供すべきです。'
                            }
                        },
                        advanced: {
                            claim: {
                                'zh-Hant': '只鎖定素食日忽略了其他營養策略的可能性。',
                                'en': 'Locking onto vegetarian days overlooks other nutrition strategies.',
                                'vi': 'Chỉ tập trung vào ngày ăn chay bỏ qua nhiều chiến lược dinh dưỡng khác.',
                                'ja': 'ベジタリアンデーだけに頼ると他の栄養戦略を見落とします。'
                            },
                            reason: {
                                'zh-Hant': '與其被動提供菜單，不如結合教育與家庭合作帶來長效改變。',
                                'en': 'Education plus family partnerships deliver longer-lasting dietary change.',
                                'vi': 'Kết hợp giáo dục và phối hợp với gia đình sẽ tạo thay đổi lâu dài hơn.',
                                'ja': '教育と家庭連携を組み合わせた方が長期的な変化につながります。'
                            },
                            evidence: {
                                'zh-Hant': '澳洲計畫顯示讓學生自行設計菜單更能提高接受度。',
                                'en': 'Australian programs show student-designed menus gain better buy-in.',
                                'vi': 'Chương trình ở Úc cho thấy thực đơn do học sinh thiết kế được đón nhận hơn.',
                                'ja': 'オーストラリアの事例では生徒が献立を作る方が受け入れられました。'
                            },
                            closing: {
                                'zh-Hant': '應支持多元菜色與營養教育並行，而非單一日政策。',
                                'en': 'Support varied menus alongside nutrition education instead of a single-day policy.',
                                'vi': 'Nên kết hợp thực đơn đa dạng và giáo dục dinh dưỡng, không chỉ một ngày.',
                                'ja': '単一の日ではなく、多様な献立と栄養教育を並行して進めるべきです。'
                            }
                        },
                        opponentPoints: [
                            {
                                'zh-Hant': '素食日讓學生接觸新食材與營養知識。',
                                'en': 'Vegetarian days expose students to new foods and nutrition lessons.',
                                'vi': 'Ngày ăn chay giúp học sinh trải nghiệm món mới và kiến thức dinh dưỡng.',
                                'ja': 'ベジタリアンデーで新しい食材と栄養を学べます。'
                            },
                            {
                                'zh-Hant': '永續菜單能降低學校的碳足跡。',
                                'en': 'Sustainable menus lower the school’s carbon footprint.',
                                'vi': 'Thực đơn bền vững giúp giảm dấu chân carbon của trường.',
                                'ja': '持続可能な献立は学校のカーボンフットプリントを減らします。'
                            },
                            {
                                'zh-Hant': '學校可以提供高蛋白素食或過敏友善選擇。',
                                'en': 'Schools can offer high-protein vegetarian dishes and allergy-friendly options.',
                                'vi': 'Trường có thể chuẩn bị món chay giàu đạm và lựa chọn phù hợp với dị ứng.',
                                'ja': '高たんぱくなベジ献立やアレルギー対応食を用意できます。'
                            }
                        ],
                        rebuttalFeedback: {
                            summary: {
                                'zh-Hant': '你強調自由選擇，但要提出如何同時推動健康教育。',
                                'en': 'You emphasised choice; add how you still promote nutrition education.',
                                'vi': 'Bạn nhấn mạnh quyền lựa chọn; hãy nói thêm cách vẫn thúc đẩy giáo dục dinh dưỡng.',
                                'ja': '選択の自由を強調しましたが、栄養教育をどう進めるかも説明しましょう。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '提出「學生票選菜單」或「營養師協作日」等替代方案。',
                                    'en': 'Propose alternatives like student-voted menus or dietitian collaboration days.',
                                    'vi': 'Đề xuất phương án như thực đơn do học sinh bình chọn hoặc ngày phối hợp chuyên gia dinh dưỡng.',
                                    'ja': '生徒投票の献立や栄養士との協働日などの代替策を提示しましょう。'
                                },
                                {
                                    'zh-Hant': '補充如何衡量政策成功，例如健康指標或滿意度調查。',
                                    'en': 'Explain success metrics such as health indicators or satisfaction surveys.',
                                    'vi': 'Nêu rõ cách đo lường thành công bằng chỉ số sức khỏe hoặc khảo sát hài lòng.',
                                    'ja': '健康指標や満足度調査など成功を測る基準を加えましょう。'
                                }
                            ]
                        },
                        coachFeedback: {
                            score: {
                                'zh-Hant': '分數：內容7、反駁8、表達7、策略7（總分29/40）。',
                                'en': 'Score: Content 7, Refutation 8, Delivery 7, Strategy 7 (29/40).',
                                'vi': 'Điểm: Nội dung 7, Phản biện 8, Trình bày 7, Chiến lược 7 (29/40).',
                                'ja': 'スコア：内容7・反論8・表現7・戦略7（29/40）。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '在開場指出你的方案也能減少食物浪費，吸引聽眾。',
                                    'en': 'Begin by noting your approach also cuts food waste to hook listeners.',
                                    'vi': 'Mở đầu bằng việc nhấn mạnh phương án của bạn cũng giảm lãng phí thực phẩm.',
                                    'ja': '提案が食品ロス削減にもつながると冒頭で伝え、関心を引きましょう。'
                                },
                                {
                                    'zh-Hant': '加入與家長合作的流程，讓政策更貼近實務。',
                                    'en': 'Add a parent collaboration process to keep the plan practical.',
                                    'vi': 'Thêm quy trình phối hợp với phụ huynh để chính sách sát thực tế hơn.',
                                    'ja': '保護者との連携手順を加え、実務的にしましょう。'
                                }
                            ]
                        }
                    }
                },
                questions: [
                    {
                        'zh-Hant': '素食日想達成的健康目標是什麼？',
                        'en': 'What health goals should a vegetarian day achieve?',
                        'vi': 'Ngày ăn chay nhằm đạt mục tiêu sức khỏe nào?',
                        'ja': 'ベジタリアンデーで達成したい健康目標は何ですか？'
                    },
                    {
                        'zh-Hant': '如何兼顧過敏、文化飲食與運動員需求？',
                        'en': 'How will you accommodate allergies, cultural diets, and athletes?',
                        'vi': 'Bạn cân đối thế nào giữa dị ứng, văn hóa ăn uống và nhu cầu vận động viên?',
                        'ja': 'アレルギーや文化的食事、運動部のニーズをどう両立させますか？'
                    },
                    {
                        'zh-Hant': '菜單調整會搭配哪些教育活動？',
                        'en': 'What educational activities will accompany the menu change?',
                        'vi': 'Việc điều chỉnh thực đơn sẽ đi kèm hoạt động giáo dục nào?',
                        'ja': '献立変更に合わせてどんな教育活動を行いますか？'
                    },
                    {
                        'zh-Hant': '如果學生不吃素食餐，你有何備案？',
                        'en': 'What is your backup plan if students skip the vegetarian meal?',
                        'vi': 'Nếu học sinh không ăn bữa chay, bạn có phương án dự phòng gì?',
                        'ja': '生徒がベジタリアン食を食べない場合の代替策は？'
                    },
                    {
                        'zh-Hant': '如何確保營養攝取足夠且易於被接受？',
                        'en': 'How will you ensure meals stay nutritious and appealing?',
                        'vi': 'Bạn bảo đảm bữa ăn vẫn đủ dinh dưỡng và hấp dẫn ra sao?',
                        'ja': '栄養価と食べやすさをどう両立させますか？'
                    },
                    {
                        'zh-Hant': '你依據哪些環境影響數據來支持政策？',
                        'en': 'Which environmental impact data supports your policy?',
                        'vi': 'Bạn dựa vào dữ liệu môi trường nào để ủng hộ chính sách?',
                        'ja': 'どの環境データがこの政策を支えていますか？'
                    },
                    {
                        'zh-Hant': '如何蒐集學生與家長的回饋以調整菜單？',
                        'en': 'How will you gather student and parent feedback to adjust menus?',
                        'vi': 'Bạn thu thập phản hồi học sinh và phụ huynh để điều chỉnh thực đơn thế nào?',
                        'ja': '献立調整のために生徒と保護者の意見をどう集めますか？'
                    },
                    {
                        'zh-Hant': '家庭如何在家延續健康飲食？',
                        'en': 'How will families continue healthy eating at home?',
                        'vi': 'Gia đình sẽ tiếp tục ăn uống lành mạnh tại nhà bằng cách nào?',
                        'ja': '家庭でも健康的な食習慣をどう継続してもらいますか？'
                    }
                ]
            },
            {
                id: 'start-at-9',
                title: {
                    'zh-Hant': '本院支持延後至上午9點上課',
                    'en': 'This house supports starting school at 9 a.m.',
                    'vi': 'Quốc hội ủng hộ việc bắt đầu giờ học lúc 9 giờ sáng',
                    'ja': '本院は午前9時登校を支持する'
                },
                sides: {
                    pro: {
                        beginner: {
                            claim: {
                                'zh-Hant': '我們支持九點上課，讓學生有足夠睡眠。',
                                'en': 'We support 9 a.m. start times so students get enough sleep.',
                                'vi': 'Chúng tôi ủng hộ bắt đầu học lúc 9 giờ để học sinh ngủ đủ giấc.',
                                'ja': '午前9時の始業で生徒に十分な睡眠を確保しましょう。'
                            },
                            reason: {
                                'zh-Hant': '青少年生理時鐘較晚，早起難以集中。',
                                'en': 'Teen circadian rhythms run late, making early mornings unfocused.',
                                'vi': 'Nhịp sinh học của thanh thiếu niên muộn hơn nên sáng sớm khó tập trung.',
                                'ja': '思春期の体内時計は遅れ気味で、朝早くは集中しにくいのです。'
                            },
                            evidence: {
                                'zh-Hant': '醫學研究顯示延後上課能增加平均睡眠45分鐘。',
                                'en': 'Medical studies show later starts add about forty-five minutes of sleep.',
                                'vi': 'Nghiên cứu y khoa cho thấy bắt đầu muộn tăng thêm khoảng 45 phút ngủ.',
                                'ja': '医学研究では開始を遅らせると睡眠が平均45分増えると示されています。'
                            },
                            closing: {
                                'zh-Hant': '充足睡眠可提升成績並改善情緒管理。',
                                'en': 'Well-rested students earn better grades and regulate emotions.',
                                'vi': 'Ngủ đủ giúp học sinh đạt kết quả tốt và kiểm soát cảm xúc.',
                                'ja': '十分な睡眠で成績も感情コントロールも向上します。'
                            }
                        },
                        advanced: {
                            claim: {
                                'zh-Hant': '調整課表以符合青少年生理節奏能提升學習效率。',
                                'en': 'Aligning timetables with adolescent rhythms improves learning efficiency.',
                                'vi': 'Điều chỉnh thời khóa biểu phù hợp nhịp sinh học giúp tăng hiệu quả học tập.',
                                'ja': '生体リズムに合わせた時間割で学習効率が上がります。'
                            },
                            reason: {
                                'zh-Hant': '清晨上課時大腦仍處低警覺狀態，降低理解力。',
                                'en': 'Early starts keep the brain in low-alert mode, reducing comprehension.',
                                'vi': 'Bắt đầu quá sớm khiến não chưa tỉnh táo, giảm khả năng tiếp thu.',
                                'ja': '早朝は脳がまだ低覚醒状態で理解力が落ちます。'
                            },
                            evidence: {
                                'zh-Hant': '明尼阿波利斯與西雅圖延後上課後，遲到與缺席率下降。',
                                'en': 'Minneapolis and Seattle saw tardiness and absences drop after shifting later.',
                                'vi': 'Minneapolis và Seattle giảm đi muộn, nghỉ học sau khi điều chỉnh giờ học.',
                                'ja': 'ミネアポリスとシアトルでは開始時間を遅らせると遅刻・欠席が減りました。'
                            },
                            closing: {
                                'zh-Hant': '延後上課也能分流交通尖峰並改善社區安全。',
                                'en': 'Later starts ease traffic peaks and improve community safety.',
                                'vi': 'Bắt đầu muộn giúp giảm kẹt xe và tăng an toàn cộng đồng.',
                                'ja': '開始を遅らせると交通ピークが緩和され、地域の安全も向上します。'
                            }
                        },
                        opponentPoints: [
                            {
                                'zh-Hant': '家長的工作時間可能無法配合新的作息。',
                                'en': 'Parent work schedules may not align with a later timetable.',
                                'vi': 'Lịch làm việc của phụ huynh có thể không phù hợp với giờ học muộn.',
                                'ja': '保護者の勤務時間が調整に合わないかもしれません。'
                            },
                            {
                                'zh-Hant': '課後社團與打工時間會被壓縮。',
                                'en': 'After-school clubs and part-time jobs would be squeezed.',
                                'vi': 'Hoạt động câu lạc bộ và làm thêm bị thu hẹp thời gian.',
                                'ja': '放課後のクラブ活動やアルバイトの時間が短くなります。'
                            },
                            {
                                'zh-Hant': '交通運輸與餐飲供應需要大幅調整，成本高。',
                                'en': 'Transport routes and meal services need major costly adjustments.',
                                'vi': 'Hệ thống xe đưa đón và cung cấp bữa ăn phải điều chỉnh tốn kém.',
                                'ja': '交通機関や給食の体制を大きく見直す必要がありコストがかかります。'
                            }
                        ],
                        rebuttalFeedback: {
                            summary: {
                                'zh-Hant': '你援引睡眠研究很有力，但請交代與家長協調的步驟。',
                                'en': 'Your sleep research is strong; now outline steps to coordinate with parents.',
                                'vi': 'Bạn trích dẫn nghiên cứu về giấc ngủ rất thuyết phục; hãy nêu cách phối hợp với phụ huynh.',
                                'ja': '睡眠研究の引用は説得力があります。保護者との調整策も述べましょう。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '提出彈性接送或社區晨間照顧方案，降低家長疑慮。',
                                    'en': 'Offer flexible drop-off or community morning care to ease concerns.',
                                    'vi': 'Đề xuất phương án đưa đón linh hoạt hoặc dịch vụ trông trẻ buổi sáng.',
                                    'ja': '柔軟な送迎や地域の朝の預かりプログラムを提案しましょう。'
                                },
                                {
                                    'zh-Hant': '說明如何重新安排社團時間，確保學生活動不減少。',
                                    'en': 'Explain how clubs will be rescheduled so activities stay intact.',
                                    'vi': 'Giải thích cách sắp xếp lại giờ câu lạc bộ để hoạt động không bị cắt giảm.',
                                    'ja': 'クラブ活動の時間調整案を示し、活動が減らないようにしましょう。'
                                }
                            ]
                        },
                        coachFeedback: {
                            score: {
                                'zh-Hant': '分數：內容9、反駁7、表達8、策略8（總分32/40）。',
                                'en': 'Score: Content 9, Refutation 7, Delivery 8, Strategy 8 (32/40).',
                                'vi': 'Điểm: Nội dung 9, Phản biện 7, Trình bày 8, Chiến lược 8 (32/40).',
                                'ja': 'スコア：内容9・反論7・表現8・戦略8（32/40）。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '在結尾列出三個短期與三個長期指標，凸顯規劃性。',
                                    'en': 'Close with three short-term and three long-term metrics to show planning.',
                                    'vi': 'Kết thúc bằng ba chỉ số ngắn hạn và ba chỉ số dài hạn để thể hiện kế hoạch rõ ràng.',
                                    'ja': '短期・長期の指標をそれぞれ示し、計画性を強調しましょう。'
                                },
                                {
                                    'zh-Hant': '加入學生與老師的引述，讓政策更有人味。',
                                    'en': 'Add quotes from students and teachers to humanise the policy.',
                                    'vi': 'Thêm lời chia sẻ của học sinh và giáo viên để chính sách gần gũi hơn.',
                                    'ja': '生徒と教師の声を引用し、政策に人間味を出しましょう。'
                                }
                            ]
                        }
                    },
                    con: {
                        beginner: {
                            claim: {
                                'zh-Hant': '我們反對延後上課，因為家庭作息會被打亂。',
                                'en': 'We oppose later starts because family routines would be disrupted.',
                                'vi': 'Chúng tôi phản đối giờ học muộn vì nếp sinh hoạt gia đình bị xáo trộn.',
                                'ja': '始業を遅らせると家庭の生活リズムが乱れるため反対です。'
                            },
                            reason: {
                                'zh-Hant': '家長仍需準時上班或照顧年幼兄弟姊妹。',
                                'en': 'Parents still need to reach work on time or care for younger siblings.',
                                'vi': 'Phụ huynh vẫn phải đi làm đúng giờ hoặc chăm em nhỏ.',
                                'ja': '保護者は仕事や下の子の世話で早い時間が必要です。'
                            },
                            evidence: {
                                'zh-Hant': '延後放學會壓縮課後社團與打工時間。',
                                'en': 'Ending later squeezes time for clubs, sports, and part-time jobs.',
                                'vi': 'Tan học muộn làm giảm thời gian cho câu lạc bộ, thể thao và làm thêm.',
                                'ja': '放課が遅くなると部活動やアルバイトの時間が減ります。'
                            },
                            closing: {
                                'zh-Hant': '維持現行時間才能兼顧學習、家庭與課後安排。',
                                'en': 'Keeping current schedules balances school, family, and after-school plans.',
                                'vi': 'Giữ lịch hiện tại giúp cân bằng học tập, gia đình và hoạt động sau giờ học.',
                                'ja': '今の時間割の方が学習・家庭・放課後活動のバランスが取れます。'
                            }
                        },
                        advanced: {
                            claim: {
                                'zh-Hant': '延後上課忽略了交通、餐飲與人力的連鎖影響。',
                                'en': 'Later starts ignore ripple effects on transport, food service, and staffing.',
                                'vi': 'Giờ học muộn bỏ qua tác động dây chuyền lên giao thông, bữa ăn và nhân sự.',
                                'ja': '始業を遅らせると交通や給食、人員配置に波及します。'
                            },
                            reason: {
                                'zh-Hant': '公車排程與午餐供應需重新設計，成本高且複雜。',
                                'en': 'Bus schedules and meal logistics need redesigning, which is costly and complex.',
                                'vi': 'Lịch xe đưa đón và cung ứng bữa ăn phải thiết kế lại, tốn kém và phức tạp.',
                                'ja': 'バス時刻や給食体制を再設計するには大きなコストがかかります。'
                            },
                            evidence: {
                                'zh-Hant': '英國部分試點因成本與交通壓力在三年內恢復舊制。',
                                'en': 'Some UK pilots reverted within three years because of cost and transit strain.',
                                'vi': 'Một số mô hình thí điểm ở Anh đã quay lại giờ cũ trong ba năm vì chi phí và áp lực giao thông.',
                                'ja': '英国ではコストや交通の負担で3年以内に旧制度へ戻った例があります。'
                            },
                            closing: {
                                'zh-Hant': '應先投資睡眠教育與家庭支援，而非倉促改變時程。',
                                'en': 'Invest in sleep education and family supports before shifting schedules.',
                                'vi': 'Nên đầu tư vào giáo dục giấc ngủ và hỗ trợ gia đình trước khi đổi thời gian.',
                                'ja': '時間変更より先に睡眠教育や家庭支援へ投資すべきです。'
                            }
                        },
                        opponentPoints: [
                            {
                                'zh-Hant': '睡眠研究顯示延後上課可提升成績與心理健康。',
                                'en': 'Sleep studies show later starts boost grades and mental health.',
                                'vi': 'Nghiên cứu giấc ngủ cho thấy giờ học muộn cải thiện thành tích và sức khỏe tinh thần.',
                                'ja': '睡眠研究では始業を遅らせると成績とメンタルが向上します。'
                            },
                            {
                                'zh-Hant': '遲到與缺席率在九點開學後下降。',
                                'en': 'Tardiness and absences drop when schools begin at nine.',
                                'vi': 'Tình trạng đi trễ và vắng mặt giảm khi trường bắt đầu lúc 9 giờ.',
                                'ja': '午前9時開始にすると遅刻と欠席が減ります。'
                            },
                            {
                                'zh-Hant': '社區可透過分流時段減輕交通壓力。',
                                'en': 'Communities can stagger shifts to ease traffic congestion.',
                                'vi': 'Cộng đồng có thể phân bổ ca để giảm kẹt xe.',
                                'ja': '地域全体で時差通勤を進めれば渋滞を緩和できます。'
                            }
                        ],
                        rebuttalFeedback: {
                            summary: {
                                'zh-Hant': '你有效提出成本疑慮，但需說明漸進式調整的細節。',
                                'en': 'You raised cost concerns; describe a phased approach to strengthen it.',
                                'vi': 'Bạn nêu lo ngại chi phí; hãy mô tả lộ trình điều chỉnh từng bước.',
                                'ja': 'コストの懸念を示しましたが、段階的な移行策も提示しましょう。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '建議先針對特定年級試行，蒐集數據後再擴大。',
                                    'en': 'Suggest piloting with select grades, then scale after measuring results.',
                                    'vi': 'Đề nghị thử nghiệm với một số khối lớp rồi mở rộng sau khi đo lường kết quả.',
                                    'ja': '特定学年で試行し、データ取得後に拡大する案を示しましょう。'
                                },
                                {
                                    'zh-Hant': '說明替代投資，如睡眠教育或家長講座，以展現積極方案。',
                                    'en': 'Highlight alternative investments like sleep education workshops.',
                                    'vi': 'Nhấn mạnh khoản đầu tư khác như lớp học về giấc ngủ cho phụ huynh.',
                                    'ja': '睡眠教育セミナーなど代替投資を強調しましょう。'
                                }
                            ]
                        },
                        coachFeedback: {
                            score: {
                                'zh-Hant': '分數：內容7、反駁8、表達8、策略7（總分30/40）。',
                                'en': 'Score: Content 7, Refutation 8, Delivery 8, Strategy 7 (30/40).',
                                'vi': 'Điểm: Nội dung 7, Phản biện 8, Trình bày 8, Chiến lược 7 (30/40).',
                                'ja': 'スコア：内容7・反論8・表現8・戦略7（30/40）。'
                            },
                            tips: [
                                {
                                    'zh-Hant': '在結尾提供明確的成本分析框架，展示務實態度。',
                                    'en': 'End with a clear cost-analysis framework to show pragmatism.',
                                    'vi': 'Kết thúc bằng khung phân tích chi phí rõ ràng để thể hiện tính thực tế.',
                                    'ja': 'コスト分析の枠組みを示し、現実的な姿勢を打ち出しましょう。'
                                },
                                {
                                    'zh-Hant': '加入與交通單位協調的時間表，讓方案更可信。',
                                    'en': 'Include a coordination timeline with transport agencies for credibility.',
                                    'vi': 'Thêm lộ trình phối hợp với đơn vị giao thông để tăng độ tin cậy.',
                                    'ja': '交通当局との調整スケジュールを加え、信頼性を高めましょう。'
                                }
                            ]
                        }
                    }
                },
                questions: [
                    {
                        'zh-Hant': '九點開學要達成哪些具體成果才算成功？',
                        'en': 'What concrete outcomes define success for a 9 a.m. start?',
                        'vi': 'Những kết quả cụ thể nào sẽ cho thấy giờ học 9h thành công?',
                        'ja': '午前9時開始の成功を示す具体的な成果は何ですか？'
                    },
                    {
                        'zh-Hant': '交通運輸與家長作息要如何同步調整？',
                        'en': 'How will you coordinate transportation and parent schedules?',
                        'vi': 'Bạn sẽ phối hợp lịch giao thông và phụ huynh ra sao?',
                        'ja': '交通機関と保護者のスケジュール調整をどう行いますか？'
                    },
                    {
                        'zh-Hant': '對需要早托的家庭，有哪些支援措施？',
                        'en': 'What supports exist for families needing early drop-off?',
                        'vi': 'Có hỗ trợ gì cho gia đình cần gửi con sớm?',
                        'ja': '早朝に子どもを預けたい家庭への支援はありますか？'
                    },
                    {
                        'zh-Hant': '課後活動與社團要如何調整新的放學時間？',
                        'en': 'How will after-school activities adapt to the new dismissal time?',
                        'vi': 'Các hoạt động sau giờ học sẽ điều chỉnh thế nào khi tan học muộn hơn?',
                        'ja': '放課後活動は新しい下校時間にどう適応しますか？'
                    },
                    {
                        'zh-Hant': '有哪些數據能證明調整作息的財務影響？',
                        'en': 'What data demonstrates the financial impact of schedule changes?',
                        'vi': 'Có dữ liệu nào chứng minh tác động tài chính của việc đổi thời gian?',
                        'ja': '時間変更の財政的影響を示すデータはありますか？'
                    },
                    {
                        'zh-Hant': '試行期間你會如何蒐集學生與老師的回饋？',
                        'en': 'How will you gather student and teacher feedback during the pilot?',
                        'vi': 'Trong thời gian thử nghiệm, bạn thu thập ý kiến học sinh và giáo viên thế nào?',
                        'ja': '試行期間中に生徒と教師の意見をどう収集しますか？'
                    },
                    {
                        'zh-Hant': '是否有彈性開學或混合時段等過渡措施？',
                        'en': 'Are there transitional steps like flexible start blocks?',
                        'vi': 'Có biện pháp chuyển tiếp nào như ca học linh hoạt không?',
                        'ja': '柔軟な始業枠などの移行措置はありますか？'
                    },
                    {
                        'zh-Hant': '政策如何同時照顧高中部與國中部的需求？',
                        'en': 'How will the policy serve both upper and lower grade levels?',
                        'vi': 'Chính sách sẽ đáp ứng nhu cầu của cả bậc trung học cơ sở và phổ thông như thế nào?',
                        'ja': '高校生と中学生のニーズを同時にどう満たしますか？'
                    }
                ]
            },
        ];

        const tutoring_levels = {
            'zh-Hant': ['幼稚園', '國小', '國中', '高中', '大學', '其他'],
            'en': ['Kindergarten', 'Elementary', 'Middle School', 'High School', 'University', 'Other'],
            'vi': ['Mẫu giáo', 'Tiểu học', 'Trung học cơ sở', 'Trung học phổ thông', 'Đại học', 'Khác'],
            'ja': ['幼稚園', '小学校', '中学校', '高校', '大学', 'その他']
        };

        const tutoring_subjects = {
            'zh-Hant': ['國語', '數學', '英文', '自然科學', '社會', '其他'],
            'en': ['Language Arts', 'Math', 'English', 'Science', 'Social Studies', 'Other'],
            'vi': ['Ngữ văn', 'Toán', 'Tiếng Anh', 'Khoa học tự nhiên', 'Xã hội', 'Khác'],
            'ja': ['国語', '数学', '英語', '理科', '社会', 'その他']
        };

        const tutoringLevelSynonyms = {
            kindergarten: ['幼稚園', 'kindergarten', 'mẫu giáo', 'mau giao', 'mầm non', '幼稚園'],
            elementary: ['國小', '小學', 'elementary', 'tiểu học', 'tieu hoc', '小学校'],
            middle: ['國中', '初中', 'middle school', 'trung học cơ sở', 'trung hoc co so', '中学校'],
            high: ['高中', 'high school', 'trung học phổ thông', 'trung hoc pho thong', '高校'],
            university: ['大學', 'university', 'đại học', 'dai hoc', '大学'],
            other: ['其他', 'other', 'khác', 'khac', 'その他']
        };

        const tutoringSubjectSynonyms = {
            math: ['數學', '数学', 'math', 'mathematics', 'toán', 'toan', '算数', '算術']
        };

        function normalizeTutoringLevel(level) {
            if (!level) return 'other';
            const normalized = level.toString().trim().toLowerCase();
            for (const [key, values] of Object.entries(tutoringLevelSynonyms)) {
                if (values.some(value => value.toLowerCase() === normalized)) {
                    return key;
                }
            }
            return 'other';
        }

        function normalizeTutoringSubject(subject) {
            if (!subject) return 'other';
            const normalized = subject.toString().trim().toLowerCase();
            for (const [key, values] of Object.entries(tutoringSubjectSynonyms)) {
                if (values.some(value => value.toLowerCase() === normalized)) {
                    return key;
                }
            }
            return 'other';
        }

        function getTutoringLevelGuidance(level, subject) {
            const normalizedLevel = normalizeTutoringLevel(level);
            const normalizedSubject = normalizeTutoringSubject(subject);
            let guidance = '';

            switch (normalizedLevel) {
                case 'kindergarten':
                    guidance = 'Use playful wording, one short sentence per step, and rely on counting or drawing activities so the child can follow without advanced terms.';
                    break;
                case 'elementary':
                    guidance = 'Explain each idea with short, cheerful sentences and connect steps to everyday objects so an elementary student can follow without prior knowledge.';
                    break;
                case 'middle':
                    guidance = 'Provide clear reasoning with simple sentences, define any new vocabulary, and offer relatable examples suitable for a middle-school learner.';
                    break;
                case 'high':
                    guidance = 'Offer structured explanations that show the reasoning and include terminology a high-school learner would know, adding reminders for any advanced ideas.';
                    break;
                case 'university':
                    guidance = 'Write concise, rigorous explanations that highlight the underlying concepts expected at university level.';
                    break;
                default:
                    guidance = 'Adapt the language so it matches the learner’s background and avoids unnecessary jargon.';
            }

            if (normalizedSubject === 'math') {
                if (normalizedLevel === 'elementary') {
                    guidance += ' For math problems, present up to three clearly labelled approaches (for example, "方法一"/"Approach 1", "方法二"/"Approach 2") such as a story-based method, a drawing or manipulatives method, and the standard calculation, each kept to three short steps with every new term explained in plain words.';
                } else {
                    guidance += ' For math problems, walk through the steps in order and justify each operation so the learner understands why it works.';
                }
            }

            return guidance;
        }

        const storybook_ages = {
            'zh-Hant': ['2-4歲', '5-7歲', '8-10歲'],
            'en': ['2-4 years', '5-7 years', '8-10 years'],
            'vi': ['2-4 tuổi', '5-7 tuổi', '8-10 tuổi'],
            'ja': ['2-4歳', '5-7歳', '8-10歳']
        };
        
        const aiExpertsData = {
            psychologist: {
                id: 'psychologist',
                icon: '🧠',
                name: {'zh-Hant': '兒童心理學家', 'en': 'Child Psychologist', 'vi': 'Nhà tâm lý học trẻ em', 'ja': '児童心理学者'},
                description: {'zh-Hant': '行為與情緒模式分析', 'en': 'Analyzes behavior & emotional patterns', 'vi': 'Phân tích hành vi & cảm xúc', 'ja': '行動と感情のパターンを分析'},
                color: '#ec4899', // Pink
                systemPrompt: "You are a child psychologist. Your task is to provide advice as a valid JSON object. The JSON must have two keys: 'advice' (string with simple markdown: `**bold**`, `## Title`, `\\n` for newlines) and 'followUpQuestions' (array of 3 strings). IMPORTANT: All special characters like double quotes or backslashes within the 'advice' string must be properly escaped (e.g., \\\"example\\\", `C:\\\\path`). Output ONLY the JSON object."
            },
            languageExpert: {
                id: 'languageExpert',
                icon: '🗣️',
                name: {'zh-Hant': '語言發展專家', 'en': 'Language Development Specialist', 'vi': 'Chuyên gia phát triển ngôn ngữ', 'ja': '言語発達専門家'},
                description: {'zh-Hant': '溝通與語言能力指導', 'en': 'Guides on communication & language skills', 'vi': 'Hướng dẫn kỹ năng giao tiếp & ngôn ngữ', 'ja': 'コミュニケーションと言語スキルを指導'},
                color: '#8b5cf6', // Violet
                systemPrompt: "You are a language development specialist. Your task is to provide advice as a valid JSON object, in the same language as the user's question. The JSON must have two keys: 'advice' (string with simple markdown: `**bold**`, `## Title`, `\\n` for newlines) and 'followUpQuestions' (array of 3 strings). IMPORTANT: All special characters like double quotes or backslashes within the 'advice' string must be properly escaped (e.g., \\\"example\\\", `C:\\\\path`). Output ONLY the JSON object."
            },
            learningConsultant: {
                id: 'learningConsultant',
                icon: '📚',
                name: {'zh-Hant': '學習顧問', 'en': 'Learning Consultant', 'vi': 'Tư vấn học tập', 'ja': '学習コンサルタント'},
                description: {'zh-Hant': '建立學習動機與習慣', 'en': 'Builds learning motivation & routines', 'vi': 'Xây dựng động lực & thói quen học tập', 'ja': '学習意欲と習慣を構築'},
                color: '#22c55e', // Green
                systemPrompt: "You are an education strategist. Your task is to provide advice as a valid JSON object. The JSON must have two keys: 'advice' (string with simple markdown: `**bold**`, `## Title`, `\\n` for newlines) and 'followUpQuestions' (array of 3 strings). IMPORTANT: All special characters like double quotes or backslashes within the 'advice' string must be properly escaped (e.g., \\\"example\\\", `C:\\\\path`). Output ONLY the JSON object."
            }
        };

        const aiDoctorsData = {
            pediatrician: {
                id: 'pediatrician',
                icon: '👶',
                name: {'zh-Hant': 'AI 小兒科醫生', 'en': 'AI Pediatrician', 'vi': 'Bác sĩ nhi khoa AI', 'ja': 'AI小児科医'},
                description: {'zh-Hant': '一般兒童健康問題', 'en': 'General child health issues', 'vi': 'Các vấn đề sức khỏe chung của trẻ', 'ja': '一般的な子供の健康問題'},
                color: '#3b82f6', // Blue
                systemPrompt: "You are an AI pediatrician. Analyze the user's input and provide a preliminary analysis as a valid JSON object. The JSON must have two keys: 'advice' (string with simple markdown: `**bold**`, `## Title`, `\\n` for newlines) and 'followUpQuestions' (array of 3 strings). IMPORTANT: The 'advice' string MUST include a clear disclaimer that you are an AI and not a substitute for professional medical advice. All special characters like double quotes or backslashes within the 'advice' string must be properly escaped (e.g., \\\"example\\\", `C:\\\\path`). Output ONLY the JSON object."
            },
            dermatologist: {
                id: 'dermatologist',
                icon: '🖐️',
                name: {'zh-Hant': 'AI 皮膚科醫生', 'en': 'AI Dermatologist', 'vi': 'Bác sĩ da liễu AI', 'ja': 'AI皮膚科医'},
                description: {'zh-Hant': '皮膚相關問題', 'en': 'Skin-related issues', 'vi': 'Các vấn đề về da', 'ja': '皮膚関連の問題'},
                color: '#f97316', // Orange
                systemPrompt: "You are an AI dermatologist. Analyze the user's input and provide a preliminary analysis as a valid JSON object. The JSON must have two keys: 'advice' (string with simple markdown: `**bold**`, `## Title`, `\\n` for newlines) and 'followUpQuestions' (array of 3 strings). IMPORTANT: The 'advice' string MUST include a clear disclaimer that you are an AI and not a substitute for professional medical advice. All special characters like double quotes or backslashes within the 'advice' string must be properly escaped (e.g., \\\"example\\\", `C:\\\\path`). Output ONLY the JSON object."
            },
            familyDoctor: {
                id: 'familyDoctor',
                icon: '👨‍⚕️',
                name: {'zh-Hant': 'AI 家醫科醫生', 'en': 'AI Family Doctor', 'vi': 'Bác sĩ gia đình AI', 'ja': 'AI家庭医'},
                description: {'zh-Hant': '成人一般健康問題', 'en': 'General adult health issues', 'vi': 'Các vấn đề sức khỏe chung của người lớn', 'ja': '一般的な成人の健康問題'},
                color: '#10b981', // Emerald
                systemPrompt: "You are an AI family doctor for adults. Analyze the user's input and provide a preliminary analysis as a valid JSON object. The JSON must have two keys: 'advice' (string with simple markdown: `**bold**`, `## Title`, `\\n` for newlines) and 'followUpQuestions' (array of 3 strings). IMPORTANT: The 'advice' string MUST include a clear disclaimer that you are an AI and not a substitute for professional medical advice. All special characters like double quotes or backslashes within the 'advice' string must be properly escaped (e.g., \\\"example\\\", `C:\\\\path`). Output ONLY the JSON object."
            },
            pharmacist: {
                id: 'pharmacist',
                icon: '💊',
                name: {'zh-Hant': 'AI 藥劑師', 'en': 'AI Pharmacist', 'vi': 'Dược sĩ AI', 'ja': 'AI薬剤師'},
                description: {'zh-Hant': '藥物使用與交互作用', 'en': 'Medication usage and interactions', 'vi': 'Sử dụng và tương tác thuốc', 'ja': '薬の使用と相互作用'},
                color: '#6b7280', // Gray
                systemPrompt: "You are an AI pharmacist. Analyze the user's input (which may include an image of a medication) and provide information about the medication's usage, potential side effects, and interactions, as a valid JSON object. The JSON must have two keys: 'advice' (string with simple markdown: `**bold**`, `## Title`, `\\n` for newlines) and 'followUpQuestions' (array of 3 strings). IMPORTANT: The 'advice' string MUST include a clear disclaimer that you are an AI and not a substitute for professional medical advice. All special characters like double quotes or backslashes within the 'advice' string must be properly escaped (e.g., \\\"example\\\", `C:\\\\path`). Output ONLY the JSON object."
            }
        };


        // --- DOM Elements ---
        const languageSwitcher = document.getElementById('language-switcher');
        const mainNav = document.getElementById('main-nav');
        const views = document.querySelectorAll('.view-content');

        // Platform View
        const generateLessonBtn = document.getElementById('generate-lesson-btn');
        const lessonContainer = document.getElementById('lesson-container');
        const topicSelect = document.getElementById('topic-select');
        const customTopicWrapper = document.getElementById('custom-topic-wrapper');
        const customTopicInput = document.getElementById('custom-topic-input');
        const errorMessage = document.getElementById('error-message');
        const subjectGroup = document.getElementById('subject-group');

        // Tutoring View
        const startUploadBtn = document.getElementById('start-upload-btn');
        const tutoringInitialView = document.getElementById('tutoring-initial-view');
        const tutoringUploadView = document.getElementById('tutoring-upload-view');
        const tutoringResultsView = document.getElementById('tutoring-results-view');
        const fileDropZone = document.getElementById('file-drop-zone');
        const homeworkFileInput = document.getElementById('homework-file-input');
        const fileNameDisplay = document.getElementById('file-name-display');
        const tutoringFileSummary = document.getElementById('tutoring-file-summary');
        const analyzeHomeworkBtn = document.getElementById('analyze-homework-btn');
        const tutoringLevelSelect = document.getElementById('tutoring-level');
        const tutoringSubjectSelect = document.getElementById('tutoring-subject');
        const tutoringLanguageSelect = document.getElementById('tutoring-language');
        const tutoringCustomSubjectWrapper = document.getElementById('tutoring-custom-subject-wrapper');
        const tutoringCustomSubjectInput = document.getElementById('tutoring-custom-subject-input');
        const keyConceptsContainer = document.getElementById('key-concepts-container');
        const tutoringVocabCard = document.getElementById('tutoring-vocab-card');
        const tutoringVocabContainer = document.getElementById('tutoring-vocabulary-container');
        const problemAnalysisContainer = document.getElementById('problem-analysis-container');
        const tutoringErrorMessage = document.getElementById('tutoring-error-message');

        // Storybook View
        const startStorybookBtn = document.getElementById('start-storybook-upload-btn');
        const storybookInitialView = document.getElementById('storybook-initial-view');
        const storybookMainView = document.getElementById('storybook-main-view');
        const storybookFileDropZone = document.getElementById('storybook-file-drop-zone');
        const storybookFileInput = document.getElementById('storybook-file-input');
        const storybookPreviewImg = document.getElementById('storybook-preview-img');
        const storybookUploadPlaceholder = document.getElementById('storybook-upload-placeholder');
        const storybookFileSummary = document.getElementById('storybook-file-summary');
        const generateStoryBtn = document.getElementById('generate-story-btn');
        const storyOutputContainer = document.getElementById('story-output-container');
        const storyDisplayContainer = document.getElementById('story-display-container');
        const audioControls = document.getElementById('audio-controls');
        const playStoryBtn = document.getElementById('play-story-btn');
        const downloadAudioBtn = document.getElementById('download-audio-btn');
        const storybookLanguageSelect = document.getElementById('storybook-language');
        const storybookAgeSelect = document.getElementById('storybook-age');
        const storybookErrorMessage = document.getElementById('storybook-error-message');
        
        // AI Tutor View
        const aiTutorInput = document.getElementById('ai-tutor-input');
        const aiTutorCategoryGroup = document.getElementById('ai-tutor-category-group');
        const aiTutorExpertGroup = document.getElementById('ai-tutor-expert-group');
        const getAdviceBtn = document.getElementById('get-advice-btn');
        const aiTutorResponseContainer = document.getElementById('ai-tutor-response-container');
        const aiTutorErrorMessage = document.getElementById('ai-tutor-error-message');

        // AI Doctor View
        const aiDoctorFileDropZone = document.getElementById('ai-doctor-file-drop-zone');
        const aiDoctorFileInput = document.getElementById('ai-doctor-file-input');
        const aiDoctorPreviewImg = document.getElementById('ai-doctor-preview-img');
        const aiDoctorUploadPlaceholder = document.getElementById('ai-doctor-upload-placeholder');
        const aiDoctorFileSummary = document.getElementById('ai-doctor-file-summary');
        const aiDoctorExpertGroup = document.getElementById('ai-doctor-expert-group');
        const getDiagnosisBtn = document.getElementById('get-diagnosis-btn');
        const aiDoctorResponseContainer = document.getElementById('ai-doctor-response-container');
        const aiDoctorErrorMessage = document.getElementById('ai-doctor-error-message');
        const aiDoctorInput = document.getElementById('ai-doctor-input');

        // Debate Coach View
        const debateCoachView = document.getElementById('debate-coach-view');
        const debateMotionSelect = document.getElementById('debate-motion');
        const debateSideSelect = document.getElementById('debate-side');
        const debateLevelSelect = document.getElementById('debate-level');
        const debateModulesContainer = document.getElementById('debate-modules-container');
        const debateCustomMotionWrapper = document.getElementById('debate-custom-motion-wrapper');
        const debateCustomMotionInput = document.getElementById('debate-custom-motion');
        const debateToggleBilingualBtn = document.getElementById('debate-toggle-bilingual');

        // Modal
        const imageModal = document.getElementById('image-modal');
        const modalImage = document.getElementById('modal-image');
        const closeModalBtn = document.getElementById('close-modal');

        // --- API Configuration ---
        const apiKey = "AIzaSyD08MzD3ahC2opquhZ9r93TwoOTmQb86a0"; // Canvas will provide this
        
        // --- API Call Functions ---
        async function handleApiError(response) {
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
        }

        async function callGeminiAPI(prompt, systemPrompt = "", base64Image = null, model = "gemini-2.5-flash-preview-09-2025") {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
                        headers: { 'Content-Type': 'application/json' },
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
                           throw await handleApiError(response);
                        }
                        await new Promise(resolve => setTimeout(resolve, delay));
                        delay *= 2; // Exponential backoff
                    } else {
                        // Other client-side error, don't retry
                        throw await handleApiError(response);
                    }
                }
            } catch (error) {
                console.error("Gemini API Error:", error);
                throw error;
            }
        }
        
        async function callTTSAPI(text, button = null, options = {}) {
            if (button) {
                button.classList.add('loading');
            }
            try {
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
                const speechProfile = options.speechProfile || null;
                const voiceCandidates = Array.from(new Set([options.voiceName || voiceProfiles.default, voiceProfiles.default]));
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
                            headers: { 'Content-Type': 'application/json' },
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
                                    return pcmToWav(pcmData, sampleRate);
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
                                throw await handleApiError(response);
                            }
                            await new Promise(resolve => setTimeout(resolve, delay));
                            delay *= 2;
                        } else {
                            throw await handleApiError(response);
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
        }
        
        async function callImagenAPI(prompt) {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;
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
                        headers: { 'Content-Type': 'application/json' },
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
                           throw await handleApiError(response);
                        }
                        await new Promise(resolve => setTimeout(resolve, delay));
                        delay *= 2; // Exponential backoff
                    } else {
                        // Other client-side error, don't retry
                        throw await handleApiError(response);
                    }
                }
             } catch (error) {
                console.error("Image Generation Error:", error);
                throw error;
             }
        }

        // --- Helper Functions ---
        function setLoading(button, isLoading) {
            const btnText = button.querySelector('.btn-text');
            const loader = button.querySelector('.loader');
            if (isLoading) {
                button.disabled = true;
                if(btnText) btnText.classList.add('hidden');
                if(loader) loader.classList.remove('hidden');
            } else {
                button.disabled = false;
                if(btnText) btnText.classList.remove('hidden');
                if(loader) loader.classList.add('hidden');
            }
        }
        
        function simpleMarkdownParse(text) {
            if (!text) return '';
            return text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/## (.*?)(?:\\n|<br>|$)/g, '<h3 class="font-bold text-lg my-3">$1</h3>')
                .replace(/\\n/g, '<br>');
        }

        function normalizeSpeechText(value) {
            if (value === null || value === undefined) return '';
            return String(value).replace(/\s+/g, ' ').trim();
        }

        function encodeForDataAttr(value) {
            const normalized = normalizeSpeechText(value);
            if (!normalized) return '';
            return normalized
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }

        function base64FromFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = error => reject(error);
            });
        }
        
        function handleFileSelection(file, previewImgEl, placeholderEl, fileNameDisplayEl, buttonToEnable) {
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (previewImgEl) {
                         previewImgEl.src = event.target.result;
                         previewImgEl.classList.remove('hidden');
                    }
                    if (placeholderEl) placeholderEl.classList.add('hidden');
                    if (fileNameDisplayEl) fileNameDisplayEl.textContent = file.name;
                };
                reader.readAsDataURL(file);
                if (buttonToEnable) buttonToEnable.disabled = false;
                return file;
            }
             if (buttonToEnable) buttonToEnable.disabled = true;
            return null;
        }

        function pcmToWav(pcmData, sampleRate) {
            const header = new ArrayBuffer(44);
            const view = new DataView(header);
            const numSamples = pcmData.length;
            const numChannels = 1;
            const bitsPerSample = 16;
            const byteRate = sampleRate * numChannels * bitsPerSample / 8;
            const blockAlign = numChannels * bitsPerSample / 8;

            /* RIFF identifier */
            view.setUint8(0, 'R'.charCodeAt(0)); view.setUint8(1, 'I'.charCodeAt(0)); view.setUint8(2, 'F'.charCodeAt(0)); view.setUint8(3, 'F'.charCodeAt(0));
            /* file length */
            view.setUint32(4, 36 + numSamples * 2, true);
            /* RIFF type */
            view.setUint8(8, 'W'.charCodeAt(0)); view.setUint8(9, 'A'.charCodeAt(0)); view.setUint8(10, 'V'.charCodeAt(0)); view.setUint8(11, 'E'.charCodeAt(0));
            /* format chunk identifier */
            view.setUint8(12, 'f'.charCodeAt(0)); view.setUint8(13, 'm'.charCodeAt(0)); view.setUint8(14, 't'.charCodeAt(0)); view.setUint8(15, ' '.charCodeAt(0));
            /* format chunk length */
            view.setUint32(16, 16, true);
            /* sample format (1 for PCM) */
            view.setUint16(20, 1, true);
            /* channel count */
            view.setUint16(22, numChannels, true);
            /* sample rate */
            view.setUint32(24, sampleRate, true);
            /* byte rate */
            view.setUint32(28, byteRate, true);
            /* block align */
            view.setUint16(32, blockAlign, true);
            /* bits per sample */
            view.setUint16(34, bitsPerSample, true);
            /* data chunk identifier */
            view.setUint8(36, 'd'.charCodeAt(0)); view.setUint8(37, 'a'.charCodeAt(0)); view.setUint8(38, 't'.charCodeAt(0)); view.setUint8(39, 'a'.charCodeAt(0));
            /* data chunk length */
            view.setUint32(40, numSamples * 2, true);
            
            // PCM data must be Int16Array for WAV
             const wavData = new Int16Array(pcmData.buffer.byteLength / 2);
             const pcmView = new DataView(pcmData.buffer);
             for (let i = 0; i < wavData.length; i++) {
                wavData[i] = pcmView.getInt16(i * 2, true); // Assuming little-endian PCM
            }
            
            return new Blob([view, wavData], { type: 'audio/wav' });
        }
        
         function displayError(element, message) {
            element.textContent = message;
            element.classList.remove('hidden');
        }

        function getAudioButtonKey(button) {
            if (!button.dataset.audioKey) {
                audioButtonCounter += 1;
                button.dataset.audioKey = `audio-${audioButtonCounter}`;
            }
            return button.dataset.audioKey;
        }

        function cacheGeneratedAudio(key, blob) {
            const existing = generatedAudioCache.get(key);
            if (existing?.url) {
                URL.revokeObjectURL(existing.url);
            }
            const url = URL.createObjectURL(blob);
            generatedAudioCache.set(key, { blob, url, updatedAt: Date.now() });
            return url;
        }

        function ensureDownloadButton(button) {
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
        }

        function showDownloadButton(button) {
            if (!button?.isConnected) return;
            const downloadBtn = ensureDownloadButton(button);
            downloadBtn.classList.remove('hidden');
        }

        function getAudioErrorDisplay(element) {
            if (element.closest('#tutoring-results-view')) {
                return tutoringErrorMessage;
            }
            if (element.closest('#storybook-main-view')) {
                return storybookErrorMessage;
            }
            return errorMessage;
        }

        function triggerAudioDownload(downloadBtn) {
            const key = downloadBtn.dataset.downloadKey;
            const cache = generatedAudioCache.get(key);
            const errorDisplay = getAudioErrorDisplay(downloadBtn);
            if (!cache) {
                displayError(errorDisplay, 'Audio file not ready yet. Please play it once before downloading.');
                return;
            }
            const link = document.createElement('a');
            link.href = cache.url;
            link.download = `tts-${Date.now()}.wav`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        // --- UI Rendering ---
        
        // MOVED createVocabularyHtmlForLang and createPhrasesHtmlForLang here to be accessible by handleLessonEvents
        const createVocabularyHtmlForLang = (targetLang) => {
            if (!currentLesson || !currentLesson.vocabulary) return '';
            const lang = targetLang || currentLang; // Fallback to currentLang
            return currentLesson.vocabulary.map(item => {
                const translationText = (item.translation && item.translation[targetLang]) ? item.translation[targetLang] : item.word;
                const phoneticHTML = item.phonetic ? `<p class="text-sm text-cyan-300">/<span data-translate-key="phoneticLabel">${translations[lang].phoneticLabel}</span>: ${item.phonetic}/</p>` : '';
                
                // Updated exampleHTML to check for object and then targetLang
                const exampleSentence = (item.example_sentence && typeof item.example_sentence === 'object' && item.example_sentence[targetLang]) 
                    ? item.example_sentence[targetLang] 
                    : (item.example_sentence && typeof item.example_sentence === 'object' && item.example_sentence['en'])
                    ? item.example_sentence['en'] // Fallback to english
                    : (typeof item.example_sentence === 'string') // Legacy support for string
                    ? item.example_sentence
                    : '';
                
                const exampleHTML = exampleSentence ? `<p class="text-sm italic mt-2 text-indigo-200">"<span data-translate-key="exampleLabel">${translations[lang].exampleLabel}</span>: ${exampleSentence}"</p>` : '';

                const wordSpeechAttr = encodeForDataAttr(item.word || translationText);
                const vocabAudioButton = wordSpeechAttr ? `
                        <button class="play-audio-btn flex-shrink-0 ml-4" data-text-to-speak="${wordSpeechAttr}" data-lesson-lang="${lang}">
                            <i class="fas fa-play"></i>
                            <div class="audio-loader"></div>
                        </button>` : '';

                return `
                    <div class="p-4 bg-white/10 rounded-lg flex justify-between items-start">
                        <div class="flex-grow">
                            <p class="font-bold text-lg text-yellow-300">${item.word}</p>
                            ${phoneticHTML}
                            <p class="text-sm mt-1 font-semibold">${translationText}</p>
                            ${exampleHTML}
                        </div>
                        ${vocabAudioButton}
                    </div>
                `;
            }).join('');
        };

        const createPhrasesHtmlForLang = (targetLang) => {
             if (!currentLesson || !currentLesson.phrases) return '';
             const lang = targetLang || currentLang; // Fallback
             return currentLesson.phrases.map(item => {
                const translationText = (item.translation && item.translation[targetLang]) ? item.translation[targetLang] : item.phrase;
                const phraseSpeechAttr = encodeForDataAttr(item.phrase || translationText);
                const phraseAudioButton = phraseSpeechAttr ? `
                        <button class="play-audio-btn flex-shrink-0" data-text-to-speak="${phraseSpeechAttr}" data-lesson-lang="${lang}">
                            <i class="fas fa-play"></i>
                            <div class="audio-loader"></div>
                        </button>` : '';
                 return `
                    <div class="p-4 bg-white/10 rounded-lg flex justify-between items-center">
                        <div>
                            <p class="font-semibold text-lg text-yellow-300">${item.phrase}</p>
                            <p class="text-sm mt-1">${translationText}</p>
                        </div>
                        ${phraseAudioButton}
                    </div>
                 `;
            }).join('');
        };


        function renderLesson() {
            if (!currentLesson) return;
            const lang = document.getElementById('lesson-lang-tabs')?.querySelector('.active')?.dataset.lang || currentLang;
            const selectedTopicName = currentLesson.selectedTopicName || (topicSelect.value === '__custom__' ? (customTopicInput?.value.trim() || getCustomTopicOptionText()) : topicSelect.value);
            
            // createVocabularyHtmlForLang and createPhrasesHtmlForLang were moved out

            const explanationLangTabsHTML = Object.entries(translations[currentLang].lessonLangTabs).map(([key, value]) => `
                <button class="lesson-lang-btn px-3 py-1 rounded-md text-sm ${key === currentLang ? 'active' : ''}" data-lang="${key}">${value}</button>
            `).join('');
            const isDialogueLesson = currentLessonType === '雙人博客';
            const voiceVariants = isDialogueLesson ? ['dialogue'] : ['default'];
            const voiceLabels = translations[currentLang].voiceLabels || {};
            const explanationAudioButtonsHTML = Object.entries(translations[currentLang].lessonLangTabs).map(([key, value]) => {
                return voiceVariants.map(voiceType => {
                    let template;
                    if (voiceType === 'dialogue') {
                        template = translations[currentLang].genDialogueAudio || translations[currentLang].genAudio;
                    } else if (voiceType === 'default') {
                        template = translations[currentLang].genAudio;
                    } else {
                        template = translations[currentLang].genAudioVariant || translations[currentLang].genAudio;
                    }
                    let buttonText = template.replace('{lang}', value);
                    if (buttonText.includes('{voice}')) {
                        buttonText = buttonText.replace('{voice}', voiceLabels?.[voiceType] || voiceType);
                    } else if (voiceType !== 'default' && voiceType !== 'dialogue') {
                        buttonText = `${buttonText} (${voiceLabels?.[voiceType] || voiceType})`;
                    }
                    return `
                        <button class="generate-explanation-audio-btn bg-white/20 hover:bg-white/30 text-white text-sm py-2 px-3 rounded-md flex items-center justify-center" data-lang="${key}" data-voice="${voiceType}">
                            <span class="btn-text">${buttonText}</span>
                            <div class="loader ml-2 hidden"></div>
                        </button>
                    `;
                }).join('');
            }).join('');

            const explanationAudioSectionHTML = Object.entries(translations[currentLang].lessonLangTabs).map(([key, value]) => {
                return voiceVariants.map(voiceType => {
                    let downloadTemplate = translations[currentLang].downloadAudio;
                    if (voiceType === 'dialogue') {
                        downloadTemplate = translations[currentLang].downloadDialogueAudio || downloadTemplate;
                    }
                    const downloadText = downloadTemplate.replace('{lang}', value);
                    let voiceBadge = '';
                    if (voiceType === 'dialogue') {
                        const badgeText = translations[currentLang].dialogueBadge || 'Dialogue';
                        voiceBadge = `<span class="text-xs uppercase tracking-wide text-indigo-200 font-semibold">${badgeText}</span>`;
                    } else if (voiceType !== 'default') {
                        voiceBadge = `<span class="text-xs uppercase tracking-wide text-indigo-200 font-semibold">${voiceLabels?.[voiceType] || voiceType}</span>`;
                    }
                    return `
                        <div id="audio-player-${key}-${voiceType}" class="hidden flex-col items-center gap-2">
                            ${voiceBadge}
                            <audio controls class="w-full"></audio>
                            <a href="#" class="download-link text-sm text-cyan-300 hover:underline">${downloadText}</a>
                        </div>
                    `;
                }).join('');
            }).join('');
            
            lessonContainer.innerHTML = `
                 <div class="bg-blue-900/10 backdrop-blur-md rounded-xl shadow-lg p-6 md:p-8 border-2 border-white/20 text-white space-y-8">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        <div>
                            <h3 class="text-2xl font-bold mb-4 text-center">"${selectedTopicName}"</h3>
                            <div class="flex justify-center flex-wrap gap-2 mb-4" id="lesson-lang-tabs">
                                ${explanationLangTabsHTML}
                            </div>
                            <p id="lesson-explanation" class="text-indigo-200 leading-relaxed min-h-[120px]">${currentLesson.explanation[currentLang]}</p>
                             <div class="grid grid-cols-2 md:grid-cols-2 gap-2 mt-4" id="lesson-audio-buttons">
                                ${explanationAudioButtonsHTML}
                            </div>
                            <div class="mt-4 space-y-2">
                                ${explanationAudioSectionHTML}
                            </div>
                        </div>
                        <div class="cursor-pointer">
                            <h4 class="text-xl font-bold mb-4 text-center" data-translate-key="imageTitle">${translations[lang].imageTitle}</h4>
                            <img id="lesson-image" src="${currentLesson.imageUrl || 'https://placehold.co/600x600/1e1b4b/9ca3af?text=Loading...'}" alt="Lesson image" class="rounded-lg shadow-lg w-full aspect-square object-cover">
                        </div>
                    </div>
                    ${currentLesson.vocabulary ? `
                    <div>
                        <h4 class="text-xl font-bold mb-4" data-translate-key="vocabTitle">${translations[lang].vocabTitle}</h4>
                        <div id="vocabulary-list" class="grid grid-cols-1 md:grid-cols-2 gap-4">${createVocabularyHtmlForLang(lang)}</div>
                    </div>` : ''}
                    ${currentLesson.phrases ? `
                    <div>
                         <h4 class="text-xl font-bold mb-4" data-translate-key="phraseTitle">${translations[lang].phraseTitle}</h4>
                         <div id="phrases-list" class="space-y-4">${createPhrasesHtmlForLang(lang)}</div>
                    </div>` : ''}
                </div>
            `;
            const lessonImage = document.getElementById('lesson-image');
            if(lessonImage) {
                lessonImage.addEventListener('click', () => {
                    modalImage.src = lessonImage.src;
                    imageModal.classList.remove('hidden');
                    imageModal.classList.add('flex');
                });
            }
        }
        
        // --- Event Handlers & App Logic ---
        function switchView(viewId) {
            views.forEach(view => view.classList.add('hidden'));
            document.getElementById(viewId)?.classList.remove('hidden');
            mainNav.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === viewId);
            });
             // Clear chat history when switching away from tutor/doctor views
            if (viewId !== 'ai-tutor-view') {
                aiTutorChatHistory = [];
                aiTutorResponseContainer.innerHTML = '';
                 aiTutorResponseContainer.classList.add('hidden');
            }
            if (viewId !== 'ai-doctor-view') {
                aiDoctorChatHistory = [];
                aiDoctorResponseContainer.innerHTML = '';
                 aiDoctorResponseContainer.classList.add('hidden');
            }
            if (viewId !== 'debate-coach-view') {
                Object.keys(debateModuleConfigs).forEach(key => {
                    stopModuleTimer(key);
                    setWaveformVisible(key, false);
                    showProgress(key, false);
                    setRecordingButtonState(getRecordingButton(key), false);
                    debateState.recording[key] = { status: 'idle' };
                });
            } else {
                renderDebateModules();
            }
        }
        
        function handleNavClick(e) {
            const btn = e.target.closest('.nav-btn');
            if (btn) {
                switchView(btn.dataset.view);
            }
        }

        async function generateLesson() {
            setLoading(generateLessonBtn, true);
            errorMessage.classList.add('hidden');
            lessonContainer.classList.add('hidden');
            currentLesson = null;
            explanationAudioBlobs = {};
            
            try {
                const age = document.querySelector('input[name="age"]:checked').value;
                const subject = document.querySelector('input[name="subject"]:checked').value;
                const lessonType = document.querySelector('input[name="lesson-type"]:checked').value;
                currentLessonType = lessonType;
                const topicValue = topicSelect.value;
                let topic = topicValue;
                if (topicValue === '__custom__') {
                    const customValue = customTopicInput?.value.trim();
                    if (!customValue) {
                        throw new Error(getCustomTopicErrorText());
                    }
                    topic = customValue;
                }
                const langName = new Intl.DisplayNames(['en'], {type: 'language'}).of(subject.toLowerCase().includes('english') ? 'en' : currentLang);
                
                const systemPrompt = `You are an expert curriculum designer. Your task is to generate a mini-lesson as a single, valid JSON object. The lesson is for a ${age} old student, the format is "${lessonType}". All property names in the JSON must be enclosed in double quotes. Output ONLY the JSON object.`;
                const userPrompt = `Generate a mini-lesson about "${topic}" in the subject of ${subject}. The main learning language for this lesson is ${langName}.
The lesson must include:
1.  An "explanation" paragraph about the topic, tailored to the lesson type "${lessonType}". **This explanation must be detailed and between 500 and 600 words.** Provide this explanation in an object with four language versions: Traditional Chinese (繁體中文), English, Vietnamese (Tiếng Việt), and Japanese (日本語).
2.  If the lesson type is NOT "AI提問", include a list of 5-7 core "vocabulary" words. The "word" field must be in the main learning language (${langName}). For each word:
    a. Provide its "translation" in an object with all four languages (zh-Hant, en, vi, ja).
    b. Provide an IPA "phonetic" transcription as a single string.
    c. Provide a simple "example_sentence" as an object with all four languages (zh-Hant, en, vi, ja).
3.  If the lesson type is NOT "AI提問", include a list of 3-4 simple, practical "phrases". The "phrase" field must be in the main learning language (${langName}). For each phrase, provide its "translation" in an object with all four languages.
4.  An "image_prompt" for an image generation model to create a colorful, friendly, cartoon-style illustration for this lesson.

Output ONLY a single, valid JSON object in the following format. Omit "vocabulary" and "phrases" keys if the lesson type is "AI提問". Ensure all property names are double-quoted.
{
  "explanation": { "zh-Hant": "...", "en": "...", "vi": "...", "ja": "..." },
  "vocabulary": [
    { "word": "...", "phonetic": "...", "example_sentence": { "zh-Hant": "...", "en": "...", "vi": "...", "ja": "..." }, "translation": { "zh-Hant": "...", "en": "...", "vi": "...", "ja": "..." } }
  ],
  "phrases": [
    { "phrase": "...", "translation": { "zh-Hant": "...", "en": "...", "vi": "...", "ja": "..." } }
  ],
  "image_prompt": "..."
}`;

                const rawJsonResponse = await callGeminiAPI(userPrompt, systemPrompt);
                let cleanedJson = rawJsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                const firstBrace = cleanedJson.indexOf('{');
                const lastBrace = cleanedJson.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace > firstBrace) {
                    cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
                }
                
                // Attempt to parse the cleaned JSON
                 try {
                     currentLesson = JSON.parse(cleanedJson);
                 } catch (parseError) {
                     console.error("Failed to parse JSON:", parseError, "Raw response:", rawJsonResponse, "Cleaned JSON:", cleanedJson);
                     throw new Error(`Invalid JSON received from API: ${parseError.message}`);
                 }


                if (currentLesson.image_prompt) {
                    currentLesson.imageUrl = await callImagenAPI(currentLesson.image_prompt);
                }
                
                currentLesson.selectedTopicName = topic;
                renderLesson();
                lessonContainer.classList.remove('hidden');

            } catch (error) {
                console.error("Lesson Generation Error:", error);
                displayError(errorMessage, translations[currentLang].lessonError.replace('{message}', error.message));
            } finally {
                setLoading(generateLessonBtn, false);
            }
        }

        function renderTutoringVocabulary(items) {
            if (!tutoringVocabCard || !tutoringVocabContainer) return;
            if (!Array.isArray(items) || items.length === 0) {
                tutoringVocabContainer.innerHTML = '';
                tutoringVocabCard.classList.add('hidden');
                return;
            }
            const phoneticLabel = translations[currentLang]?.phoneticLabel || 'Phonetic';
            const exampleLabel = translations[currentLang]?.exampleLabel || 'Example';
            tutoringVocabContainer.innerHTML = items.map((item, index) => {
                const wordText = typeof item?.word === 'string' && item.word.trim() ? item.word.trim() : `Word ${index + 1}`;
                const meaningText = typeof item?.meaning === 'string' ? item.meaning.trim() : '';
                const phoneticText = typeof item?.phonetic === 'string' ? item.phonetic.trim() : '';
                const exampleText = typeof item?.example === 'string' ? item.example.trim() : '';
                const wordSpeechAttr = encodeForDataAttr(wordText);
                const exampleSpeechAttr = exampleText ? encodeForDataAttr(exampleText) : '';
                const wordButton = wordSpeechAttr ? `
                            <button class="play-audio-btn flex-shrink-0" data-text-to-speak="${wordSpeechAttr}" title="Play word audio" aria-label="Play word audio">
                                <i class="fas fa-play"></i>
                                <div class="audio-loader"></div>
                            </button>` : '';
                const exampleButton = exampleSpeechAttr ? `
                            <button class="play-audio-btn flex-shrink-0" data-text-to-speak="${exampleSpeechAttr}" title="Play example audio" aria-label="Play example audio">
                                <i class="fas fa-play"></i>
                                <div class="audio-loader"></div>
                            </button>` : '';
                return `
                    <div class="p-4 bg-white/10 rounded-lg flex flex-col gap-4 md:flex-row md:items-start">
                        <div class="flex-1">
                            <p class="font-bold text-lg text-yellow-300">${wordText}</p>
                            ${phoneticText ? `<p class="text-sm text-cyan-300">${phoneticLabel}: ${phoneticText}</p>` : ''}
                            ${meaningText ? `<p class="text-sm mt-1 text-white/90">${meaningText}</p>` : ''}
                            ${exampleText ? `<p class="text-sm italic mt-2 text-indigo-200">"${exampleLabel}: ${exampleText}"</p>` : ''}
                        </div>
                        <div class="flex flex-wrap gap-3">
                            ${wordButton}
                            ${exampleButton}
                        </div>
                    </div>
                `;
            }).join('');
            tutoringVocabCard.classList.remove('hidden');
        }

        async function analyzeHomework() {
             setLoading(analyzeHomeworkBtn, true);
             tutoringErrorMessage.classList.add('hidden');
             tutoringResultsView.classList.add('hidden');

             try {
                 if (!tutoringFiles.length) {
                     const noFileMessage = translations[currentLang]?.tutoring?.noFileError || translations['en']?.tutoring?.noFileError || 'Please upload at least one file first.';
                     throw new Error(noFileMessage);
                 }
                 const primaryFile = tutoringFiles[0];
                 const fileCount = tutoringFiles.length;
                 const base64Image = await base64FromFile(primaryFile);
                 const level = tutoringLevelSelect.value;
                 let subject = tutoringSubjectSelect.value;
                 if (subject === 'Other' || subject === '其他' || subject === 'Khác' || subject === 'その他') {
                     subject = tutoringCustomSubjectInput.value || 'Custom';
                 }
                 const language = tutoringLanguageSelect.options[tutoringLanguageSelect.selectedIndex].text;
                 const levelGuidance = getTutoringLevelGuidance(level, subject);

                 const systemPrompt = `You are an AI tutor analyzing homework. Output a valid JSON object. All property names must be double-quoted. Output ONLY the JSON object.`;
                 const adaptationInstruction = levelGuidance
                     ? `4. ${levelGuidance}`
                     : `4. Adapt the explanations so they feel natural for a student at the ${level} level using encouraging language and concrete examples.`;
                 const prompt = `Analyze this homework image${fileCount > 1 ? ` (1st of ${fileCount} uploaded files)` : ''}. The student's level is ${level}, the subject is ${subject}. Provide all text in ${language}.
1. Identify the key concepts being tested in the homework.
2. Provide a step-by-step analysis for each distinct problem you can see.
3. Extract exactly six high-impact vocabulary words that appear in, or are essential to, the assignment. For each vocabulary entry, include:
   - "word": the vocabulary term in ${language}
   - "meaning": a short definition or translation in ${language}
   - "phonetic": an IPA (or syllable-style) pronunciation guide
   - "example": a simple example sentence using the word in ${language}
If fewer than six suitable words exist, include as many as possible.
${adaptationInstruction}

Return ONLY a valid JSON object with the following shape:
{
    "keyConcepts": ["concept1", "concept2"],
    "problemAnalysis": [
        { "problem": "Description of problem 1", "solution": "Step-by-step solution for problem 1", "feedback": "Specific feedback for problem 1" }
    ],
    "vocabulary": [
        { "word": "term", "meaning": "short meaning", "phonetic": "IPA", "example": "example sentence" }
    ]
}`;
                const rawJsonResponse = await callGeminiAPI(prompt, systemPrompt, base64Image);
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
                     throw new Error(`Invalid JSON received from API: ${parseError.message}`);
                 }
                const keyConcepts = Array.isArray(results.keyConcepts) ? results.keyConcepts : [];
                const problemAnalysis = Array.isArray(results.problemAnalysis) ? results.problemAnalysis : [];
                const vocabularyItems = Array.isArray(results.vocabulary) ? results.vocabulary.slice(0, 6) : [];

                const keyConceptsHtml = keyConcepts
                    .map(concept => (typeof concept === 'string' ? concept.trim() : ''))
                    .filter(Boolean)
                    .map(concept => {
                        const speechAttr = encodeForDataAttr(concept);
                        const buttonHtml = speechAttr ? `
                        <button class="play-audio-btn flex-shrink-0" data-text-to-speak="${speechAttr}">
                            <i class="fas fa-play"></i>
                            <div class="audio-loader"></div>
                        </button>` : '';
                        return `
                    <div class="p-3 bg-white/10 rounded-lg flex justify-between items-center gap-3">
                        <span>${concept}</span>
                        ${buttonHtml}
                    </div>`;
                    }).join('');
                keyConceptsContainer.innerHTML = keyConceptsHtml;

                const problemAnalysisHtml = problemAnalysis.map((prob, index) => {
                    const problemTitle = typeof prob?.problem === 'string' && prob.problem.trim() ? prob.problem.trim() : `Problem ${index + 1}`;
                    const solutionText = typeof prob?.solution === 'string' ? prob.solution : '';
                    const feedbackText = typeof prob?.feedback === 'string' ? prob.feedback : '';
                    const speechParts = [problemTitle, solutionText, feedbackText].map(normalizeSpeechText).filter(Boolean);
                    const speechAttr = speechParts.length ? encodeForDataAttr(speechParts.join('. ')) : '';
                    const solutionHtml = solutionText ? `<p class="mt-2 whitespace-pre-wrap">${solutionText}</p>` : '';
                    const feedbackHtml = feedbackText ? `<p class="mt-2 text-sm italic text-indigo-200">${feedbackText}</p>` : '';
                    const buttonHtml = speechAttr ? `
                             <button class="play-audio-btn flex-shrink-0 ml-4" data-text-to-speak="${speechAttr}">
                                 <i class="fas fa-play"></i>
                                 <div class="audio-loader"></div>
                             </button>` : '';
                    return `
                    <div class="p-4 bg-white/10 rounded-lg">
                        <div class="flex justify-between items-start gap-4">
                             <div>
                                <h4 class="font-bold text-yellow-300">${problemTitle}</h4>
                                ${solutionHtml}
                                ${feedbackHtml}
                             </div>
                             ${buttonHtml}
                        </div>
                    </div>`;
                }).join('');
                problemAnalysisContainer.innerHTML = problemAnalysisHtml;

                renderTutoringVocabulary(vocabularyItems);
                tutoringResultsView.classList.remove('hidden');

             } catch (error) {
                 console.error("Homework Analysis Error:", error);
                 displayError(tutoringErrorMessage, `Analysis failed: ${error.message}`);
             } finally {
                 setLoading(analyzeHomeworkBtn, false);
             }
        }

        async function generateStory() {
            setLoading(generateStoryBtn, true);
            storybookErrorMessage.classList.add('hidden');
            storyOutputContainer.classList.add('hidden');
            audioControls.classList.add('hidden');
            if (storyAudioUrl) URL.revokeObjectURL(storyAudioUrl);
            storyAudioBlob = null;
            storyAudioUrl = null;

            try {
                if (!storybookFiles.length) {
                    const noImageMessage = translations[currentLang]?.storybook?.noImageError || translations['en']?.storybook?.noImageError || 'Please upload at least one illustration first.';
                    throw new Error(noImageMessage);
                }
                
                const base64Image = await base64FromFile(storybookFiles[0]);
                const lang = storybookLanguageSelect.options[storybookLanguageSelect.selectedIndex].text;
                const age = storybookAgeSelect.value;
                const style = document.querySelector('input[name="style"]:checked').value;
                const charName = document.getElementById('storybook-char-name').value;
                
                const prompt = `Based on this image, write a ${style} children's story suitable for a ${age} old child. The story should be in ${lang}. ${charName ? `The main character's name is ${charName}.` : ''} **The story must be detailed and between 500 and 600 words.**`;
                
                const storyText = await callGeminiAPI(prompt, "", base64Image);
                storyDisplayContainer.textContent = storyText;
                storyOutputContainer.classList.remove('hidden');

                const audioBlob = await callTTSAPI(storyText, playStoryBtn);
                storyAudioBlob = audioBlob;
                storyAudioUrl = URL.createObjectURL(audioBlob);
                audioControls.classList.remove('hidden');
                playStoryBtn.disabled = false;

            } catch (error) {
                console.error("Story Generation Error:", error);
                displayError(storybookErrorMessage, `Story generation failed: ${error.message}`);
            } finally {
                setLoading(generateStoryBtn, false);
            }
        }
        
        async function getAdviceOrDiagnosis(isDoctor, followUpText = null) {
            const chatHistory = isDoctor ? aiDoctorChatHistory : aiTutorChatHistory;
            const responseContainer = isDoctor ? aiDoctorResponseContainer : aiTutorResponseContainer;
            const inputEl = isDoctor ? aiDoctorInput : aiTutorInput;
            const expertGroup = isDoctor ? aiDoctorExpertGroup : aiTutorExpertGroup;
            const button = isDoctor ? getDiagnosisBtn : getAdviceBtn;
            const errorEl = isDoctor ? aiDoctorErrorMessage : aiTutorErrorMessage;

            const userInput = followUpText || inputEl.value.trim();
            if (!userInput) return;

            const selectedExpertEl = expertGroup.querySelector('.expert-card.selected');
             // Use chat history's last expert if available (for follow-ups)
            const lastExpertId = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].expertId : null;
            const currentExpertId = selectedExpertEl ? selectedExpertEl.dataset.expertId : lastExpertId;

            if (!currentExpertId) {
                displayError(errorEl, "Please select an expert.");
                return;
            }
            
            setLoading(button, true);
            errorEl.classList.add('hidden');
            responseContainer.classList.remove('hidden');
            
            responseContainer.querySelector('#follow-up-section')?.remove();
            responseContainer.innerHTML += `<div class="flex justify-end mb-4"><div class="chat-bubble user p-3">${userInput}</div></div>`;
            if (!followUpText) inputEl.value = "";
            
            const loadingBubble = document.createElement('div');
            loadingBubble.className = "flex justify-start mb-4";
            loadingBubble.innerHTML = `<div class="chat-bubble bot p-3 flex justify-center items-center"><div class="loader" style="border-color: #9ca3af; border-bottom-color: transparent;"></div></div>`;
            responseContainer.appendChild(loadingBubble);
            responseContainer.scrollTop = responseContainer.scrollHeight;

            try {
                const expertData = isDoctor ? aiDoctorsData[currentExpertId] : aiExpertsData[currentExpertId];
                
                const isFirstTurn = chatHistory.length === 0;
                let base64Image = null;
                if (isDoctor && aiDoctorFiles.length && isFirstTurn) {
                    base64Image = await base64FromFile(aiDoctorFiles[0]);
                }
                
                chatHistory.push({ role: 'user', text: userInput, expertId: currentExpertId }); // Store expertId with the turn
                const fullPrompt = chatHistory.map(turn => `${turn.role}: ${turn.text}`).join('\n');
                
                const rawJsonResponse = await callGeminiAPI(fullPrompt, expertData.systemPrompt, base64Image);
                let cleanedJson = rawJsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                const firstBrace = cleanedJson.indexOf('{');
                const lastBrace = cleanedJson.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace > firstBrace) {
                    cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
                }
                let responseData;
                 try {
                    responseData = JSON.parse(cleanedJson);
                 } catch (parseError) {
                     console.error("Failed to parse chat JSON:", parseError, "Raw response:", rawJsonResponse, "Cleaned JSON:", cleanedJson);
                     throw new Error(`Invalid JSON received from API: ${parseError.message}`);
                 }


                const formattedAdvice = simpleMarkdownParse(responseData.advice);
                chatHistory.push({ role: 'model', text: responseData.advice, expertId: currentExpertId }); // Store expertId with the turn

                loadingBubble.outerHTML = `<div class="flex justify-start mb-4"><div class="chat-bubble bot p-4 prose prose-sm max-w-none text-slate-800">${formattedAdvice}</div></div>`;

                const followUpQuestions = responseData.followUpQuestions;
                if (followUpQuestions && followUpQuestions.length > 0) {
                    const expertName = expertData.name[currentLang] || expertData.name['en'];
                    const followUpHTML = `
                        <div id="follow-up-section" class="mt-6">
                            <div class="chat-bubble bot summary p-4 space-y-3">
                                <h4 class="font-bold flex items-center gap-2 text-lg" style="color: ${expertData.color};">
                                    <i class="fas fa-question-circle opacity-80"></i>
                                    <span>${translations[currentLang].aiTutor.summaryTitle.replace('{expertName}', expertName)}</span>
                                </h4>
                                ${followUpQuestions.map(q => `<button class="suggested-question-btn w-full text-left p-2 bg-white/60 hover:bg-white rounded-md transition text-slate-800">${q}</button>`).join('')}
                            </div>
                            <div class="mt-4 relative">
                                <input type="text" class="follow-up-input w-full p-3 pr-16 bg-white/20 border border-white/30 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none text-white placeholder-gray-300" placeholder="${translations[currentLang].aiTutor.followupPlaceholder}">
                                <button class="send-follow-up-btn absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500 text-white rounded-md h-8 w-10 flex items-center justify-center hover:bg-emerald-600">
                                    <i class="fas fa-paper-plane"></i>
                                </button>
                            </div>
                        </div>`;
                    responseContainer.insertAdjacentHTML('beforeend', followUpHTML);
                }

                responseContainer.scrollTop = responseContainer.scrollHeight;

            } catch (error) {
                 console.error("Chat Error:", error);
                 loadingBubble.remove();
                 displayError(errorEl, `Failed to get response: ${error.message}`);
            } finally {
                setLoading(button, false);
            }
        }

        async function playAudio(e) {
            const button = e.target.closest('.play-audio-btn');
            if (!button) return;
            const textToSpeak = button.dataset.textToSpeak;
            if (!textToSpeak) return;

            const errorDisplay = getAudioErrorDisplay(button);
            errorDisplay.classList.add('hidden');

            const audioKey = getAudioButtonKey(button);
            const cached = generatedAudioCache.get(audioKey);
            const isLessonAudio = Boolean(button.closest('#platform-view'));
            const speechProfile = isLessonAudio
                ? getLessonSpeechProfile(button.dataset.lessonLang || getActiveLessonLanguage())
                : null;

            const handlePlaybackError = (playError) => {
                console.error("Audio playback error:", playError);
                displayError(errorDisplay, `Audio playback failed: ${playError.message}`);
            };

            try {
                if (cached) {
                    playAudioBlob(cached.blob, speechProfile, handlePlaybackError);
                    showDownloadButton(button);
                    return;
                }
                const audioBlob = await callTTSAPI(textToSpeak, button, { speechProfile });
                cacheGeneratedAudio(audioKey, audioBlob);
                playAudioBlob(audioBlob, speechProfile, handlePlaybackError);
                showDownloadButton(button);
            } catch (error) {
                console.error("Audio playback error:", error);
                displayError(errorDisplay, `Audio Error: ${error.message}`);
            }
        }

        // --- Translation & UI Update Functions ---
        function setLanguage(lang) {
            currentLang = lang;
            document.documentElement.lang = lang;
            
            document.querySelectorAll('[data-translate-key]').forEach(el => {
                const key = el.dataset.translateKey;
                const keys = key.split('.');
                let translation = translations[lang];
                try {
                    for (const k of keys) {
                        translation = translation[k];
                    }
                } catch (e) {
                    translation = undefined;
                }
                
                if (typeof translation === 'string') {
                     if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
                        el.placeholder = translation;
                     } else if (el.dataset.placeholderKey) {
                        // Special handling for contenteditable placeholder
                        // Only set if currently empty or showing a known placeholder
                        const currentPlaceholder = el.getAttribute('data-placeholder-key');
                        const isEmpty = el.textContent.trim() === '';
                        const isShowingPlaceholder = Object.values(translations).some(t => 
                            (t.storybook && t.storybook.storyPlaceholder === currentPlaceholder) ||
                            (t.aiTutor && t.aiTutor.inputPlaceholder === currentPlaceholder) || // Add other placeholders if needed
                            (t.aiDoctor && t.aiDoctor.symptomPlaceholder === currentPlaceholder) 
                        );

                        if (isEmpty || isShowingPlaceholder) {
                           el.setAttribute('data-placeholder-key', translation);
                        }
                     } else {
                        // Check if it's a button text span
                        if (el.classList.contains('btn-text')) {
                            el.textContent = translation;
                        } else {
                           el.innerHTML = translation; // Use innerHTML for potential markdown/bolding in titles etc.
                        }
                     }
                } else if (typeof translation === 'object' && el.id === 'lesson-type-group') {
                    // Handle radio button group labels specifically
                    Object.entries(translation).forEach(([key, value]) => {
                        const label = el.querySelector(`label[for="type-${key}"]`);
                        if (label) label.textContent = value;
                    });
                } else if (typeof translation === 'object' && el.id === 'storybook-style-group') {
                    // Handle storybook style labels
                     Object.entries(translations[lang].storybook).forEach(([key, value]) => {
                        if (key.startsWith('style')) {
                            const styleKey = key.replace('style','').toLowerCase();
                            const label = el.querySelector(`label[for="style-${styleKey}"]`);
                            if(label) label.textContent = value;
                        }
                     });
                }
            });

            updateAllSelectOptions();
            updateTopicSelection(subjectGroup.querySelector('input[name="subject"]:checked').value);
            renderExpertCards(); 
            renderDoctorCards();
            renderTutorCategories();
            populateDebateSelects();
            renderDebateModules();
            updateStorybookSummary(storybookFiles.length);
            updateTutoringSummary(tutoringFiles.length);
            updateDoctorSummary(aiDoctorFiles.length);
            if (generateStoryBtn) generateStoryBtn.disabled = storybookFiles.length === 0;
            if (analyzeHomeworkBtn) analyzeHomeworkBtn.disabled = tutoringFiles.length === 0;
            if (fileNameDisplay) {
                if (tutoringFiles.length > 0) {
                    fileNameDisplay.textContent = tutoringFiles.map(file => file.name).join(', ');
                } else {
                    const noFile = translations[currentLang]?.tutoring?.noFileSelected || translations['en']?.tutoring?.noFileSelected || 'No file selected';
                    fileNameDisplay.textContent = noFile;
                }
            }
            syncCustomTopicOptionLabel();

            if (currentLesson) {
                renderLesson();
            }
             // Ensure button texts are updated correctly
            document.querySelectorAll('button[data-translate-key]').forEach(btn => {
                const key = btn.dataset.translateKey;
                const keys = key.split('.');
                let translation = translations[lang];
                 try { for (const k of keys) { translation = translation[k]; } } catch(e){ translation = undefined; }
                 if(typeof translation === 'string') {
                     const textSpan = btn.querySelector('.btn-text');
                     if (textSpan) { textSpan.textContent = translation; } else { btn.textContent = translation;}
                 }
            });
             // Ensure select labels are updated correctly
             document.querySelectorAll('label[data-translate-key]').forEach(lbl => {
                 const key = lbl.dataset.translateKey;
                 const keys = key.split('.');
                 let translation = translations[lang];
                 try { for (const k of keys) { translation = translation[k]; } } catch(e){ translation = undefined; }
                 if(typeof translation === 'string') { lbl.textContent = translation; }
             });
        }

        function getLocalizedText(entry) {
            if (!entry) return '';
            if (typeof entry === 'string') return entry;
            return entry[currentLang] || entry['en'] || Object.values(entry)[0] || '';
        }

        function getDebateTranslation(path) {
            const segments = path.split('.');
            let node = translations[currentLang]?.debateCoach;
            let fallbackNode = translations['en']?.debateCoach;
            for (const segment of segments) {
                node = node?.[segment];
                fallbackNode = fallbackNode?.[segment];
            }
            return typeof node === 'string' ? node : (typeof fallbackNode === 'string' ? fallbackNode : '');
        }

        function getStorybookSelectedText(count) {
            const template = translations[currentLang]?.storybook?.selectedCount || translations['en']?.storybook?.selectedCount || 'Selected {count} file(s)';
            return template.replace('{count}', count);
        }

        function getCustomTopicOptionText() {
            return translations[currentLang]?.topicCustomOption || translations['en']?.topicCustomOption || 'Custom topic';
        }

        function getCustomTopicErrorText() {
            return translations[currentLang]?.topicCustomError || translations['en']?.topicCustomError || 'Please enter your custom topic.';
        }

        function updateStorybookSummary(count) {
            if (!storybookFileSummary) return;
            if (count > 0) {
                storybookFileSummary.textContent = getStorybookSelectedText(count);
                storybookFileSummary.classList.remove('hidden');
            } else {
                storybookFileSummary.textContent = '';
                storybookFileSummary.classList.add('hidden');
            }
        }

        function getTutoringSelectedText(count) {
            const template = translations[currentLang]?.tutoring?.selectedCount || translations['en']?.tutoring?.selectedCount || 'Selected {count} file(s)';
            return template.replace('{count}', count);
        }

        function updateTutoringSummary(count) {
            if (!tutoringFileSummary) return;
            if (count > 0) {
                tutoringFileSummary.textContent = getTutoringSelectedText(count);
                tutoringFileSummary.classList.remove('hidden');
            } else {
                tutoringFileSummary.textContent = '';
                tutoringFileSummary.classList.add('hidden');
            }
        }

        function getDoctorSelectedText(count) {
            const template = translations[currentLang]?.aiDoctor?.selectedCount || translations['en']?.aiDoctor?.selectedCount || 'Selected {count} photo(s)';
            return template.replace('{count}', count);
        }

        function updateDoctorSummary(count) {
            if (!aiDoctorFileSummary) return;
            if (count > 0) {
                aiDoctorFileSummary.textContent = getDoctorSelectedText(count);
                aiDoctorFileSummary.classList.remove('hidden');
            } else {
                aiDoctorFileSummary.textContent = '';
                aiDoctorFileSummary.classList.add('hidden');
            }
        }

        function updateAllSelectOptions() {
             const langKey = currentLang;
             // Tutoring Levels
             tutoringLevelSelect.innerHTML = (tutoring_levels[langKey] || tutoring_levels['en']).map(level => `<option class="text-black">${level}</option>`).join('');
             // Tutoring Subjects
             tutoringSubjectSelect.innerHTML = (tutoring_subjects[langKey] || tutoring_subjects['en']).map(subject => `<option class="text-black">${subject}</option>`).join('');
             // Tutoring/Storybook languages
             const langOptions = Object.keys(translations).map(key => {
                const langName = new Intl.DisplayNames([langKey], {type: 'language'}).of(key) || key; // Use current lang for display name
                return `<option class="text-black" value="${key}">${langName.charAt(0).toUpperCase() + langName.slice(1)}</option>`
             }).join('');
             tutoringLanguageSelect.innerHTML = langOptions;
             storybookLanguageSelect.innerHTML = langOptions;
             tutoringLanguageSelect.value = currentLang; // Default to current app language
             storybookLanguageSelect.value = currentLang; // Default to current app language
             // Storybook Ages
            storybookAgeSelect.innerHTML = (storybook_ages[langKey] || storybook_ages['en']).map(age => `<option class="text-black" value="${age}">${age}</option>`).join('');
        }

        function syncCustomTopicOptionLabel() {
            const customOption = topicSelect.querySelector('option[value="__custom__"]');
            if (customOption) {
                const customValue = customTopicInput?.value.trim();
                customOption.textContent = customValue ? `${getCustomTopicOptionText()} (${customValue})` : getCustomTopicOptionText();
            }
        }

        function updateCustomTopicUI() {
            if (!customTopicWrapper) return;
            const subject = subjectGroup.querySelector('input[name="subject"]:checked')?.value;
            const allowCustom = allowsCustomTopic(subject);
            const isCustomSelected = topicSelect.value === '__custom__';
            syncCustomTopicOptionLabel();
            customTopicWrapper.classList.toggle('hidden', !(allowCustom && isCustomSelected));
        }

        function allowsCustomTopic(subject) {
            return subject === 'KidsEnglish' || subject === 'AdultEnglish';
        }

        function updateTopicSelection(subject) {
            const topicsMap = translations[currentLang].topics || translations['en'].topics;
            const topics = topicsMap[subject] || [];
            const previousValue = topicSelect.value;
            const includeCustom = allowsCustomTopic(subject);
            const options = [...topics];
            topicSelect.innerHTML = options.map(topic => `<option class="text-black">${topic}</option>`).join('') + (includeCustom ? `<option class="text-black" value="__custom__">${getCustomTopicOptionText()}</option>` : '');

            if (includeCustom && previousValue === '__custom__') {
                topicSelect.value = '__custom__';
            } else if (options.includes(previousValue)) {
                topicSelect.value = previousValue;
            } else if (options.length) {
                topicSelect.value = options[0];
            } else if (includeCustom) {
                topicSelect.value = '__custom__';
            }
            updateCustomTopicUI();
        }

        function renderExpertCards() {
            const selectedId = aiTutorExpertGroup.querySelector('.expert-card.selected')?.dataset.expertId;
            aiTutorExpertGroup.innerHTML = Object.values(aiExpertsData).map(expert => `
                <div class="expert-card bg-white/20 p-4 rounded-lg flex items-center space-x-4 ${expert.id === selectedId ? 'selected' : ''}" data-expert-id="${expert.id}">
                    <div class="text-3xl bg-white/20 p-3 rounded-full">${expert.icon}</div>
                    <div>
                        <h4 class="font-bold text-white">${expert.name[currentLang] || expert.name['en']}</h4>
                        <p class="text-sm text-indigo-200">${expert.description[currentLang] || expert.description['en']}</p>
                    </div>
                </div>
            `).join('');
        }
        
         function renderDoctorCards() {
            const selectedId = aiDoctorExpertGroup.querySelector('.expert-card.selected')?.dataset.expertId;
            aiDoctorExpertGroup.innerHTML = Object.values(aiDoctorsData).map(expert => `
                <div class="expert-card bg-white/20 p-4 rounded-lg flex items-center space-x-4 ${expert.id === selectedId ? 'selected' : ''}" data-expert-id="${expert.id}">
                    <div class="text-3xl bg-white/20 p-3 rounded-full">${expert.icon}</div>
                    <div>
                        <h4 class="font-bold text-white">${expert.name[currentLang] || expert.name['en']}</h4>
                        <p class="text-sm text-indigo-200">${expert.description[currentLang] || expert.description['en']}</p>
                    </div>
                </div>
            `).join('');
        }
        
        function renderTutorCategories() {
            const categories = (translations[currentLang].aiTutor.categories || translations['en'].aiTutor.categories);
            aiTutorCategoryGroup.innerHTML = Object.entries(categories).map(([key, value]) => `
                <div class="flex items-center">
                    <input id="cat-${key}" type="checkbox" value="${key}" name="tutor-category" class="w-4 h-4 text-yellow-400 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500">
                    <label for="cat-${key}" class="ml-2 text-sm font-medium text-white">${value}</label>
                </div>
            `).join('');
        }

        function pickCustomMotionValue(path, defaultValue = '') {
            const segments = path.split('.');
            let locale = translations[currentLang]?.debateCoach?.customMotion;
            let fallback = translations['en']?.debateCoach?.customMotion;
            for (const segment of segments) {
                locale = locale?.[segment];
                fallback = fallback?.[segment];
            }
            const value = locale !== undefined ? locale : fallback;
            return value !== undefined ? value : defaultValue;
        }

        function getCustomMotionData() {
            const title = debateState.customMotionTitle?.trim() || pickCustomMotionValue('fallbackTitle');
            const buildStructure = () => ({
                claim: pickCustomMotionValue('structure.claim'),
                reason: pickCustomMotionValue('structure.reason'),
                evidence: pickCustomMotionValue('structure.evidence'),
                closing: pickCustomMotionValue('structure.closing')
            });
            const buildSide = () => ({
                beginner: { ...buildStructure() },
                advanced: { ...buildStructure() },
                opponentPoints: [...(pickCustomMotionValue('opponentPoints', []) || [])],
                rebuttalFeedback: {
                    summary: pickCustomMotionValue('rebuttal.summary'),
                    tips: [...(pickCustomMotionValue('rebuttal.tips', []) || [])]
                },
                coachFeedback: {
                    score: pickCustomMotionValue('coach.score'),
                    tips: [...(pickCustomMotionValue('coach.tips', []) || [])]
                }
            });
            const moduleNote = pickCustomMotionValue('moduleNote');
            const customNote = moduleNote || pickCustomMotionValue('note');
            return {
                id: 'custom',
                custom: true,
                title: { [currentLang]: title },
                customNote,
                sides: {
                    pro: buildSide(),
                    con: buildSide()
                },
                questions: [...(pickCustomMotionValue('questions', []) || [])]
            };
        }

        function getCurrentMotion() {
            if (debateState.motionId === 'custom') {
                return getCustomMotionData();
            }
            if (!debateMotions.length) return null;
            let motion = debateMotions.find(m => m.id === debateState.motionId);
            if (!motion) {
                motion = debateMotions[0];
                debateState.motionId = motion.id;
            }
            return motion;
        }

        function getDebateContext() {
            const motion = getCurrentMotion();
            if (!motion) return { motion: null, sideData: null, levelData: null };
            let sideData = motion.sides[debateState.side];
            if (!sideData) {
                debateState.side = 'pro';
                sideData = motion.sides[debateState.side];
                if (debateSideSelect) debateSideSelect.value = debateState.side;
            }
            let levelData = sideData?.[debateState.level];
            if (!levelData) {
                debateState.level = 'beginner';
                levelData = sideData?.[debateState.level];
                if (debateLevelSelect) debateLevelSelect.value = debateState.level;
            }
            return { motion, sideData, levelData };
        }

        function populateDebateSelects() {
            if (!debateMotionSelect || !debateSideSelect || !debateLevelSelect) return;
            const motionOptions = debateMotions.map(motion => `
                <option value="${motion.id}">${getLocalizedText(motion.title)}</option>
            `).join('');
            const customOption = `<option value="custom">${getDebateTranslation('customMotion.option')}</option>`;
            debateMotionSelect.innerHTML = motionOptions + customOption;
            if (!debateMotions.some(m => m.id === debateState.motionId) && debateMotions.length) {
                debateState.motionId = debateMotions[0].id;
            }
            debateMotionSelect.value = debateState.motionId;

            debateSideSelect.innerHTML = `
                <option value="pro">${getDebateTranslation('sidePro')}</option>
                <option value="con">${getDebateTranslation('sideCon')}</option>
            `;
            if (!['pro', 'con'].includes(debateState.side)) debateState.side = 'pro';
            debateSideSelect.value = debateState.side;

            debateLevelSelect.innerHTML = `
                <option value="beginner">${getDebateTranslation('levelBeginner')}</option>
                <option value="advanced">${getDebateTranslation('levelAdvanced')}</option>
            `;
            if (!['beginner', 'advanced'].includes(debateState.level)) debateState.level = 'beginner';
            debateLevelSelect.value = debateState.level;
            syncCustomMotionUI();
        }

        function syncCustomMotionUI() {
            if (!debateCustomMotionWrapper) return;
            const isCustom = debateState.motionId === 'custom';
            debateCustomMotionWrapper.classList.toggle('hidden', !isCustom);
            if (isCustom && debateCustomMotionInput) {
                debateCustomMotionInput.value = debateState.customMotionTitle || '';
            }
        }

        
function renderDebateModules() {
    if (!debateModulesContainer) return;
    const { motion, sideData, levelData } = getDebateContext();
    if (!motion || !sideData || !levelData) {
        debateModulesContainer.innerHTML = '';
        return;
    }

    resetModuleStates();

    const structureRows = ['claim', 'reason', 'evidence', 'closing'].map(key => `
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <span class="font-semibold text-yellow-200 md:w-28">${getDebateTranslation('structure.' + key)}</span>
            <p class="text-sm text-indigo-100 leading-relaxed">${getLocalizedText(levelData[key])}</p>
        </div>
    `).join('');

    const opponentList = (sideData.opponentPoints || []).map(point => `
        <li class="p-3 bg-white/5 rounded-lg border border-white/10 text-sm text-indigo-100">${getLocalizedText(point)}</li>
    `).join('');

    const questionsHtml = (motion.questions || []).map((question, index) => {
        const secondary = question?.en && currentLang !== 'en' ? `<span class="text-xs text-indigo-300">${question.en}</span>` : '';
        return `
        <label class="flex items-start gap-2 p-3 rounded-lg bg-white/0 hover:bg-white/10 transition-colors border border-transparent hover:border-white/20">
            <input type="checkbox" class="mt-1 h-4 w-4 rounded border-white/40 bg-transparent text-yellow-300 focus:ring-yellow-400" value="${index}">
            <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                    <span class="badge-chip timer hidden" data-selection-badge>#1</span>
                    <span class="text-sm text-indigo-100">${getLocalizedText(question)}</span>
                </div>
                ${secondary}
            </div>
        </label>`;
    }).join('');

    const customNoteHtml = motion.customNote ? `<div class="rounded-lg border border-dashed border-white/20 bg-white/5 p-3 text-sm text-indigo-200">${getLocalizedText(motion.customNote)}</div>` : '';

    const modulesHtml = `
        ${customNoteHtml}
        ${renderCaseModule(structureRows)}
        ${renderRebuttalModule(opponentList)}
        ${renderCrossfireModule(questionsHtml)}
        ${renderFeedbackModule()}
        ${renderOralModule()}
    `;

    debateModulesContainer.innerHTML = modulesHtml;
    ['case','rebuttal','crossfire','feedback','oral'].forEach(key => resetModuleTimer(key));
    updateMotionDisplay();
}

const debateModuleConfigs = {
    case: { duration: 60, recordLabel: 'buttons.recordStart', hasTimer: true, resultRenderer: renderCaseResults },
    rebuttal: { duration: 60, recordLabel: 'buttons.recordRebuttal', hasTimer: true, resultRenderer: renderRebuttalResults },
    crossfire: { duration: 45, recordLabel: 'buttons.recordCrossfire', hasTimer: true, resultRenderer: renderCrossfireResults },
    feedback: { duration: 60, recordLabel: 'buttons.recordFeedback', hasTimer: false, resultRenderer: renderFeedbackResults },
    oral: { duration: 60, recordLabel: 'buttons.recordOral', hasTimer: false, resultRenderer: renderOralResults }
};

const debateMockApi = {
    translateMotion: ({ motionText, fromLang, to = 'en' }) => {
        return {
            en_text: to === 'en' ? motionText : motionText,
            zh_text: motionText
        };
    },
    startRecording: (moduleKey) => ({ recordingId: `${moduleKey}-${Date.now()}` }),
    stopRecording: () => ({ audioBlob: null }),
    transcribeAudio: () => ({
        transcript: 'Mock transcript generated for practice.',
        timestamps: []
    }),
    evaluateDelivery: ({ transcript }) => ({
        wpm: 110 + Math.floor(Math.random() * 40),
        fillerWords: ['um', 'like', 'you know'].map(word => ({ word, count: Math.floor(Math.random() * 3) })).filter(item => item.count > 0),
        pauseStats: { longPauses: Math.floor(Math.random() * 3) }
    }),
    evaluateLogic: () => ({
        peelMissing: ['Point', 'Evidence', 'Example', 'Link'].filter(() => Math.random() > 0.5),
        suggestions: [
            'Add a concrete statistic to quantify the impact.',
            'Close by explaining why your impact outweighs theirs.'
        ]
    }),
    crossfireAnswerCheck: () => ({
        directness: Math.random() > 0.3,
        conciseRewrite: 'Answer the question in one sentence, then add new offense.'
    }),
    oralReadingCoach: () => ({
        mispronunciations: ['stress the second syllable in "renewable"'],
        pacingAdvice: ['Pause for half a beat before the weighing sentence']
    })
};

const RECORDING_STEPS = ['uploading', 'transcribing', 'evaluating'];

function resetModuleStates() {
    Object.keys(debateState.recording).forEach(key => {
        const state = debateState.recording[key];
        if (state?.timerId) {
            clearTimeout(state.timerId);
        }
        debateState.recording[key] = { status: 'idle' };
        debateState.moduleResults[key] = null;
        stopModuleTimer(key);
    });
}

function renderCaseModule(structureRows) {
    return `
    <div class="border border-white/15 rounded-xl overflow-hidden bg-white/5">
        ${moduleHeader('modules.case60s', 'case', 'debate-module-case')}
        <div id="debate-module-case" class="hidden px-4 py-5 space-y-4 border-t border-white/10">
            ${recordingControls('case', 'buttons.recordStart')}
            ${waveformMarkup('case')}
            <div class="space-y-3">
                <h4 class="font-semibold text-white">${getDebateTranslation('structureHeading')}</h4>
                <div class="space-y-3">
                    ${structureRows}
                </div>
            </div>
            <div>
                <label class="text-sm font-semibold text-white block mb-2">${getDebateTranslation('caseNotesLabel')}</label>
                <textarea rows="3" class="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder:text-indigo-200/60" placeholder="${getDebateTranslation('caseNotesPlaceholder')}"></textarea>
            </div>
            ${progressMarkup('case')}
            ${caseResultMarkup()}
        </div>
    </div>`;
}

function renderRebuttalModule(opponentList) {
    return `
    <div class="border border-white/15 rounded-xl overflow-hidden bg-white/5">
        ${moduleHeader('modules.rebuttal', 'rebuttal', 'debate-module-rebuttal')}
        <div id="debate-module-rebuttal" class="hidden px-4 py-5 space-y-4 border-t border-white/10">
            ${recordingControls('rebuttal', 'buttons.recordRebuttal')}
            ${waveformMarkup('rebuttal')}
            <div>
                <h4 class="font-semibold text-white mb-2">${getDebateTranslation('opponentHeading')}</h4>
                <ul class="space-y-2">${opponentList}</ul>
            </div>
            <div>
                <label class="font-semibold text-white block mb-2">${getDebateTranslation('yourResponse')}</label>
                <textarea rows="4" class="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder:text-indigo-200/60" placeholder="${getDebateTranslation('responsePlaceholder')}"></textarea>
            </div>
            ${progressMarkup('rebuttal')}
            ${rebuttalResultMarkup()}
        </div>
    </div>`;
}

function renderCrossfireModule(questionsHtml) {
    return `
    <div class="border border-white/15 rounded-xl overflow-hidden bg-white/5">
        ${moduleHeader('modules.crossfire', 'crossfire', 'debate-module-crossfire')}
        <div id="debate-module-crossfire" class="hidden px-4 py-5 space-y-4 border-t border-white/10">
            ${recordingControls('crossfire', 'buttons.recordCrossfire')}
            ${waveformMarkup('crossfire')}
            <div>
                <h4 class="font-semibold text-white mb-2">${getDebateTranslation('questionsHeading')}</h4>
                <p class="text-sm text-indigo-200 mb-3">${getDebateTranslation('questionsNote')}</p>
                <div class="grid gap-2">${questionsHtml}</div>
            </div>
            <div>
                <label class="font-semibold text-white block mb-2">${getDebateTranslation('responseHeading')}</label>
                <textarea rows="4" class="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder:text-indigo-200/60" placeholder="${getDebateTranslation('responsePlaceholder')}"></textarea>
            </div>
            ${progressMarkup('crossfire')}
            ${crossfireResultMarkup()}
        </div>
    </div>`;
}

function renderFeedbackModule() {
    const audioLabel = getDebateTranslation('feedbackExtras.audioLabel') || getDebateTranslation('buttons.recordFeedback');
    return `
    <div class="border border-white/15 rounded-xl overflow-hidden bg-white/5">
        ${moduleHeader('modules.feedback', 'feedback', 'debate-module-feedback')}
        <div id="debate-module-feedback" class="hidden px-4 py-5 space-y-4 border-t border-white/10">
            <div class="space-y-3">
                <label class="font-semibold text-white block mb-2">${getDebateTranslation('feedbackPrompt')}</label>
                <textarea id="debate-feedback-text" rows="5" class="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder:text-indigo-200/60" placeholder="${getDebateTranslation('feedbackPlaceholder')}"></textarea>
            </div>
            <div class="space-y-2">
                <p class="text-sm text-indigo-200 font-semibold">${audioLabel}</p>
                <div class="flex flex-wrap gap-3">
                    <button type="button" class="px-4 py-2 rounded-lg bg-rose-400 text-slate-900 font-semibold hover:bg-rose-300" data-debate-action="toggle-recording" data-target="feedback" data-record-label="buttons.recordFeedback">${getDebateTranslation('buttons.recordFeedback')}</button>
                    <label class="px-4 py-2 rounded-lg border border-dashed border-white/30 cursor-pointer hover:border-white/60 text-sm text-indigo-100 flex items-center gap-2">
                        <i class="fa-solid fa-upload"></i>
                        <span>Upload audio</span>
                        <input type="file" id="debate-feedback-audio" accept="audio/*" class="hidden">
                    </label>
                    <button type="button" class="px-4 py-2 rounded-lg bg-sky-400 text-slate-900 font-semibold hover:bg-sky-300" data-debate-action="feedback-text-eval">${getDebateTranslation('buttons.feedbackEvaluate') || getDebateTranslation('feedbackBtn')}</button>
                    <button type="button" class="px-4 py-2 rounded-lg bg-indigo-500/40 border border-indigo-300/40 text-sm text-indigo-100 hover:bg-indigo-500/60" data-debate-action="toggle-reference">${getDebateTranslation('feedbackExtras.referenceToggle')}</button>
                </div>
            </div>
            ${waveformMarkup('feedback')}
            ${progressMarkup('feedback')}
            ${feedbackResultMarkup()}
            <div id="debate-reference-script" class="hidden bg-white/5 border border-dashed border-white/20 rounded-lg p-4">
                <p class="text-sm text-indigo-200 mb-2">${getDebateTranslation('feedbackExtras.referenceHint')}</p>
                <p class="text-sm text-white" data-reference-script></p>
            </div>
        </div>
    </div>`;
}

function renderOralModule() {
    const oral = getDebateTranslation('oral.title') || 'Oral Training';
    return `
    <div class="border border-white/15 rounded-xl overflow-hidden bg-white/5">
        <div class="px-4 py-3 bg-white/10 border-b border-white/10 flex items-center justify-between">
            <div>
                <p class="font-semibold text-white">${oral}</p>
                <p class="text-sm text-indigo-200">${getDebateTranslation('oral.desc')}</p>
            </div>
            <span class="text-indigo-200" title="${getDebateTranslation('tooltips.oral') || ''}"><i class="fa-solid fa-circle-question"></i></span>
        </div>
        <div class="px-4 py-5 space-y-4">
            <textarea id="oral-text-input" rows="4" class="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder:text-indigo-200/60" placeholder="${getDebateTranslation('oral.placeholder')}"></textarea>
            <div class="flex flex-wrap gap-3">
                <button type="button" class="px-4 py-2 rounded-lg bg-pink-400 text-slate-900 font-semibold hover:bg-pink-300" data-debate-action="toggle-recording" data-target="oral" data-record-label="buttons.recordOral">${getDebateTranslation('oral.btnRecord')}</button>
            </div>
            ${waveformMarkup('oral')}
            ${progressMarkup('oral')}
            ${oralResultMarkup()}
        </div>
    </div>`;
}

function moduleHeader(titleKey, tooltipKey, targetId) {
    const tooltip = getDebateTranslation('tooltips.' + tooltipKey) || '';
    return `
    <button type="button" class="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors" data-debate-action="toggle" data-debate-target="${targetId}" aria-expanded="false">
        <div class="flex items-center gap-3 flex-wrap">
            <span>${getDebateTranslation(titleKey)}</span>
            <span class="badge-chip timer">${getDebateTranslation('badges.timer')}</span>
            <span class="badge-chip record">${getDebateTranslation('badges.record')}</span>
        </div>
        <div class="flex items-center gap-3">
            <span class="text-indigo-200" title="${tooltip}"><i class="fa-solid fa-circle-question"></i></span>
            <span data-chevron class="transition-transform duration-200"><i class="fa-solid fa-chevron-down"></i></span>
        </div>
    </button>`;
}

function recordingControls(moduleKey, recordLabelKey) {
    const config = debateModuleConfigs[moduleKey] || { duration: 60, hasTimer: true };
    const timerSection = config.hasTimer ? `
        <span class="text-sm uppercase tracking-wide text-indigo-200">${getDebateTranslation('timerLabel')}</span>
        <span class="text-3xl font-mono text-white" data-timer-display="${moduleKey}">${config.duration}</span>` : '';
    const startLabel = getDebateTranslation('buttons.startTimer') || getDebateTranslation('startTimer');
    const resetLabel = getDebateTranslation('resetTimer');
    const recordLabel = getDebateTranslation(recordLabelKey) || getDebateTranslation('buttons.recordStart');
    return `
    <div class="flex flex-wrap items-center gap-3">
        ${timerSection}
        <div class="flex flex-wrap gap-2">
            ${config.hasTimer ? `<button type="button" class="px-3 py-1 rounded-lg bg-yellow-400 text-slate-900 text-sm font-semibold hover:bg-yellow-300" data-debate-action="start-timer" data-timer="${moduleKey}">${startLabel}</button>` : ''}
            <button type="button" class="px-3 py-1 rounded-lg bg-rose-500/80 text-white text-sm font-semibold hover:bg-rose-400" data-debate-action="toggle-recording" data-target="${moduleKey}" data-record-label="${recordLabelKey}">${recordLabel}</button>
            ${config.hasTimer ? `<button type="button" class="px-3 py-1 rounded-lg bg-slate-700 text-sm hover:bg-slate-600" data-debate-action="reset-timer" data-timer="${moduleKey}">${resetLabel}</button>` : ''}
        </div>
    </div>`;
}

function waveformMarkup(moduleKey) {
    return `
    <div class="waveform-bar hidden" data-waveform="${moduleKey}">
        <span></span><span></span><span></span><span></span>
    </div>`;
}

function progressMarkup(moduleKey) {
    const steps = RECORDING_STEPS.map(step => `<span class="progress-step" data-progress-step="${moduleKey}" data-step="${step}">${getDebateTranslation('statuses.' + step)}</span>`).join('');
    return `
    <div class="hidden space-y-2" data-progress="${moduleKey}">
        <p class="text-xs uppercase tracking-wide text-indigo-200">${getDebateTranslation('progressLabel')}</p>
        <div class="progress-steps">
            ${steps}
        </div>
    </div>`;
}

function caseResultMarkup() {
    return `
    <div class="hidden result-panel-grid" data-result="case">
        <div class="result-panel">
            <h5>${getDebateTranslation('panels.logic')}</h5>
            <div class="text-sm text-indigo-100 space-y-2" data-case-logic></div>
        </div>
        <div class="result-panel">
            <h5>${getDebateTranslation('panels.delivery')}</h5>
            <ul class="text-sm text-indigo-100 space-y-1" data-case-delivery></ul>
        </div>
        <div class="result-panel">
            <h5>${getDebateTranslation('panels.rewrite')}</h5>
            <p class="text-sm text-indigo-100" data-case-rewrite></p>
        </div>
    </div>
    ${resultPlaceholderMarkup('case')}`;
}

function rebuttalResultMarkup() {
    return `
    <div class="hidden result-panel-grid" data-result="rebuttal">
        <div class="result-panel">
            <h5>${getDebateTranslation('rebuttalResult.effectiveness')}</h5>
            <p class="text-sm text-indigo-100" data-rebuttal-effectiveness></p>
        </div>
        <div class="result-panel">
            <h5>${getDebateTranslation('rebuttalResult.directness')}</h5>
            <p class="text-3xl font-mono text-white" data-rebuttal-directness>0%</p>
        </div>
        <div class="result-panel">
            <h5>${getDebateTranslation('rebuttalResult.weighing')}</h5>
            <p class="text-sm text-indigo-100" data-rebuttal-weighing></p>
        </div>
    </div>
    ${resultPlaceholderMarkup('rebuttal')}`;
}

function crossfireResultMarkup() {
    return `
    <div class="hidden result-panel-grid" data-result="crossfire">
        <div class="result-panel">
            <h5>${getDebateTranslation('crossfireResult.directness')}</h5>
            <p class="text-sm text-indigo-100" data-crossfire-direct></p>
        </div>
        <div class="result-panel">
            <h5>${getDebateTranslation('crossfireResult.followup')}</h5>
            <ul class="text-sm text-indigo-100 space-y-1" data-crossfire-followup></ul>
        </div>
        <div class="result-panel">
            <h5>${getDebateTranslation('crossfireResult.language')}</h5>
            <ul class="text-sm text-indigo-100 space-y-1" data-crossfire-language></ul>
        </div>
    </div>
    ${resultPlaceholderMarkup('crossfire')}`;
}

function feedbackResultMarkup() {
    return `
    <div class="hidden space-y-4" data-result="feedback">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3" data-feedback-scores></div>
        <div class="result-panel-grid">
            <div class="result-panel">
                <h5>${getDebateTranslation('panels.delivery')}</h5>
                <ul class="text-sm text-indigo-100 space-y-1" data-feedback-delivery></ul>
            </div>
            <div class="result-panel">
                <h5>${getDebateTranslation('panels.rewrite')}</h5>
                <p class="text-sm text-indigo-100" data-feedback-summary></p>
            </div>
        </div>
    </div>
    ${resultPlaceholderMarkup('feedback')}`;
}

function oralResultMarkup() {
    return `
    <div class="hidden result-panel-grid" data-result="oral">
        <div class="result-panel">
            <h5>${getDebateTranslation('oral.resultPronunciation')}</h5>
            <ul class="text-sm text-indigo-100 space-y-1" data-oral-pronunciation></ul>
        </div>
        <div class="result-panel">
            <h5>${getDebateTranslation('oral.resultPacing')}</h5>
            <ul class="text-sm text-indigo-100 space-y-1" data-oral-pacing></ul>
        </div>
    </div>
    ${resultPlaceholderMarkup('oral')}`;
}

function resultPlaceholderMarkup(moduleKey) {
    return `<p class="text-sm text-indigo-300" data-result-placeholder="${moduleKey}">${getDebateTranslation('resultPlaceholder')}</p>`;
}

function getModuleConfig(moduleKey) {
    return debateModuleConfigs[moduleKey] || { duration: 60, hasTimer: true };
}

function ensureTimerState(moduleKey) {
    if (!debateState.timers[moduleKey]) {
        debateState.timers[moduleKey] = { remaining: getModuleConfig(moduleKey).duration, interval: null };
    }
    return debateState.timers[moduleKey];
}

function resetModuleTimer(moduleKey) {
    const state = ensureTimerState(moduleKey);
    stopModuleTimer(moduleKey);
    state.remaining = getModuleConfig(moduleKey).duration;
    updateModuleTimerDisplay(moduleKey);
}

function startModuleTimer(moduleKey) {
    const config = getModuleConfig(moduleKey);
    if (!config.hasTimer) return;
    const state = ensureTimerState(moduleKey);
    stopModuleTimer(moduleKey);
    updateModuleTimerDisplay(moduleKey);
    state.interval = setInterval(() => {
        state.remaining -= 1;
        updateModuleTimerDisplay(moduleKey);
        if (state.remaining <= 0) {
            stopModuleTimer(moduleKey);
            state.remaining = 0;
            updateModuleTimerDisplay(moduleKey);
            handleTimerComplete(moduleKey);
        }
    }, 1000);
}

function stopModuleTimer(moduleKey) {
    const state = debateState.timers[moduleKey];
    if (state?.interval) {
        clearInterval(state.interval);
        state.interval = null;
    }
}

function updateModuleTimerDisplay(moduleKey) {
    const displayEl = debateModulesContainer?.querySelector(`[data-timer-display="${moduleKey}"]`);
    if (!displayEl) return;
    const state = ensureTimerState(moduleKey);
    displayEl.textContent = Math.max(0, state.remaining).toString().padStart(2, '0');
    displayEl.classList.toggle('timer-flash', state.remaining <= 10);
}

function handleTimerComplete(moduleKey) {
    const recording = debateState.recording[moduleKey];
    if (recording?.status === 'recording') {
        completeRecordingSession(moduleKey);
    }
}

function getRecordingButton(moduleKey) {
    return debateModulesContainer?.querySelector(`[data-debate-action="toggle-recording"][data-target="${moduleKey}"]`);
}

function setRecordingButtonState(button, isRecording) {
    if (!button) return;
    const labelKey = button.dataset.recordLabel || 'buttons.recordStart';
    const startLabel = getDebateTranslation(labelKey) || button.textContent;
    button.textContent = isRecording ? (getDebateTranslation('buttons.stopRecording') || 'Stop Recording') : startLabel;
}

function setWaveformVisible(moduleKey, show) {
    const waveform = debateModulesContainer?.querySelector(`[data-waveform="${moduleKey}"]`);
    if (!waveform) return;
    waveform.classList.toggle('hidden', !show);
}

function showProgress(moduleKey, show) {
    const progress = debateModulesContainer?.querySelector(`[data-progress="${moduleKey}"]`);
    if (!progress) return;
    progress.classList.toggle('hidden', !show);
    if (!show) {
        progress.querySelectorAll('.progress-step').forEach(step => step.classList.remove('active'));
    }
}

function setProgressStep(moduleKey, step) {
    debateModulesContainer?.querySelectorAll(`[data-progress-step="${moduleKey}"]`)?.forEach(el => {
        el.classList.toggle('active', el.dataset.step === step);
    });
}

function toggleRecording(moduleKey) {
    const state = debateState.recording[moduleKey] || { status: 'idle' };
    if (state.status === 'processing') return;
    if (state.status === 'recording') {
        completeRecordingSession(moduleKey);
    } else {
        startRecordingSession(moduleKey);
    }
}

function startRecordingSession(moduleKey) {
    debateState.recording[moduleKey] = { status: 'recording' };
    debateMockApi.startRecording(moduleKey);
    setRecordingButtonState(getRecordingButton(moduleKey), true);
    setWaveformVisible(moduleKey, true);
    const config = getModuleConfig(moduleKey);
    if (config.hasTimer) {
        resetModuleTimer(moduleKey);
        startModuleTimer(moduleKey);
    }
    const placeholder = debateModulesContainer?.querySelector(`[data-result-placeholder="${moduleKey}"]`);
    if (placeholder) placeholder.classList.remove('hidden');
    const resultPanel = debateModulesContainer?.querySelector(`[data-result="${moduleKey}"]`);
    if (resultPanel) resultPanel.classList.add('hidden');
}

function completeRecordingSession(moduleKey) {
    const state = debateState.recording[moduleKey];
    if (!state || state.status !== 'recording') return;
    debateState.recording[moduleKey] = { status: 'processing' };
    debateMockApi.stopRecording(moduleKey);
    stopModuleTimer(moduleKey);
    setWaveformVisible(moduleKey, false);
    showProgress(moduleKey, true);
    runMockPipeline(moduleKey);
}

function runMockPipeline(moduleKey) {
    let index = 0;
    const advance = () => {
        if (index >= RECORDING_STEPS.length) {
            finalizeRecording(moduleKey);
            return;
        }
        const step = RECORDING_STEPS[index++];
        setProgressStep(moduleKey, step);
        setTimeout(advance, 600);
    };
    advance();
}

function finalizeRecording(moduleKey) {
    const renderer = debateModuleConfigs[moduleKey]?.resultRenderer;
    const mockResult = buildMockResult(moduleKey);
    if (typeof renderer === 'function') renderer(mockResult);
    showProgress(moduleKey, false);
    setRecordingButtonState(getRecordingButton(moduleKey), false);
    debateState.recording[moduleKey] = { status: 'idle' };
}

function buildMockResult(moduleKey) {
    const transcriptPool = [
        'Students deserve rest so evenings can spark curiosity again.',
        'Limiting homework boosts emotional health and deepens family connection.',
        'Great debate speeches balance logic, impact, and pacing.'
    ];
    const transcript = transcriptPool[Math.floor(Math.random() * transcriptPool.length)];
    const deliveryEval = debateMockApi.evaluateDelivery({ transcript });
    const delivery = {
        wpm: deliveryEval.wpm,
        fillers: deliveryEval.fillerWords || [],
        pauses: deliveryEval.pauseStats?.longPauses ?? 0
    };
    if (moduleKey === 'case') {
        const logicEval = debateMockApi.evaluateLogic({ structuredText: transcript });
        return {
            logic: {
                peelMissing: logicEval.peelMissing || [],
                suggestions: logicEval.suggestions || []
            },
            delivery,
            rewrite: 'Even if homework seems productive, the marginal gains vanish once kids are exhausted. Let class time drill depth; give evenings back for rest, curiosity, and conversations that build empathy.'
        };
    }
    if (moduleKey === 'rebuttal') {
        return {
            effectiveness: 'You targeted the premise but can tighten the weighing between wellbeing and rigor.',
            directness: 60 + Math.floor(Math.random() * 35),
            weighing: 'Even if practice packets sound efficient, our side still wins because rested minds absorb more per minute.'
        };
    }
    if (moduleKey === 'crossfire') {
        const check = debateMockApi.crossfireAnswerCheck({ answer: transcript });
        return {
            directness: check.directness,
            followups: [
                'If homework builds grit, how do you measure that without ignoring mental health?',
                'What evidence shows your plan protects low-income students with less support at home?'
            ],
            languageIssues: ['Answer drifted into new arguments', 'No clear conclusion sentence']
        };
    }
    if (moduleKey === 'feedback') {
        return {
            scores: [
                { label: getDebateTranslation('rubric.content'), value: 8 },
                { label: getDebateTranslation('rubric.refutation'), value: 7 },
                { label: getDebateTranslation('rubric.delivery'), value: 7 },
                { label: getDebateTranslation('rubric.strategy'), value: 6 }
            ],
            delivery,
            summary: 'Strengthen the opening hook and spend two lines proving why your weighing framework matters.',
            referenceScript: 'This house would reduce homework so students regain rest, creativity, and real conversations at home. First, chronic fatigue destroys curiosity...'
        };
    }
    if (moduleKey === 'oral') {
        const oralEval = debateMockApi.oralReadingCoach({ text: transcript });
        return {
            pronunciation: oralEval.mispronunciations || [],
            pacing: oralEval.pacingAdvice || []
        };
    }
    return { delivery };
}

function renderCaseResults(result) {
    const container = debateModulesContainer?.querySelector('[data-result="case"]');
    if (!container) return;
    container.classList.remove('hidden');
    const logicEl = container.querySelector('[data-case-logic]');
    const deliveryEl = container.querySelector('[data-case-delivery]');
    const rewriteEl = container.querySelector('[data-case-rewrite]');
    if (logicEl) {
        const missing = result.logic.peelMissing.length ? `<p class="text-sm text-amber-200">${result.logic.peelMissing.join(', ')}</p>` : '';
        const tips = result.logic.suggestions.map(tip => `<li>${tip}</li>`).join('');
        logicEl.innerHTML = `${missing}${tips ? `<ul class="list-disc list-inside space-y-1">${tips}</ul>` : ''}`;
    }
    if (deliveryEl) {
        const metrics = [
            `${getDebateTranslation('metrics.wpm')}: ${result.delivery.wpm}`,
            `${getDebateTranslation('metrics.fillers')}: ${result.delivery.fillers.map(f => `${f.word}(${f.count})`).join(', ') || '0'}`,
            `${getDebateTranslation('metrics.pauses')}: ${result.delivery.pauses}`
        ];
        deliveryEl.innerHTML = metrics.map(item => `<li>${item}</li>`).join('');
    }
    if (rewriteEl) {
        rewriteEl.textContent = result.rewrite;
    }
    const placeholder = debateModulesContainer?.querySelector('[data-result-placeholder="case"]');
    if (placeholder) placeholder.classList.add('hidden');
}

function renderRebuttalResults(result) {
    const container = debateModulesContainer?.querySelector('[data-result="rebuttal"]');
    if (!container) return;
    container.classList.remove('hidden');
    const effEl = container.querySelector('[data-rebuttal-effectiveness]');
    if (effEl) effEl.textContent = result.effectiveness;
    const directEl = container.querySelector('[data-rebuttal-directness]');
    if (directEl) directEl.textContent = `${result.directness}%`;
    const weighEl = container.querySelector('[data-rebuttal-weighing]');
    if (weighEl) weighEl.textContent = result.weighing;
    const placeholder = debateModulesContainer?.querySelector('[data-result-placeholder="rebuttal"]');
    if (placeholder) placeholder.classList.add('hidden');
}

function renderCrossfireResults(result) {
    const container = debateModulesContainer?.querySelector('[data-result="crossfire"]');
    if (!container) return;
    container.classList.remove('hidden');
    const directEl = container.querySelector('[data-crossfire-direct]');
    if (directEl) directEl.textContent = result.directness ? '✅ Direct answer' : '⚠️ Needs tighter answer';
    const followEl = container.querySelector('[data-crossfire-followup]');
    if (followEl) followEl.innerHTML = result.followups.map(item => `<li>${item}</li>`).join('');
    const langEl = container.querySelector('[data-crossfire-language]');
    if (langEl) langEl.innerHTML = result.languageIssues.map(item => `<li>${item}</li>`).join('');
    const placeholder = debateModulesContainer?.querySelector('[data-result-placeholder="crossfire"]');
    if (placeholder) placeholder.classList.add('hidden');
}

function renderFeedbackResults(result) {
    const container = debateModulesContainer?.querySelector('[data-result="feedback"]');
    if (!container) return;
    container.classList.remove('hidden');
    const scoresEl = container.querySelector('[data-feedback-scores]');
    if (scoresEl) {
        scoresEl.innerHTML = result.scores.map(score => `
        <div class="bg-white/10 rounded-lg p-2 text-center">
            <p class="text-xs uppercase tracking-wide text-indigo-200">${score.label}</p>
            <p class="text-2xl font-semibold text-white">${score.value}/10</p>
        </div>`).join('');
    }
    const deliveryEl = container.querySelector('[data-feedback-delivery]');
    if (deliveryEl) {
        deliveryEl.innerHTML = [
        `${getDebateTranslation('metrics.wpm')}: ${result.delivery.wpm}`,
        `${getDebateTranslation('metrics.fillers')}: ${result.delivery.fillers.map(f => `${f.word}(${f.count})`).join(', ') || '0'}`,
        `${getDebateTranslation('metrics.pauses')}: ${result.delivery.pauses}`
        ].map(item => `<li>${item}</li>`).join('');
    }
    const summaryEl = container.querySelector('[data-feedback-summary]');
    if (summaryEl) summaryEl.textContent = result.summary;
    const placeholder = debateModulesContainer?.querySelector('[data-result-placeholder="feedback"]');
    if (placeholder) placeholder.classList.add('hidden');
    const reference = document.getElementById('debate-reference-script');
    if (reference) {
        const scriptEl = reference.querySelector('[data-reference-script]');
        if (scriptEl) scriptEl.textContent = result.referenceScript;
    }
}

function renderOralResults(result) {
    const container = debateModulesContainer?.querySelector('[data-result="oral"]');
    if (!container) return;
    container.classList.remove('hidden');
    const pronEl = container.querySelector('[data-oral-pronunciation]');
    if (pronEl) pronEl.innerHTML = result.pronunciation.map(item => `<li>${item}</li>`).join('');
    const pacingEl = container.querySelector('[data-oral-pacing]');
    if (pacingEl) pacingEl.innerHTML = result.pacing.map(item => `<li>${item}</li>`).join('');
    const placeholder = debateModulesContainer?.querySelector('[data-result-placeholder="oral"]');
    if (placeholder) placeholder.classList.add('hidden');
}

function handleFeedbackTextEvaluation() {
    debateState.recording.feedback = { status: 'processing' };
    showProgress('feedback', true);
    runMockPipeline('feedback');
}

function toggleReferenceScript() {
    const panel = document.getElementById('debate-reference-script');
    if (!panel) return;
    panel.classList.toggle('hidden');
}

function updateMotionDisplay() {
    const motion = getCurrentMotion();
    const primary = document.querySelector('[data-motion-primary]');
    const secondary = document.querySelector('[data-motion-secondary]');
    if (!motion || !primary) return;
    const translation = debateMockApi.translateMotion({
        motionText: getLocalizedText(motion.title),
        fromLang: currentLang,
        to: 'en'
    });
    primary.textContent = translation.zh_text || getLocalizedText(motion.title);
    if (secondary) {
        secondary.textContent = translation.en_text || motion.title?.en || '';
        secondary.classList.toggle('hidden', !debateState.showBilingualMotion || !motion.title?.en);
    }
    const toggleBtn = document.getElementById('debate-toggle-bilingual');
    if (toggleBtn) {
        toggleBtn.classList.toggle('bg-white/30', debateState.showBilingualMotion);
    }
}

function toggleMotionLanguage() {
    debateState.showBilingualMotion = !debateState.showBilingualMotion;
    updateMotionDisplay();
}

function updateCrossfireSelections() {
    const container = debateModulesContainer?.querySelector('#debate-module-crossfire');
    if (!container) return;
    let order = 1;
    container.querySelectorAll('label').forEach(label => {
        const badge = label.querySelector('[data-selection-badge]');
        const input = label.querySelector('input[type="checkbox"]');
        if (!badge || !input) return;
        if (input.checked && order <= 3) {
            badge.textContent = `#${order++}`;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    });
}

document.addEventListener('click', (event) => {
    const downloadBtn = event.target.closest('.download-audio-btn');
    if (downloadBtn) {
        event.preventDefault();
        triggerAudioDownload(downloadBtn);
    }
});

    function handleDebateOptionChange(event) {
        const { id, value } = event.target;
        if (id === 'debate-motion') {
            debateState.motionId = value;
            syncCustomMotionUI();
            if (value === 'custom' && debateCustomMotionInput) {
                requestAnimationFrame(() => debateCustomMotionInput.focus());
            }
        } else if (id === 'debate-side') {
            debateState.side = value;
        } else if (id === 'debate-level') {
            debateState.level = value;
        }
        renderDebateModules();
    }

    function handleDebateClick(event) {
        const actionEl = event.target.closest('[data-debate-action]');
        if (!actionEl) return;
        const action = actionEl.dataset.debateAction;
        if (action === 'toggle') {
            const targetId = actionEl.dataset.debateTarget;
            const body = targetId ? debateModulesContainer.querySelector(`#${targetId}`) : null;
            const chevron = actionEl.querySelector('[data-chevron]');
            if (body) {
                const willOpen = body.classList.contains('hidden');
                body.classList.toggle('hidden');
                actionEl.setAttribute('aria-expanded', String(willOpen));
                if (chevron) {
                    chevron.classList.toggle('rotate-180', willOpen);
                }
            }
            return;
        }
        if (action === 'start-timer') {
            const target = actionEl.dataset.timer;
            if (target) startModuleTimer(target);
            return;
        }
        if (action === 'reset-timer') {
            const target = actionEl.dataset.timer;
            if (target) resetModuleTimer(target);
            return;
        }
        if (action === 'toggle-recording') {
            const target = actionEl.dataset.target;
            if (target) toggleRecording(target);
            return;
        }
        if (action === 'feedback-text-eval') {
            handleFeedbackTextEvaluation();
            return;
        }
        if (action === 'toggle-reference') {
            toggleReferenceScript();
            return;
        }
    }

    function handleDebateCheckboxLimit(event) {
        const target = event.target;
        if (target?.id === 'debate-feedback-audio' && target.files?.length) {
            handleFeedbackTextEvaluation();
            target.value = '';
            return;
        }
        if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;
        if (target.closest('#debate-module-crossfire')) {
            const checked = debateModulesContainer.querySelectorAll('#debate-module-crossfire input[type="checkbox"]:checked');
            if (checked.length > 3) {
                target.checked = false;
            }
            updateCrossfireSelections();
        }
    }
        
        function setupFileHandling(dropZoneEl, inputEl, previewImgEl, placeholderEl, fileNameDisplayEl, buttonToEnable, fileStateSetter, options = {}) {
            const {
                multiple = false,
                maxFiles = 1,
                acceptPrefix = null,
                onFilesProcessed = null
            } = options;

            if (inputEl && multiple) {
                inputEl.multiple = true;
            }

            const clearPreview = () => {
                if (previewImgEl) {
                    previewImgEl.src = '';
                    previewImgEl.classList.add('hidden');
                }
                if (placeholderEl) placeholderEl.classList.remove('hidden');
                if (fileNameDisplayEl) {
                    const keyPath = fileNameDisplayEl.dataset.translateKey;
                    if (keyPath) {
                        const keys = keyPath.split('.');
                        let translation = translations[currentLang];
                        for (const k of keys) {
                            translation = translation?.[k];
                        }
                        fileNameDisplayEl.textContent = typeof translation === 'string' ? translation : '';
                    } else {
                        fileNameDisplayEl.textContent = '';
                    }
                }
                if (buttonToEnable) buttonToEnable.disabled = true;
            };

            const filterFiles = (fileList) => {
                const files = Array.from(fileList || []);
                if (!acceptPrefix) return files;
                return files.filter(file => file.type && file.type.startsWith(acceptPrefix));
            };

            const processSingleFile = (file) => {
                const processed = handleFileSelection(file, previewImgEl, placeholderEl, fileNameDisplayEl, buttonToEnable);
                fileStateSetter(processed);
                if (onFilesProcessed) onFilesProcessed(processed ? [processed] : []);
            };

            const processMultipleFiles = (fileList) => {
                const filtered = filterFiles(fileList);
                if (!filtered.length) {
                    fileStateSetter([]);
                    clearPreview();
                    if (onFilesProcessed) onFilesProcessed([]);
                    return;
                }
                const limited = filtered.slice(0, maxFiles);
                if (previewImgEl) {
                    const firstFile = limited[0];
                    if (firstFile && firstFile.type && firstFile.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            previewImgEl.src = event.target.result;
                            previewImgEl.classList.remove('hidden');
                        };
                        reader.readAsDataURL(firstFile);
                        if (placeholderEl) placeholderEl.classList.add('hidden');
                    } else {
                        previewImgEl.src = '';
                        previewImgEl.classList.add('hidden');
                        if (placeholderEl) placeholderEl.classList.remove('hidden');
                    }
                } else if (placeholderEl) {
                    placeholderEl.classList.add('hidden');
                }
                if (fileNameDisplayEl) fileNameDisplayEl.textContent = limited.map(file => file.name).join(', ');
                if (buttonToEnable) buttonToEnable.disabled = false;
                fileStateSetter(limited);
                if (onFilesProcessed) onFilesProcessed(limited);
            };

            const handleFiles = (fileList) => {
                if (multiple) {
                    processMultipleFiles(fileList);
                } else {
                    const filtered = filterFiles(fileList);
                    const file = filtered.length ? filtered[0] : null;
                    if (file) {
                        processSingleFile(file);
                    } else {
                        fileStateSetter(null);
                        clearPreview();
                        if (onFilesProcessed) onFilesProcessed([]);
                    }
                }
            };

            if (!dropZoneEl) return;

            dropZoneEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZoneEl.classList.add('dragover');
            });
            dropZoneEl.addEventListener('dragleave', () => dropZoneEl.classList.remove('dragover'));
            dropZoneEl.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZoneEl.classList.remove('dragover');
                if (e.dataTransfer && e.dataTransfer.files) {
                    handleFiles(e.dataTransfer.files);
                }
            });

            if (inputEl) {
                dropZoneEl.addEventListener('click', () => inputEl.click());
                inputEl.addEventListener('change', () => {
                    handleFiles(inputEl.files);
                });
            }
        }
        
        function checkChatButtonStatus(inputEl, expertGroup, buttonEl) {
            const text = inputEl.value.trim();
            const expertSelected = expertGroup.querySelector('.expert-card.selected');
            buttonEl.disabled = !(text && expertSelected);
        }

        async function handleLessonEvents(e) {
            const langTabBtn = e.target.closest('.lesson-lang-btn');
            if (langTabBtn) {
                const lang = langTabBtn.dataset.lang;
                document.getElementById('lesson-explanation').textContent = currentLesson.explanation[lang];
                // Update vocabulary and phrases based on new lang
                const vocabList = document.getElementById('vocabulary-list');
                const phrasesList = document.getElementById('phrases-list');
                if (vocabList) vocabList.innerHTML = createVocabularyHtmlForLang(lang);
                if (phrasesList) phrasesList.innerHTML = createPhrasesHtmlForLang(lang);
                // Update active tab
                lessonContainer.querySelectorAll('.lesson-lang-btn').forEach(btn => btn.classList.remove('active'));
                langTabBtn.classList.add('active');
                return;
            }

            const genAudioBtn = e.target.closest('.generate-explanation-audio-btn');
            if (genAudioBtn) {
                const lang = genAudioBtn.dataset.lang;
                const voiceType = genAudioBtn.dataset.voice || 'default';
                const text = currentLesson.explanation[lang];
                if (!text) return;
                
                errorMessage.classList.add('hidden'); // Clear previous errors
                setLoading(genAudioBtn, true);
                try {
                    const speechProfile = getLessonSpeechProfile(lang);
                    let audioBlob;
                    if (voiceType === 'dialogue') {
                        audioBlob = await generateDialogueAudio(text, lang);
                    } else {
                        const voiceName = voiceProfiles[voiceType] || voiceProfiles.default;
                        audioBlob = await callTTSAPI(text, null, { speechProfile, voiceName });
                    }
                    const blobKey = `${lang}-${voiceType}`;
                    explanationAudioBlobs[blobKey] = audioBlob;
                    
                    const playerContainer = document.getElementById(`audio-player-${lang}-${voiceType}`);
                    const audioEl = playerContainer.querySelector('audio');
                    const downloadLink = playerContainer.querySelector('.download-link');
                    
                    const audioUrl = URL.createObjectURL(audioBlob);
                    audioEl.src = audioUrl;
                    applyPlaybackRate(audioEl, speechProfile);
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
                    displayError(errorMessage, `Audio generation for ${lang} failed: ${error.message}`);
                } finally {
                    setLoading(genAudioBtn, false);
                }
                return;
            }
            
            const playBtn = e.target.closest('.play-audio-btn');
            if (playBtn) {
                playAudio(e);
            }
        }

        function handleFollowUpClick(e, isDoctor) {
            const suggestedBtn = e.target.closest('.suggested-question-btn');
            if (suggestedBtn) {
                getAdviceOrDiagnosis(isDoctor, suggestedBtn.textContent);
                return;
            }

            const sendBtn = e.target.closest('.send-follow-up-btn');
            if (sendBtn) {
                const input = sendBtn.previousElementSibling;
                if (input && input.value.trim()) {
                    getAdviceOrDiagnosis(isDoctor, input.value.trim());
                }
                return;
            }
        }

        // --- Initialization ---
        function init() {
            mainNav.addEventListener('click', handleNavClick);
            languageSwitcher.addEventListener('change', (e) => setLanguage(e.target.value));
            
            generateLessonBtn.addEventListener('click', generateLesson);
            subjectGroup.addEventListener('change', (e) => {
                if(e.target.name === 'subject') {
                    updateTopicSelection(e.target.value);
                    if (customTopicInput) customTopicInput.value = '';
                    updateCustomTopicUI();
                }
            });
            lessonContainer.addEventListener('click', handleLessonEvents);
            closeModalBtn.addEventListener('click', () => {
                imageModal.classList.add('hidden');
                imageModal.classList.remove('flex');
            });
            
            startUploadBtn.addEventListener('click', () => {
                tutoringInitialView.classList.add('hidden');
                tutoringUploadView.classList.remove('hidden');
                tutoringFiles = [];
                if (homeworkFileInput) homeworkFileInput.value = '';
                if (fileNameDisplay) fileNameDisplay.textContent = translations[currentLang]?.tutoring?.noFileSelected || translations['en']?.tutoring?.noFileSelected || 'No file selected';
                updateTutoringSummary(0);
                analyzeHomeworkBtn.disabled = true;
            });
            setupFileHandling(
                fileDropZone,
                homeworkFileInput,
                null,
                null,
                fileNameDisplay,
                analyzeHomeworkBtn,
                (files) => tutoringFiles = files,
                {
                    multiple: true,
                    maxFiles: 10,
                    acceptPrefix: null,
                    onFilesProcessed: (files) => {
                        updateTutoringSummary(files.length);
                        analyzeHomeworkBtn.disabled = files.length === 0;
                    }
                }
            );
            tutoringSubjectSelect.addEventListener('change', (e) => {
                 const otherValues = ['Other', '其他', 'Khác', 'その他'];
                 tutoringCustomSubjectWrapper.classList.toggle('hidden', !otherValues.includes(e.target.value));
            });
            analyzeHomeworkBtn.addEventListener('click', analyzeHomework);
            tutoringResultsView.addEventListener('click', (e) => playAudio(e)); // Event delegation for tutoring audio

            topicSelect.addEventListener('change', () => {
                updateCustomTopicUI();
                if (topicSelect.value !== '__custom__') {
                    if (customTopicInput && !customTopicInput.value.trim()) {
                        syncCustomTopicOptionLabel();
                    }
                } else if (customTopicInput) {
                    customTopicInput.focus();
                }
            });
            if (customTopicInput) {
                customTopicInput.addEventListener('input', () => {
                    if (topicSelect.value === '__custom__') {
                        syncCustomTopicOptionLabel();
                    }
                });
            }

            startStorybookBtn.addEventListener('click', () => {
                storybookInitialView.classList.add('hidden');
                storybookMainView.classList.remove('hidden');
                storybookFiles = [];
                if (storybookFileInput) storybookFileInput.value = '';
                if (storybookPreviewImg) {
                    storybookPreviewImg.src = '';
                    storybookPreviewImg.classList.add('hidden');
                }
                if (storybookUploadPlaceholder) storybookUploadPlaceholder.classList.remove('hidden');
                updateStorybookSummary(0);
                if (generateStoryBtn) generateStoryBtn.disabled = true;
            });
            setupFileHandling(
                storybookFileDropZone,
                storybookFileInput,
                storybookPreviewImg,
                storybookUploadPlaceholder,
                null,
                generateStoryBtn,
                (files) => storybookFiles = files,
                {
                    multiple: true,
                    maxFiles: 10,
                    acceptPrefix: 'image/',
                    onFilesProcessed: (files) => {
                        updateStorybookSummary(files.length);
                        generateStoryBtn.disabled = files.length === 0;
                    }
                }
            );
            generateStoryBtn.addEventListener('click', generateStory);
            playStoryBtn.addEventListener('click', () => {
                if (storyAudioUrl) new Audio(storyAudioUrl).play();
            });
            downloadAudioBtn.addEventListener('click', () => {
                if(storyAudioBlob) {
                    const url = URL.createObjectURL(storyAudioBlob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = 'story.wav';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                }
            });

            aiTutorExpertGroup.addEventListener('click', (e) => {
                const card = e.target.closest('.expert-card');
                if (card) {
                    aiTutorExpertGroup.querySelectorAll('.expert-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    checkChatButtonStatus(aiTutorInput, aiTutorExpertGroup, getAdviceBtn);
                }
            });
            aiTutorInput.addEventListener('input', () => checkChatButtonStatus(aiTutorInput, aiTutorExpertGroup, getAdviceBtn));
            getAdviceBtn.addEventListener('click', () => getAdviceOrDiagnosis(false));
            aiTutorResponseContainer.addEventListener('click', (e) => handleFollowUpClick(e, false));
            
            setupFileHandling(
                aiDoctorFileDropZone,
                aiDoctorFileInput,
                aiDoctorPreviewImg,
                aiDoctorUploadPlaceholder,
                null,
                null,
                (files) => aiDoctorFiles = files,
                {
                    multiple: true,
                    maxFiles: 10,
                    acceptPrefix: 'image/',
                    onFilesProcessed: (files) => updateDoctorSummary(files.length)
                }
            );
            aiDoctorExpertGroup.addEventListener('click', (e) => {
                const card = e.target.closest('.expert-card');
                if (card) {
                    aiDoctorExpertGroup.querySelectorAll('.expert-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    checkChatButtonStatus(aiDoctorInput, aiDoctorExpertGroup, getDiagnosisBtn);
                }
            });
            aiDoctorInput.addEventListener('input', () => checkChatButtonStatus(aiDoctorInput, aiDoctorExpertGroup, getDiagnosisBtn));
            getDiagnosisBtn.addEventListener('click', () => getAdviceOrDiagnosis(true));
            aiDoctorResponseContainer.addEventListener('click', (e) => handleFollowUpClick(e, true));

            if (debateMotionSelect && debateSideSelect && debateLevelSelect) {
                debateMotionSelect.addEventListener('change', handleDebateOptionChange);
                debateSideSelect.addEventListener('change', handleDebateOptionChange);
                debateLevelSelect.addEventListener('change', handleDebateOptionChange);
            }
            if (debateModulesContainer) {
                debateModulesContainer.addEventListener('click', handleDebateClick);
                debateModulesContainer.addEventListener('change', handleDebateCheckboxLimit);
            }
            if (debateToggleBilingualBtn) {
                debateToggleBilingualBtn.addEventListener('click', toggleMotionLanguage);
            }
            if (debateCustomMotionInput) {
                debateCustomMotionInput.addEventListener('input', (e) => {
                    debateState.customMotionTitle = e.target.value;
                    if (debateState.motionId === 'custom') {
                        renderDebateModules();
                    }
                });
            }

            setLanguage(currentLang);
            switchView('platform-view');
        }

        init();
    });
    
