window.App = window.App || {};

App.pinyin = {

    // Regex for CJK Unified Ideographs (covers both Traditional & Simplified)
    _cjkRegex: /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/,

    // Check if pinyin-pro library is loaded
    _libReady: function() {
        return typeof pinyinPro !== 'undefined' && typeof pinyinPro.pinyin === 'function';
    },

    // Check if pinyin should be shown (toggle ON + content is Chinese)
    isActive: function(lang) {
        if (!App.state.showPinyin) return false;
        var checkLang = lang || App.pinyin._getCurrentContentLang();
        return checkLang === 'zh-Hant' || checkLang === 'zh-Hans' || checkLang === 'zh';
    },

    // Detect current content language from active view
    _getCurrentContentLang: function() {
        // Platform view: check active lesson lang tab
        var activeTab = document.querySelector('#lesson-lang-tabs .lesson-lang-btn.active');
        if (activeTab && !document.getElementById('platform-view').classList.contains('hidden')) {
            return activeTab.dataset.lang || App.state.currentLang;
        }
        // Storybook: check storybook language selector
        var sbLang = document.getElementById('storybook-language');
        if (sbLang && !document.getElementById('storybook-main-view')?.classList.contains('hidden')) {
            return sbLang.value || App.state.currentLang;
        }
        // Tutoring: check tutoring language selector
        var tutLang = document.getElementById('tutoring-language');
        if (tutLang && !document.getElementById('tutoring-main-view')?.classList.contains('hidden')) {
            // Map display text to lang code if needed
            return App.state.currentLang;
        }
        return App.state.currentLang;
    },

    // Convert Chinese text to ruby-annotated HTML
    // Processes text in segments: Chinese runs get <ruby>, non-Chinese passes through
    annotate: function(text) {
        if (!text || !App.pinyin._libReady()) return text;
        if (!App.pinyin._cjkRegex.test(text)) return text;

        var result = '';
        // Split text into segments of Chinese vs non-Chinese
        var segments = text.split(/([\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+)/g);

        for (var i = 0; i < segments.length; i++) {
            var seg = segments[i];
            if (!seg) continue;

            if (App.pinyin._cjkRegex.test(seg)) {
                // Chinese segment: get per-character pinyin
                var pinyinArr = pinyinPro.pinyin(seg, { type: 'array', toneType: 'symbol' });
                for (var j = 0; j < seg.length; j++) {
                    var py = (pinyinArr && pinyinArr[j]) ? pinyinArr[j] : '';
                    result += '<ruby>' + seg[j] + '<rt>' + py + '</rt></ruby>';
                }
            } else {
                // Non-Chinese: escape HTML entities and pass through
                result += seg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }
        }
        return result;
    },

    // Annotate existing HTML content — walks text nodes only
    annotateHTML: function(html) {
        if (!html || !App.pinyin._libReady()) return html;
        if (!App.pinyin._cjkRegex.test(html)) return html;

        var temp = document.createElement('div');
        temp.innerHTML = html;
        App.pinyin._walkTextNodes(temp);
        return temp.innerHTML;
    },

    // Recursively walk DOM text nodes and replace Chinese with ruby
    _walkTextNodes: function(node) {
        if (node.nodeType === 3) { // Text node
            var text = node.textContent;
            if (App.pinyin._cjkRegex.test(text)) {
                var annotated = App.pinyin.annotate(text);
                var span = document.createElement('span');
                span.innerHTML = annotated;
                node.parentNode.replaceChild(span, node);
            }
        } else if (node.nodeType === 1 && node.nodeName !== 'RT' && node.nodeName !== 'RUBY') {
            // Element node (skip ruby/rt to avoid double annotation)
            var children = Array.prototype.slice.call(node.childNodes);
            for (var i = 0; i < children.length; i++) {
                App.pinyin._walkTextNodes(children[i]);
            }
        }
    },

    // Get pinyin for a single word/phrase (for vocabulary cards)
    getWordPinyin: function(word) {
        if (!word || !App.pinyin._libReady()) return '';
        if (!App.pinyin._cjkRegex.test(word)) return '';
        return pinyinPro.pinyin(word, { toneType: 'symbol' });
    },

    // Toggle pinyin on/off
    toggle: function() {
        App.state.showPinyin = !App.state.showPinyin;
        localStorage.setItem('lv_showPinyin', App.state.showPinyin);
        App.pinyin._updateToggleButton();
        App.pinyin.refreshAll();
    },

    // Update toggle button appearance
    _updateToggleButton: function() {
        var btn = document.getElementById('pinyin-toggle');
        if (!btn) return;
        var lang = App.state.currentLang;
        var t = App.translations[lang] || App.translations['en'];
        var label = App.state.showPinyin ? (t.pinyinOn || 'Pinyin ON') : (t.pinyinOff || 'Pinyin OFF');
        btn.querySelector('.btn-text').textContent = label;
        btn.classList.toggle('bg-yellow-400/30', App.state.showPinyin);
        btn.classList.toggle('border-yellow-400/50', App.state.showPinyin);
        btn.classList.toggle('bg-white/20', !App.state.showPinyin);
        btn.classList.toggle('border-white/30', !App.state.showPinyin);
    },

    // Refresh all visible pinyin annotations in current view
    refreshAll: function() {
        // Re-render platform lesson if visible
        if (App.state.currentLesson && !document.getElementById('platform-view')?.classList.contains('hidden')) {
            App.views.platform.renderLesson();
        }
        // Re-render tutoring vocabulary if visible
        var tutoringView = document.getElementById('tutoring-results-view');
        if (tutoringView && !tutoringView.classList.contains('hidden') && App.state.tutoringVocabularyItems) {
            App.views.tutoring.renderTutoringVocabulary(App.state.tutoringVocabularyItems);
        }
        // Re-render storybook if visible
        var storyContainer = document.getElementById('story-display-container');
        if (storyContainer && storyContainer.textContent.trim()) {
            var storyText = storyContainer.dataset.rawText || storyContainer.textContent;
            if (App.pinyin.isActive()) {
                storyContainer.dataset.rawText = storyContainer.dataset.rawText || storyContainer.textContent;
                storyContainer.innerHTML = App.pinyin.annotate(storyText);
            } else {
                if (storyContainer.dataset.rawText) {
                    storyContainer.textContent = storyContainer.dataset.rawText;
                }
            }
        }
    },

    // Initialize pinyin module
    init: function() {
        var btn = document.getElementById('pinyin-toggle');
        if (btn) {
            btn.addEventListener('click', App.pinyin.toggle);
            App.pinyin._updateToggleButton();
        }
        // Update toggle button text when UI language changes
        if (App.i18n && App.i18n.registerLanguageCallback) {
            App.i18n.registerLanguageCallback(function() {
                App.pinyin._updateToggleButton();
            });
        }
    }
};
