window.App = window.App || {};

App.utils = {

    // --- Generic Helpers ---

    setLoading(button, isLoading) {
        const btnText = button.querySelector('.btn-text');
        const loader = button.querySelector('.loader');
        if (isLoading) {
            button.disabled = true;
            if (btnText) btnText.classList.add('hidden');
            if (loader) loader.classList.remove('hidden');
        } else {
            button.disabled = false;
            if (btnText) btnText.classList.remove('hidden');
            if (loader) loader.classList.add('hidden');
        }
    },

    simpleMarkdownParse(text) {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/## (.*?)(?:\\n|<br>|$)/g, '<h3 class="font-bold text-lg my-3">$1</h3>')
            .replace(/\\n/g, '<br>');
    },

    normalizeSpeechText(value) {
        if (value === null || value === undefined) return '';
        return String(value).replace(/\s+/g, ' ').trim();
    },

    encodeForDataAttr(value) {
        const normalized = App.utils.normalizeSpeechText(value);
        if (!normalized) return '';
        return normalized
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    base64FromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    },

    // --- Audio Helpers ---

    pcmToWav(pcmData, sampleRate) {
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
    },

    async concatWavBlobs(blobs) {
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
    },

    playAudioBlob(blob, speechProfile = null, onPlaybackError = null) {
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
        App.utils.applyPlaybackRate(audio, speechProfile);
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
    },

    applyPlaybackRate(mediaEl, speechProfile) {
        if (!speechProfile?.playbackRate || !mediaEl) return;
        if (typeof mediaEl.playbackRate === 'number') {
            mediaEl.playbackRate = speechProfile.playbackRate;
            mediaEl.defaultPlaybackRate = speechProfile.playbackRate;
        }
        if ('preservesPitch' in mediaEl) mediaEl.preservesPitch = true;
        if ('mozPreservesPitch' in mediaEl) mediaEl.mozPreservesPitch = true;
        if ('webkitPreservesPitch' in mediaEl) mediaEl.webkitPreservesPitch = true;
    },

    // --- Lesson Speech Helpers ---

    getSelectedLessonAgeGroup() {
        return document.querySelector('input[name="age"]:checked')?.value || '';
    },

    getActiveLessonLanguage() {
        return document.querySelector('#lesson-lang-tabs .lesson-lang-btn.active')?.dataset.lang || null;
    },

    getLessonSpeechProfile(languageHint) {
        const ageGroup = App.utils.getSelectedLessonAgeGroup();
        const profile = App.config.lessonSpeechProfiles[ageGroup];
        if (!profile) return null;

        const lang = languageHint || App.utils.getActiveLessonLanguage();
        if (lang && !App.config.lessonAudioLanguages.has(lang)) return null;

        return { ...profile };
    },

    // --- Toast Notifications ---

    toast(message, type) {
        var container = document.getElementById('toast-container');
        if (!container) return;
        var el = document.createElement('div');
        el.className = 'toast toast-' + (type || 'success');
        el.textContent = message;
        container.appendChild(el);
        setTimeout(function() { el.remove(); }, 3200);
    },

    // --- Loading Overlay ---

    showOverlay(message) {
        var overlay = document.getElementById('loading-overlay');
        var textEl = document.getElementById('loading-overlay-text');
        if (!overlay) return;
        if (textEl) textEl.textContent = message || '處理中...';
        overlay.style.display = 'flex';
    },

    hideOverlay() {
        var overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
    },

    // Convert raw API error to user-friendly message
    friendlyError(rawMessage) {
        if (!rawMessage) return '發生未知錯誤，請稍後再試。';
        var msg = String(rawMessage);
        if (msg.includes('Invalid JSON')) return '伺服器回應格式異常，請重新嘗試。';
        if (msg.includes('PROHIBITED_CONTENT')) return '內容被安全過濾器攔截，請換個主題再試。';
        if (msg.includes('TTS request stopped')) return '語音生成被中斷，請稍後再試。';
        if (msg.includes('Load failed') || msg.includes('Failed to fetch')) return '網路連線失敗，請確認網路後重試。';
        if (msg.includes('429') || msg.includes('quota')) return 'API 使用次數超過限制，請稍後再試。';
        if (msg.includes('500') || msg.includes('503')) return '伺服器暫時不可用，請稍後再試。';
        if (msg.includes('API Error')) return '服務暫時無法回應，請稍後再試。';
        // Fallback: truncate long technical messages
        if (msg.length > 80) return '發生錯誤，請重新嘗試。';
        return msg;
    },

    // --- UI Helpers ---

    displayError(element, message) {
        element.textContent = App.utils.friendlyError(message);
        element.classList.remove('hidden');
    },

    // --- File Handling ---

    handleFileSelection(file, previewImgEl, placeholderEl, fileNameDisplayEl, buttonToEnable) {
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
    },

    setupFileHandling(dropZoneEl, inputEl, previewImgEl, placeholderEl, fileNameDisplayEl, buttonToEnable, fileStateSetter, options = {}) {
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
                    let translation = App.translations[App.state.currentLang];
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
            const processed = App.utils.handleFileSelection(file, previewImgEl, placeholderEl, fileNameDisplayEl, buttonToEnable);
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
    },

    // --- Promise Helpers ---

    withTimeout(promise, timeoutMs, errorMessage) {
        let timeoutId;
        let isCleanedUp = false;

        const cleanup = () => {
            if (!isCleanedUp && timeoutId) {
                clearTimeout(timeoutId);
                isCleanedUp = true;
            }
        };

        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error(errorMessage || '請求超時，請稍後再試'));
            }, timeoutMs);
        });

        // Wrap promise to cleanup on both success and error (compatible with older browsers)
        const wrappedPromise = promise.then(
            (result) => {
                cleanup();
                return result;
            },
            (error) => {
                cleanup();
                throw error;
            }
        );

        return Promise.race([wrappedPromise, timeoutPromise]);
    }
};
