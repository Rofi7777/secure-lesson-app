window.App = window.App || {};

/**
 * Learning Tracker — localStorage-based learning history & AI personalization
 * Stores completed lessons, tracks subject/topic preferences, and
 * injects learning context into AI prompts for personalized content.
 */
App.learningTracker = {

    STORAGE_KEY: 'lv_learning_history',
    MAX_ENTRIES: 200,

    // --- Get all history ---
    getHistory: function() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        } catch { return []; }
    },

    // --- Record a completed lesson ---
    recordLesson: function(data) {
        const history = this.getHistory();
        history.push({
            ts: Date.now(),
            subject: data.subject,
            topic: data.topic,
            age: data.age,
            type: data.lessonType,
            lang: App.state.currentLang
        });
        // Keep only latest entries
        if (history.length > this.MAX_ENTRIES) {
            history.splice(0, history.length - this.MAX_ENTRIES);
        }
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
        } catch { /* quota exceeded */ }
    },

    // --- Get statistics ---
    getStats: function() {
        const history = this.getHistory();
        const subjects = {};
        const topics = {};
        const recentDays = new Set();
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;

        history.forEach((entry) => {
            subjects[entry.subject] = (subjects[entry.subject] || 0) + 1;
            const topicKey = entry.subject + ':' + entry.topic;
            topics[topicKey] = (topics[topicKey] || 0) + 1;
            const daysAgo = Math.floor((now - entry.ts) / dayMs);
            if (daysAgo < 30) recentDays.add(new Date(entry.ts).toDateString());
        });

        // Calculate streak
        let streak = 0;
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);
        while (recentDays.has(checkDate.toDateString())) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }

        // Top subjects sorted by count
        const topSubjects = Object.entries(subjects)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // Recently studied topics (last 10 unique)
        const recentTopics = [];
        const seen = new Set();
        for (let i = history.length - 1; i >= 0 && recentTopics.length < 10; i--) {
            const key = history[i].topic;
            if (!seen.has(key)) {
                seen.add(key);
                recentTopics.push(history[i]);
            }
        }

        return {
            totalLessons: history.length,
            streak,
            activeDays: recentDays.size,
            topSubjects,
            recentTopics
        };
    },

    // --- Generate AI context string for personalized prompts ---
    getPersonalizationContext: function() {
        const stats = this.getStats();
        if (stats.totalLessons === 0) return '';

        const lines = ['[Student Learning Profile]'];
        lines.push(`Total lessons completed: ${stats.totalLessons}`);
        lines.push(`Learning streak: ${stats.streak} day(s)`);

        if (stats.topSubjects.length > 0) {
            lines.push(`Favorite subjects: ${stats.topSubjects.map(([s, c]) => s + ' (' + c + ')').join(', ')}`);
        }
        if (stats.recentTopics.length > 0) {
            lines.push(`Recently studied: ${stats.recentTopics.map((t) => t.topic).join(', ')}`);
        }
        lines.push('Please adjust difficulty and content based on this learning history. Avoid repeating topics the student recently covered unless reviewing.');

        return lines.join('\n');
    }
};
