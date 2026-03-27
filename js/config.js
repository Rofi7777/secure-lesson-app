window.App = window.App || {};

App.config = {
    // Supabase (build.js replaces these values from env vars on deploy)
    SUPABASE_URL: 'https://jlkgqaezgoajsnimogra.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsa2dxYWV6Z29hanNuaW1vZ3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMzM0MDAsImV4cCI6MjA4MDkwOTQwMH0.wqW8L4VmNIfeU2jLoFKmeA5ZisD_N-ILBfb_vUUxLtg',

    // Gemini API
    GEMINI_API_KEY: 'AIzaSyAcLZXgMZraFeHc-yDzB7W-g9kpKQQ0Wj4',
    GEMINI_API_BASE: 'https://generativelanguage.googleapis.com/v1beta/models'
};

// Shared application state
App.state = {
    currentLang: 'zh-Hant',
    currentLesson: null,
    currentLessonType: '教學課程',
    isAuthenticated: true,
    currentUser: { email: 'internal@user.com', id: 'internal-user' },
    storyAudioBlob: null,
    storyAudioUrl: null,
    aiTutorChatHistory: [],
    aiDoctorChatHistory: [],
    storybookFiles: [],
    tutoringFiles: [],
    explanationAudioBlobs: {},
    audioButtonCounter: 0,
    generatedAudioCache: new Map()
};

// Voice and speech profiles
App.config.lessonAudioLanguages = new Set(['en', 'zh-Hant', 'vi', 'ja']);
App.config.lessonSpeechProfiles = {
    'Under 5': { apiRate: 0.6, playbackRate: 0.8 },
    '6-10 years': { apiRate: 0.85, playbackRate: 0.9 }
};
App.config.voiceProfiles = {
    default: 'Kore',
    female: 'Kore',
    male: 'Puck'
};
