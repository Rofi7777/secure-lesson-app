window.App = window.App || {};
App.data = {};

App.data.tutoring_levels = {
    'zh-Hant': ['幼稚園', '國小', '國中', '高中', '大學', '其他'],
    'en': ['Kindergarten', 'Elementary', 'Middle School', 'High School', 'University', 'Other'],
    'vi': ['Mẫu giáo', 'Tiểu học', 'Trung học cơ sở', 'Trung học phổ thông', 'Đại học', 'Khác'],
    'ja': ['幼稚園', '小学校', '中学校', '高校', '大学', 'その他']
};

App.data.tutoring_subjects = {
    'zh-Hant': ['國語', '數學', '英文', '自然科學', '社會', '其他'],
    'en': ['Language Arts', 'Math', 'English', 'Science', 'Social Studies', 'Other'],
    'vi': ['Ngữ văn', 'Toán', 'Tiếng Anh', 'Khoa học tự nhiên', 'Xã hội', 'Khác'],
    'ja': ['国語', '数学', '英語', '理科', '社会', 'その他']
};

App.data.storybook_ages = {
    'zh-Hant': ['2-4歲', '5-7歲', '8-10歲'],
    'en': ['2-4 years', '5-7 years', '8-10 years'],
    'vi': ['2-4 tuổi', '5-7 tuổi', '8-10 tuổi'],
    'ja': ['2-4歳', '5-7歳', '8-10歳']
};

App.data.aiExpertsData = {
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

