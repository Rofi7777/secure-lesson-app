window.App = window.App || {};

App.translations = {
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
        },
        login: {
            welcomeBack: '歡迎回來！',
            email: '電子郵件',
            emailPlaceholder: 'your@email.com',
            password: '密碼',
            passwordPlaceholder: '••••••••',
            loginBtn: '登入',
            noAccount: '還沒有帳號？',
            registerNow: '立即註冊',
            featureMultilingual: '多語言',
            featureAI: 'AI 驅動',
            featurePersonalized: '個人化'
        },
        signup: {
            joinUs: '加入我們',
            startJourney: '開始您的 AI 學習之旅',
            signupDesc: '註冊帳號，立即體驗多樣化的 AI 學習功能',
            email: '電子郵件',
            emailPlaceholder: 'your@email.com',
            password: '密碼',
            passwordPlaceholder: '至少6個字元',
            passwordHint: '密碼長度至少需要 6 個字元',
            signupBtn: '建立帳號',
            haveAccount: '已有帳號？',
            backToLogin: '返回登入',
            benefitsTitle: '註冊即可享受：',
            benefitMultilingual: '多語言學習',
            benefitAITutor: 'AI 助教',
            benefitTutoring: '作業輔導',
            benefitStorybook: '繪本朗讀'
        },
        myLearning: {
            title: '我的學習',
            subtitle: '查看您的學習進度、歷史記錄和收藏',
            loading: '載入中...',
            stats: {
                lessons: '課程',
                stories: '故事',
                tutoring: '作業輔導',
                favorites: '收藏'
            },
            tab: {
                lessons: '課程記錄',
                stories: '故事記錄',
                tutoring: '作業輔導',
                favorites: '我的收藏'
            },
            noLessons: '還沒有課程記錄',
            noStories: '還沒有故事記錄',
            noTutoring: '還沒有作業輔導記錄',
            noFavorites: '還沒有收藏',
            viewDetails: '查看詳情',
            delete: '刪除',
            favorite: '收藏',
            unfavorite: '取消收藏',
            createdOn: '創建於',
            subject: '科目',
            topic: '主題',
            ageGroup: '年齡組',
            lessonType: '類型'
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
            title: '🤖 AI Tutor', subtitle: 'Ask our AI expert team about your child\u2019s learning & behavior.', inputLabel: '① Problem Input Area',
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
                refutation: 'Refutation: Identify gaps in the opponent\'s case and answer persuasively',
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
        },
        login: {
            welcomeBack: 'Welcome back!',
            email: 'Email',
            emailPlaceholder: 'your@email.com',
            password: 'Password',
            passwordPlaceholder: '••••••••',
            loginBtn: 'Login',
            noAccount: "Don't have an account?",
            registerNow: 'Register now',
            featureMultilingual: 'Multilingual',
            featureAI: 'AI Powered',
            featurePersonalized: 'Personalized'
        },
        signup: {
            joinUs: 'Join Us',
            startJourney: 'Start Your AI Learning Journey',
            signupDesc: 'Register an account and experience diverse AI learning features',
            email: 'Email',
            emailPlaceholder: 'your@email.com',
            password: 'Password',
            passwordPlaceholder: 'At least 6 characters',
            passwordHint: 'Password must be at least 6 characters long',
            signupBtn: 'Create Account',
            haveAccount: 'Already have an account?',
            backToLogin: 'Back to Login',
            benefitsTitle: 'Register to enjoy:',
            benefitMultilingual: 'Multilingual Learning',
            benefitAITutor: 'AI Tutor',
            benefitTutoring: 'Homework Tutoring',
            benefitStorybook: 'Storybook Reading'
        },
        myLearning: {
            title: 'My Learning',
            subtitle: 'View your learning progress, history, and favorites',
            loading: 'Loading...',
            stats: {
                lessons: 'Lessons',
                stories: 'Stories',
                tutoring: 'Tutoring',
                favorites: 'Favorites'
            },
            tab: {
                lessons: 'Lesson History',
                stories: 'Story History',
                tutoring: 'Tutoring Sessions',
                favorites: 'My Favorites'
            },
            noLessons: 'No lesson history yet',
            noStories: 'No story history yet',
            noTutoring: 'No tutoring sessions yet',
            noFavorites: 'No favorites yet',
            viewDetails: 'View Details',
            delete: 'Delete',
            favorite: 'Favorite',
            unfavorite: 'Unfavorite',
            createdOn: 'Created on',
            subject: 'Subject',
            topic: 'Topic',
            ageGroup: 'Age Group',
            lessonType: 'Type'
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
        },
        login: {
            welcomeBack: 'Chào mừng trở lại!',
            email: 'Email',
            emailPlaceholder: 'your@email.com',
            password: 'Mật khẩu',
            passwordPlaceholder: '••••••••',
            loginBtn: 'Đăng nhập',
            noAccount: 'Chưa có tài khoản?',
            registerNow: 'Đăng ký ngay',
            featureMultilingual: 'Đa ngôn ngữ',
            featureAI: 'AI Điều khiển',
            featurePersonalized: 'Cá nhân hóa'
        },
        signup: {
            joinUs: 'Tham gia cùng chúng tôi',
            startJourney: 'Bắt đầu hành trình học AI của bạn',
            signupDesc: 'Đăng ký tài khoản và trải nghiệm các tính năng học AI đa dạng',
            email: 'Email',
            emailPlaceholder: 'your@email.com',
            password: 'Mật khẩu',
            passwordPlaceholder: 'Ít nhất 6 ký tự',
            passwordHint: 'Mật khẩu phải có ít nhất 6 ký tự',
            signupBtn: 'Tạo tài khoản',
            haveAccount: 'Đã có tài khoản?',
            backToLogin: 'Quay lại đăng nhập',
            benefitsTitle: 'Đăng ký để tận hưởng:',
            benefitMultilingual: 'Học đa ngôn ngữ',
            benefitAITutor: 'Gia sư AI',
            benefitTutoring: 'Gia sư bài tập',
            benefitStorybook: 'Đọc truyện tranh'
        },
        myLearning: {
            title: 'Học tập của tôi',
            subtitle: 'Xem tiến độ học tập, lịch sử và mục yêu thích',
            loading: 'Đang tải...',
            stats: {
                lessons: 'Bài học',
                stories: 'Câu chuyện',
                tutoring: 'Gia sư',
                favorites: 'Yêu thích'
            },
            tab: {
                lessons: 'Lịch sử bài học',
                stories: 'Lịch sử câu chuyện',
                tutoring: 'Phiên gia sư',
                favorites: 'Mục yêu thích'
            },
            noLessons: 'Chưa có lịch sử bài học',
            noStories: 'Chưa có lịch sử câu chuyện',
            noTutoring: 'Chưa có phiên gia sư',
            noFavorites: 'Chưa có mục yêu thích',
            viewDetails: 'Xem chi tiết',
            delete: 'Xóa',
            favorite: 'Yêu thích',
            unfavorite: 'Bỏ yêu thích',
            createdOn: 'Tạo vào',
            subject: 'Môn học',
            topic: 'Chủ đề',
            ageGroup: 'Nhóm tuổi',
            lessonType: 'Loại'
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
        },
        login: {
            welcomeBack: 'おかえりなさい！',
            email: 'メールアドレス',
            emailPlaceholder: 'your@email.com',
            password: 'パスワード',
            passwordPlaceholder: '••••••••',
            loginBtn: 'ログイン',
            noAccount: 'アカウントをお持ちでないですか？',
            registerNow: '今すぐ登録',
            featureMultilingual: '多言語',
            featureAI: 'AI駆動',
            featurePersonalized: 'パーソナライズ'
        },
        signup: {
            joinUs: '参加する',
            startJourney: 'AI学習の旅を始めましょう',
            signupDesc: 'アカウントを登録して、多様なAI学習機能を体験',
            email: 'メールアドレス',
            emailPlaceholder: 'your@email.com',
            password: 'パスワード',
            passwordPlaceholder: '6文字以上',
            passwordHint: 'パスワードは6文字以上である必要があります',
            signupBtn: 'アカウント作成',
            haveAccount: 'すでにアカウントをお持ちですか？',
            backToLogin: 'ログインに戻る',
            benefitsTitle: '登録して楽しむ：',
            benefitMultilingual: '多言語学習',
            benefitAITutor: 'AIチューター',
            benefitTutoring: '宿題指導',
            benefitStorybook: '絵本の読み聞かせ'
        },
        myLearning: {
            title: '私の学習',
            subtitle: '学習進捗、履歴、お気に入りを表示',
            loading: '読み込み中...',
            stats: {
                lessons: 'レッスン',
                stories: 'ストーリー',
                tutoring: '指導',
                favorites: 'お気に入り'
            },
            tab: {
                lessons: 'レッスン履歴',
                stories: 'ストーリー履歴',
                tutoring: '指導セッション',
                favorites: 'お気に入り'
            },
            noLessons: 'レッスン履歴がありません',
            noStories: 'ストーリー履歴がありません',
            noTutoring: '指導セッションがありません',
            noFavorites: 'お気に入りがありません',
            viewDetails: '詳細を見る',
            delete: '削除',
            favorite: 'お気に入り',
            unfavorite: 'お気に入り解除',
            createdOn: '作成日',
            subject: '科目',
            topic: 'トピック',
            ageGroup: '年齢グループ',
            lessonType: 'タイプ'
        }
    }
};
