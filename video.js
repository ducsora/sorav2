/* =============================================
   SoraVer2 — Video Dubbing Tool Logic
   ============================================= */
'use strict';

/* ================================================
   STATE
   ================================================ */
const state = {
    currentStep: 1,
    videoFile: null,
    videoURL: null,
    videoDuration: 0,
    segments: [],        // [{id, start, end, cn, en, tl, audioBlobEn, audioBlobTl}]
    generatedLangs: [],  // which langs have been generated
    exportURL: null,
};

/* ================================================
   DOM REFERENCES
   ================================================ */
const $ = id => document.getElementById(id);

const DOM = {
    // Settings
    settingsPanel: $('settings-panel'),
    btnSettings:   $('btn-settings'),
    btnCloseSettings: $('btn-close-settings'),
    btnSaveSettings: $('btn-save-settings'),
    elApiKey:      $('el-api-key'),
    gtApiKey:      $('gt-api-key'),
    whisperKey:    $('whisper-api-key'),
    btnReset:      $('btn-reset'),

    // Step Progress
    stepItems: document.querySelectorAll('.step-item'),
    stepLines: document.querySelectorAll('.step-line'),

    // Step 1
    dropZone:       $('drop-zone'),
    videoInput:     $('video-input'),
    btnBrowse:      $('btn-browse'),
    videoInfo:      $('video-info'),
    videoThumb:     $('video-thumb-preview'),
    videoName:      $('video-name'),
    videoSize:      $('video-size'),
    videoDuration:  $('video-duration'),
    videoRes:       $('video-res'),
    btnRemoveVideo: $('btn-remove-video'),
    btnStep1Next:   $('btn-step1-next'),

    // Step 2
    segTabs:       document.querySelectorAll('.seg-tab'),
    segContents:   document.querySelectorAll('.seg-content'),
    cnText:        $('cn-text'),
    btnAutoTranscribe: $('btn-auto-transcribe'),
    transcribeResult:  $('transcribe-result'),
    transcriptSegments: $('transcript-segments'),
    btnEditTranscribe:  $('btn-edit-transcribe'),
    btnStep2Back:  $('btn-step2-back'),
    btnStep2Next:  $('btn-step2-next'),

    // Step 3
    targetLangRadios: document.querySelectorAll('input[name="target-lang"]'),
    translationTable: $('translation-table'),
    targetColLabel:   $('target-col-label'),
    btnAutoTranslate: $('btn-auto-translate'),
    subtitleMode:  $('subtitle-mode'),
    subtitlePos:   $('subtitle-pos'),
    subtitleSize:  $('subtitle-size'),
    subtitleSizeVal: $('subtitle-size-val'),
    subtitleColor: $('subtitle-color'),
    subtitleBg:    $('subtitle-bg'),
    subtitleBgOpacity: $('subtitle-bg-opacity'),
    btnStep3Back:  $('btn-step3-back'),
    btnStep3Next:  $('btn-step3-next'),

    // Step 4
    voiceSectionEn: $('voice-section-en'),
    voiceSectionTl: $('voice-section-tl'),
    voiceEn:       $('voice-en'),
    modelEn:       $('model-en'),
    stabilityEn:   $('stability-en'),
    similarityEn:  $('similarity-en'),
    stabilityEnVal: $('val-stability-en'),
    similarityEnVal: $('val-similarity-en'),
    voiceTl:       $('voice-tl'),
    modelTl:       $('model-tl'),
    stabilityTl:   $('stability-tl'),
    similarityTl:  $('similarity-tl'),
    stabilityTlVal: $('val-stability-tl'),
    similarityTlVal: $('val-similarity-tl'),
    previewTextEn: $('preview-text-en'),
    previewTextTl: $('preview-text-tl'),
    btnPreviewEn:  $('btn-preview-en'),
    btnPreviewTl:  $('btn-preview-tl'),
    audioPreviewEn: $('audio-preview-en'),
    audioPreviewTl: $('audio-preview-tl'),
    btnGenerateVoice: $('btn-generate-voice'),
    generateProgress: $('generate-progress'),
    generateProgressBar: $('generate-progress-bar'),
    generateStatusText: $('generate-status-text'),
    generateCount: $('generate-count'),
    btnStep4Back:  $('btn-step4-back'),
    btnStep4Next:  $('btn-step4-next'),

    // Step 5
    exportLang:    $('export-lang'),
    exportFormat:  $('export-format'),
    exportQuality: $('export-quality'),
    exportInfoName: $('export-info-name'),
    exportInfoDuration: $('export-info-duration'),
    exportInfoSegments: $('export-info-segments'),
    btnExport:     $('btn-export'),
    exportProgress: $('export-progress'),
    exportProgressBar: $('export-progress-bar'),
    exportStatusText: $('export-status-text'),
    exportResult:  $('export-result'),
    btnDownloadVideo: $('btn-download-video'),
    btnDownloadSrt:   $('btn-download-srt'),
    btnNewProject:    $('btn-new-project'),
    btnStep5Back:  $('btn-step5-back'),

    // Preview
    videoPreview:  $('video-preview'),
    videoPlaceholder: $('video-placeholder'),
    subtitleOverlay: $('subtitle-overlay'),
    segmentListWrap: $('segment-list-wrap'),
    segmentList:   $('segment-list'),
    segCountBadge: $('segment-count-badge'),
    btnFullscreen: $('btn-fullscreen'),
};

/* ================================================
   API KEY MANAGEMENT
   ================================================ */
function loadApiKeys() {
    DOM.elApiKey.value    = localStorage.getItem('sv2_el_key')    || '';
    DOM.gtApiKey.value    = localStorage.getItem('sv2_gt_key')    || '';
    DOM.whisperKey.value  = localStorage.getItem('sv2_whisper_key') || '';
    if ($('ttsfree-api-key')) $('ttsfree-api-key').value = localStorage.getItem('sv2_ttsfree_key') || '';
    // Auto-sync provider dropdown if key already saved
    autoDetectProvider(DOM.whisperKey.value);
}

// Auto detect Groq vs OpenAI from key prefix
function autoDetectProvider(key) {
    const providerEl = $('whisper-provider');
    if (!providerEl) return;
    const trimmed = key.trim();
    if (trimmed.startsWith('gsk_')) {
        providerEl.value = 'groq';
        updateProviderHint('groq');
    } else if (trimmed.startsWith('sk-')) {
        providerEl.value = 'openai';
        updateProviderHint('openai');
    }
}

function updateProviderHint(provider) {
    const hintEl = $('provider-hint');
    if (!hintEl) return;
    if (provider === 'groq') {
        hintEl.innerHTML = '✅ Key Groq đã nhận diện — <strong>Miễn phí</strong>';
        hintEl.style.color = 'var(--success)';
    } else if (provider === 'openai') {
        hintEl.innerHTML = 'ℹ️ Key OpenAI — Kiểm tra billing tại platform.openai.com';
        hintEl.style.color = 'var(--info)';
    } else {
        hintEl.textContent = '';
    }
}

function saveApiKeys() {
    localStorage.setItem('sv2_el_key',      DOM.elApiKey.value.trim());
    localStorage.setItem('sv2_gt_key',      DOM.gtApiKey.value.trim());
    localStorage.setItem('sv2_whisper_key', DOM.whisperKey.value.trim());
    const ttsFreeKeyEl = $('ttsfree-api-key');
    if (ttsFreeKeyEl) localStorage.setItem('sv2_ttsfree_key', ttsFreeKeyEl.value.trim());
    // Auto-switch provider based on key prefix
    autoDetectProvider(DOM.whisperKey.value);
    showToast('✅ Đã lưu API keys', 'success');
    DOM.settingsPanel.style.display = 'none';
}

DOM.btnSettings.addEventListener('click', () => {
    const visible = DOM.settingsPanel.style.display !== 'none';
    DOM.settingsPanel.style.display = visible ? 'none' : 'block';
});
DOM.btnCloseSettings.addEventListener('click', () => { DOM.settingsPanel.style.display = 'none'; });
DOM.btnSaveSettings.addEventListener('click', saveApiKeys);

// Eye toggle for password inputs
document.querySelectorAll('.eye-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        input.type = input.type === 'password' ? 'text' : 'password';
        btn.innerHTML = input.type === 'password' ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
    });
});

/* ================================================
   STEP NAVIGATION
   ================================================ */
function goToStep(step) {
    // Update state
    state.currentStep = step;

    // Update step UI
    DOM.stepItems.forEach((item, i) => {
        item.classList.remove('active', 'done');
        if (i + 1 < step)  item.classList.add('done');
        if (i + 1 === step) item.classList.add('active');
    });
    DOM.stepLines.forEach((line, i) => {
        line.classList.toggle('done', i + 1 < step);
    });

    // Show correct panel
    document.querySelectorAll('.step-panel').forEach((panel, i) => {
        panel.classList.toggle('active', i + 1 === step);
    });

    // Update voice section visibility
    if (step === 4) updateVoiceSections();
    if (step === 5) updateExportInfo();
}

/* Step 1 */
DOM.btnStep1Next.addEventListener('click', () => goToStep(2));

/* Step 2 */
DOM.btnStep2Back.addEventListener('click', () => goToStep(1));
DOM.btnStep2Next.addEventListener('click', () => {
    collectManualTranscript();
    if (state.segments.length === 0) {
        showToast('⚠️ Chưa có nội dung. Hãy nhập hoặc transcribe trước.', 'warning');
        return;
    }
    buildTranslationTable();
    goToStep(3);
});

/* Step 3 */
DOM.btnStep3Back.addEventListener('click', () => goToStep(2));
DOM.btnStep3Next.addEventListener('click', () => {
    collectTranslations();
    goToStep(4);
});

/* Step 4 */
DOM.btnStep4Back.addEventListener('click', () => goToStep(3));
DOM.btnStep4Next.addEventListener('click', () => goToStep(5));

/* Step 5 */
DOM.btnStep5Back.addEventListener('click', () => goToStep(4));

/* ================================================
   STEP 1 — VIDEO UPLOAD
   ================================================ */
DOM.btnBrowse.addEventListener('click', () => DOM.videoInput.click());
DOM.videoInput.addEventListener('change', e => {
    if (e.target.files[0]) handleVideoFile(e.target.files[0]);
});

// Drag & drop
DOM.dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    DOM.dropZone.classList.add('dragover');
});
DOM.dropZone.addEventListener('dragleave', () => DOM.dropZone.classList.remove('dragover'));
DOM.dropZone.addEventListener('drop', e => {
    e.preventDefault();
    DOM.dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) handleVideoFile(file);
    else showToast('⚠️ Vui lòng chọn tệp video', 'warning');
});

function handleVideoFile(file) {
    state.videoFile = file;
    if (state.videoURL) URL.revokeObjectURL(state.videoURL);
    state.videoURL = URL.createObjectURL(file);

    // Show info card
    DOM.videoInfo.style.display = 'flex';
    DOM.videoThumb.src = state.videoURL;
    DOM.videoName.textContent = file.name;
    DOM.videoSize.textContent = formatFileSize(file.size);

    // Load metadata
    DOM.videoThumb.addEventListener('loadedmetadata', () => {
        const dur = DOM.videoThumb.duration;
        state.videoDuration = dur;
        DOM.videoDuration.textContent = formatDuration(dur);
        DOM.videoRes.textContent = `${DOM.videoThumb.videoWidth}×${DOM.videoThumb.videoHeight}`;
    }, { once: true });

    // Update preview
    DOM.videoPreview.src = state.videoURL;
    DOM.videoPreview.style.display = 'block';
    DOM.videoPlaceholder.style.display = 'none';

    // Subtitle sync + dubbed preview sync
    DOM.videoPreview.addEventListener('timeupdate', () => {
        updateSubtitleOverlay();
        syncDubbedAudio();
        updateTLPlayhead();
        updateOriginalSubCoverPreview();
    });
    DOM.videoPreview.addEventListener('pause', () => {
        if (state._shuffleLooping) {
            // During shuffle: only stop if user manually paused (not natural video end)
            if (!DOM.videoPreview.ended) {
                state._shuffleLooping = false;
                dubbedOnUserPause();
            }
            return;
        }
        if (!state.dubbedEngineJustPaused) dubbedOnUserPause();
        state.dubbedEngineJustPaused = false;
    });
    DOM.videoPreview.addEventListener('seeked', () => {
        if (state._shuffleLooping) return; // shuffle mode — keep audio untouched
        dubbedReset();
        if (!DOM.videoPreview.paused && state.dubbedMode) dubbedPlay();
    });
    DOM.videoPreview.addEventListener('play', () => {
        if (state._shuffleLooping) return; // shuffle mode — audio already playing
        if (state.dubbedMode) dubbedPlay();
    });
    DOM.videoPreview.addEventListener('ended', () => {
        if (!state.dubbedMode) return;
        const lang = state.dubbedLang || 'en';
        // Only shuffle if voice is longer than video AND audio is still active
        if (getVoiceTotalDuration(lang) <= (state.videoDuration || 0)) return;
        if (!state.dubbedActiveSrc) return;
        _playShuffleClip();
    });

    DOM.btnStep1Next.disabled = false;
    DOM.dropZone.querySelector('.drop-zone-inner').style.display = 'none';

    // Export lang option
    DOM.exportLang.innerHTML = '';
    addExportLangOption();
}

DOM.btnRemoveVideo.addEventListener('click', resetVideoUpload);

function resetVideoUpload() {
    state.videoFile = null;
    if (state.videoURL) URL.revokeObjectURL(state.videoURL);
    state.videoURL = null;
    state.videoDuration = 0;

    DOM.videoInfo.style.display = 'none';
    DOM.videoPreview.style.display = 'none';
    DOM.videoPlaceholder.style.display = 'flex';
    DOM.videoPreview.src = '';
    DOM.videoInput.value = '';
    DOM.btnStep1Next.disabled = true;
    DOM.dropZone.querySelector('.drop-zone-inner').style.display = 'flex';
}

/* ================================================
   STEP 2 — TRANSCRIPTION
   ================================================ */

// Tab switching
DOM.segTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        DOM.segTabs.forEach(t => t.classList.remove('active'));
        DOM.segContents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab)?.classList.add('active');
    });
});

/* ——— Extract real audio from video file via Web Audio API ——— */
async function extractAudioFromVideo(videoFile, onProgress) {
    onProgress?.('🎬 Đọc tệp video…', 5);

    // Decode video file to AudioBuffer
    const arrayBuffer = await videoFile.arrayBuffer();
    const audioCtx = new AudioContext();

    let audioBuffer;
    try {
        onProgress?.('🔊 Giải mã audio từ video…', 20);
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
        // Browser couldn't decode (e.g. AVI/MKV) — fallback: use MediaSource slice
        audioCtx.close();
        throw new Error('Trình duyệt không hỗ trợ định dạng này. Hãy dùng video MP4 hoặc WebM.');
    }

    onProgress?.('🎵 Chuyển đổi sang định dạng gửi được…', 50);

    // Re-encode to WebM/Opus via OfflineAudioContext + MediaRecorder
    const numChannels = Math.min(audioBuffer.numberOfChannels, 2);
    const sampleRate  = Math.min(audioBuffer.sampleRate, 16000); // 16kHz is enough for Whisper
    const length      = audioBuffer.length;

    // Resample to 16kHz mono via OfflineAudioContext
    const offline = new OfflineAudioContext(1, Math.ceil(length * 16000 / audioBuffer.sampleRate), 16000);
    const source  = offline.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    audioCtx.close();

    onProgress?.('📦 Đóng gói tệp audio…', 75);

    // Convert to WAV blob (Whisper accepts WAV)
    const wavBlob = audioBufferToWavBlob(rendered);

    onProgress?.('✅ Trích xuất audio hoàn thành', 100);
    return wavBlob;
}

function audioBufferToWavBlob(buffer) {
    const numCh     = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bitDepth  = 16;
    const bytePerSamp = bitDepth / 8;
    const blockAlign = numCh * bytePerSamp;
    const byteRate   = sampleRate * blockAlign;
    const dataLen    = buffer.length * blockAlign;
    const ab = new ArrayBuffer(44 + dataLen);
    const v  = new DataView(ab);
    const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
    writeStr(0,  'RIFF'); v.setUint32(4, 36 + dataLen, true);
    writeStr(8,  'WAVE'); writeStr(12, 'fmt ');
    v.setUint32(16, 16, true);   v.setUint16(20, 1,          true);
    v.setUint16(22, numCh, true); v.setUint32(24, sampleRate, true);
    v.setUint32(28, byteRate, true); v.setUint16(32, blockAlign, true);
    v.setUint16(34, bitDepth, true); writeStr(36, 'data');
    v.setUint32(40, dataLen, true);
    let off = 44;
    for (let i = 0; i < buffer.length; i++) {
        for (let ch = 0; ch < numCh; ch++) {
            const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
            v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            off += 2;
        }
    }
    return new Blob([ab], { type: 'audio/wav' });
}

/* ——— Whisper API call ——— */
async function callWhisperAPI(audioBlob, fileName, provider, sourceLang, apiKey) {
    // Groq has 25MB limit — check size
    const MAX_SIZE_GROQ = 25 * 1024 * 1024; // 25MB
    if (provider === 'groq' && audioBlob.size > MAX_SIZE_GROQ) {
        throw new Error(`File audio quá lớn (${formatFileSize(audioBlob.size)}). Groq giới hạn 25MB. Dùng OpenAI Whisper cho video dài.`);
    }

    const formData = new FormData();
    // Use .wav extension so API recognizes format
    const safeName = (fileName || 'audio').replace(/\.[^.]+$/, '') + '.wav';
    formData.append('file', audioBlob, safeName);
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');

    let url, headers = {};
    if (provider === 'groq') {
        url = 'https://api.groq.com/openai/v1/audio/transcriptions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        formData.append('model', 'whisper-large-v3');
        if (sourceLang !== 'auto') formData.append('language', sourceLang === 'yue' ? 'zh' : sourceLang);
    } else {
        url = 'https://api.openai.com/v1/audio/transcriptions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        formData.append('model', 'whisper-1');
        if (sourceLang !== 'auto') formData.append('language', sourceLang === 'yue' ? 'zh' : sourceLang);
    }

    const res = await fetch(url, { method: 'POST', headers, body: formData });
    if (!res.ok) {
        const errText = await res.text();
        let errMsg = errText;
        try { const j = JSON.parse(errText); errMsg = j.error?.message || j.message || errText; } catch {}
        throw new Error(errMsg);
    }
    return await res.json();
}

/* ——— Status update helper inside step 2 ——— */
function setTranscribeStatus(text, pct) {
    const statusEl = $('transcribe-status');
    const barEl    = $('transcribe-progress-bar');
    const wrapEl   = $('transcribe-progress-wrap');
    if (statusEl) statusEl.textContent = text;
    if (barEl)    barEl.style.width = pct + '%';
    if (wrapEl)   wrapEl.style.display = pct >= 100 || pct === 0 ? 'none' : 'block';
}

/* ——— Main Transcribe Button ——— */
DOM.btnAutoTranscribe.addEventListener('click', async () => {
    const key = localStorage.getItem('sv2_whisper_key');
    if (!state.videoFile) { showToast('⚠️ Chưa upload video', 'warning'); return; }
    if (!key) {
        showToast('❌ Cần nhập Whisper API key trong "Cài đặt API" để trích xuất giọng nói thật từ video.', 'error', 5000);
        // Open settings panel automatically
        DOM.settingsPanel.style.display = 'block';
        DOM.whisperKey.focus();
        return;
    }

    const provider   = $('whisper-provider').value;
    const sourceLang = $('source-lang').value;
    const btn = DOM.btnAutoTranscribe;

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Đang xử lý...';
    setTranscribeStatus('Đang bắt đầu…', 1);

    try {
        // STEP A: Extract audio from video
        const audioBlob = await extractAudioFromVideo(state.videoFile, (msg, pct) => {
            btn.innerHTML = `<div class="spinner"></div> ${msg}`;
            setTranscribeStatus(msg, pct * 0.6); // 0-60% = extraction
        });

        // STEP B: Send to Whisper API
        setTranscribeStatus('📡 Đang gửi lên Whisper AI…', 65);
        btn.innerHTML = '<div class="spinner"></div> Đang nhận diện giọng nói…';

        const data = await callWhisperAPI(
            audioBlob,
            state.videoFile.name,
            provider,
            sourceLang,
            key
        );

        setTranscribeStatus('✅ Hoàn thành!', 100);

        // STEP C: Parse segments
        const rawSegs = data.segments || [];
        if (rawSegs.length === 0) {
            // Fallback: treat whole text as one segment
            state.segments = [{
                id: 0,
                start: 0,
                end: state.videoDuration || 30,
                cn: (data.text || '').trim(),
                en: '', tl: '', vi: '',
                audioBlobEn: null, audioBlobTl: null,
            }];
        } else {
            state.segments = rawSegs.map((seg, i) => ({
                id: i,
                start: parseFloat(seg.start.toFixed(2)),
                end:   parseFloat(seg.end.toFixed(2)),
                cn: seg.text.trim(),
                en: '', tl: '', vi: '',
                audioBlobEn: null, audioBlobTl: null,
            }));
        }

        renderTranscriptSegments();
        showToast(`✅ Bóc tách được ${state.segments.length} phân đoạn từ video thật!`, 'success');
        $('transcribe-progress-wrap').style.display = 'none';

        // Auto-translate segments to Vietnamese in background
        translateSegmentsToVietnamese();

    } catch (err) {
        console.error(err);
        setTranscribeStatus('', 0);
        showToast('❌ Lỗi: ' + err.message, 'error', 6000);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-waveform-lines"></i> Bắt đầu Transcribe';
    }
});

/* ——— Load Demo Data (separate explicit button) ——— */
function demoTranscribe() {
    if (!confirm('⚠️ Dữ liệu demo KHÔNG lấy từ video thật. Bạn muốn thử giao diện với dữ liệu mẫu?')) return;
    const demos = [
        { start: 0,    end: 4,    cn: '大家好，欢迎来到本教程。' },
        { start: 4,    end: 9,    cn: '今天我们来学习如何使用AI工具进行视频配音。' },
        { start: 9,    end: 14,   cn: '首先，我们需要上传一个中文视频文件。' },
        { start: 14,   end: 19,   cn: '然后，系统会自动识别语音并转换为文字。' },
        { start: 19,   end: 25,   cn: '接下来，AI将把文字翻译成目标语言。' },
        { start: 25,   end: 30,   cn: '最后，我们使用ElevenLabs生成自然的人声配音。' },
    ];
    state.segments = demos.map((d, i) => ({ id: i, ...d, en: '', tl: '', vi: '', audioBlobEn: null, audioBlobTl: null }));
    renderTranscriptSegments();
    translateSegmentsToVietnamese();
    showToast('📋 Dữ liệu demo (KHÔNG phải nội dung thật của video)', 'warning');
}

// Wire up demo button
const btnDemo = $('btn-load-demo');
if (btnDemo) btnDemo.addEventListener('click', demoTranscribe);

function renderTranscriptSegments() {
    DOM.transcriptSegments.innerHTML = '';
    state.segments.forEach(seg => {
        const div = document.createElement('div');
        div.className = 'transcript-seg-item';
        div.dataset.segId = seg.id;
        div.innerHTML = `
            <span class="seg-time">${formatDuration(seg.start)}</span>
            <div class="seg-text-wrap">
                <span class="seg-text-cn" contenteditable="true" data-seg-id="${seg.id}">${seg.cn}</span>
                <span class="seg-text-vi" id="seg-vi-${seg.id}">${seg.vi ? seg.vi : '<span class="seg-vi-loading">Đang dịch...</span>'}</span>
            </div>
        `;
        div.querySelector('[contenteditable]').addEventListener('blur', e => {
            const s = state.segments.find(s => s.id == e.target.dataset.segId);
            if (s) s.cn = e.target.textContent.trim();
        });
        DOM.transcriptSegments.appendChild(div);
    });

    DOM.transcribeResult.style.display = 'block';
    updateSegmentSidebar();
}

/* ——— Auto-translate all segments to Vietnamese ——— */
async function translateSegmentsToVietnamese() {
    // Detect source lang from dropdown
    const srcLangEl = $('source-lang');
    const srcLang = srcLangEl ? (srcLangEl.value === 'auto' ? 'auto' : srcLangEl.value) : 'zh-CN';
    const sl = srcLang === 'auto' ? 'auto' : (srcLang === 'yue' ? 'zh' : srcLang);

    for (const seg of state.segments) {
        if (!seg.cn) continue;
        const viEl = $(`seg-vi-${seg.id}`);
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=vi&dt=t&q=${encodeURIComponent(seg.cn)}`;
            const res  = await fetch(url);
            if (!res.ok) throw new Error('translate error');
            const data = await res.json();
            const translated = data[0]?.map(item => item[0]).filter(Boolean).join('') || '';
            seg.vi = translated;
            if (viEl) viEl.textContent = translated;
        } catch {
            if (viEl) viEl.textContent = '—';
        }
    }
}

function collectManualTranscript() {
    // Active tab check: if manual, parse CN text
    const activeTab = document.querySelector('.seg-tab.active').dataset.tab;
    if (activeTab === 'manual-transcribe') {
        const raw = DOM.cnText.value.trim();
        if (!raw) return;
        state.segments = parseManualTranscript(raw);
        renderTranscriptSegments();
    }
}

function parseManualTranscript(raw) {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const timeRe = /^\[(\d{1,2}:\d{2}(?:\.\d+)?)\]/;
    let segments = [];
    let dur = state.videoDuration || 60;

    lines.forEach((line, i) => {
        const match = line.match(timeRe);
        if (match) {
            const timeStr = match[1];
            const cn = line.replace(timeRe, '').trim();
            if (!cn) return;
            const start = parseTimeStr(timeStr);
            const nextLine = lines.slice(i + 1).find(l => timeRe.test(l));
            let end = nextLine ? parseTimeStr(nextLine.match(timeRe)[1]) : start + 5;
            segments.push({ id: segments.length, start, end: Math.min(end, dur), cn, en: '', tl: '', vi: '', audioBlobEn: null, audioBlobTl: null });
        } else {
            // No timestamp — split by sentences
            const sentences = line.match(/[^。！？.!?]+[。！？.!?]*/g) || [line];
            let t = segments.length > 0 ? segments[segments.length - 1].end : 0;
            sentences.forEach(s => {
                if (!s.trim()) return;
                const duration = Math.max(2, s.length * 0.25);
                segments.push({ id: segments.length, start: t, end: t + duration, cn: s.trim(), en: '', tl: '', vi: '', audioBlobEn: null, audioBlobTl: null });
                t += duration;
            });
        }
    });

    return segments;
}

function parseTimeStr(str) {
    const parts = str.split(':');
    if (parts.length === 2) return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
    return parseFloat(str);
}

DOM.btnEditTranscribe.addEventListener('click', () => {
    // Switch to manual tab and pre-fill
    DOM.segTabs.forEach(t => t.classList.remove('active'));
    DOM.segContents.forEach(c => c.classList.remove('active'));
    document.querySelector('[data-tab="manual-transcribe"]').classList.add('active');
    $('manual-transcribe').classList.add('active');

    DOM.cnText.value = state.segments.map(s =>
        `[${formatDuration(s.start)}] ${s.cn}`
    ).join('\n');
});

/* ================================================
   STEP 3 — TRANSLATION & SUBTITLES
   ================================================ */
function buildTranslationTable() {
    const lang = getTargetLang();
    const colLabel = { en: '🇺🇸 Tiếng Anh', tl: '🇵🇭 Filipino', both: '🌐 Tiếng Anh' };
    DOM.targetColLabel.textContent = colLabel[lang] || '🌐 Bản dịch';
    DOM.translationTable.innerHTML = '';

    state.segments.forEach(seg => {
        const row = document.createElement('div');
        row.className = 'translation-row';
        row.innerHTML = `
            <div class="trans-cell-cn">
                <span class="seg-time">${formatDuration(seg.start)}</span>
                <span>${escHtml(seg.cn)}</span>
            </div>
            <div class="trans-cell-edit">
                <textarea class="trans-edit-input" data-seg-id="${seg.id}" data-lang="${lang === 'tl' ? 'tl' : 'en'}" rows="2" placeholder="Nhập bản dịch...">${lang === 'tl' ? seg.tl : seg.en}</textarea>
            </div>
        `;
        row.querySelector('textarea').addEventListener('input', e => {
            const s = state.segments.find(s => s.id == e.target.dataset.segId);
            if (s) s[e.target.dataset.lang] = e.target.value;
            updateSegmentSidebar();
        });
        DOM.translationTable.appendChild(row);
    });

    updateSegmentSidebar();
}

// Google Translate (free unofficial endpoint)
DOM.btnAutoTranslate.addEventListener('click', async () => {
    const lang = getTargetLang() === 'tl' ? 'tl' : 'en';
    const gtKey = localStorage.getItem('sv2_gt_key');

    DOM.btnAutoTranslate.disabled = true;
    DOM.btnAutoTranslate.innerHTML = '<div class="spinner"></div> Đang dịch...';

    try {
        for (let i = 0; i < state.segments.length; i++) {
            const seg = state.segments[i];
            if (!seg.cn) continue;

            const translated = gtKey
                ? await translateWithGoogleAPI(seg.cn, lang, gtKey)
                : await translateFree(seg.cn, lang);

            seg[lang] = translated;

            // Update UI
            const inputs = DOM.translationTable.querySelectorAll(`[data-seg-id="${seg.id}"]`);
            inputs.forEach(inp => { inp.value = translated; });
        }

        updateSegmentSidebar();
        showToast('✅ Dịch tự động hoàn thành', 'success');
    } catch (err) {
        console.error(err);
        showToast('❌ Lỗi dịch thuật: ' + err.message, 'error');
    } finally {
        DOM.btnAutoTranslate.disabled = false;
        DOM.btnAutoTranslate.innerHTML = '<i class="fa-brands fa-google"></i> Dịch tự động (Google)';
    }
});

async function translateFree(text, targetLang) {
    // Using Google Translate unofficial API (no key needed, limited)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Translate API error');
    const data = await res.json();
    return data[0]?.map(item => item[0]).join('') || text;
}

async function translateWithGoogleAPI(text, targetLang, key) {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${key}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: 'zh', target: targetLang, format: 'text' })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.data?.translations?.[0]?.translatedText || text;
}

function collectTranslations() {
    DOM.translationTable.querySelectorAll('[data-seg-id]').forEach(inp => {
        const seg = state.segments.find(s => s.id == inp.dataset.segId);
        if (seg) seg[inp.dataset.lang] = inp.value;
    });
    updateSegmentSidebar();
}

// Lang radio
DOM.targetLangRadios.forEach(r => {
    r.addEventListener('change', () => {
        buildTranslationTable();
        updateVoiceSections();
    });
});

// Subtitle settings reactive
DOM.subtitleSize.addEventListener('input', () => {
    DOM.subtitleSizeVal.textContent = DOM.subtitleSize.value + 'px';
});

// New subtitle style controls
const subStrokeWidthEl = $('subtitle-stroke-width');
const subStrokeValEl   = $('subtitle-stroke-val');
const subRadiusEl      = $('subtitle-radius');
const subRadiusValEl   = $('subtitle-radius-val');

if (subStrokeWidthEl) {
    subStrokeWidthEl.addEventListener('input', () => {
        if (subStrokeValEl) subStrokeValEl.textContent = subStrokeWidthEl.value + 'px';
    });
}
if (subRadiusEl) {
    subRadiusEl.addEventListener('input', () => {
        if (subRadiusValEl) subRadiusValEl.textContent = subRadiusEl.value + 'px';
    });
}

/* ── Centralised subtitle style reader ── */
function getSubtitleStyle() {
    return {
        size        : parseInt($('subtitle-size')?.value          || 24),
        color       : $('subtitle-color')?.value                  || '#ffffff',
        bgHex       : $('subtitle-bg')?.value                     || '#000000',
        bgOpacity   : parseInt($('subtitle-bg-opacity')?.value    || 60) / 100,
        strokeWidth : parseInt($('subtitle-stroke-width')?.value  || 0),
        strokeColor : $('subtitle-stroke-color')?.value           || '#000000',
        radius      : parseInt($('subtitle-radius')?.value        || 6),
        bold        : $('subtitle-bold')?.checked ?? true,
        uppercase   : $('subtitle-uppercase')?.checked ?? false,
        font        : $('subtitle-font')?.value                   || 'Inter, Arial, sans-serif',
        pos         : $('subtitle-pos')?.value                    || 'bottom',
    };
}

/* ── "Không nền" toggle button for subtitle background ── */
function toggleSubtitleNoBg(btn) {
    const opacityEl = $('subtitle-bg-opacity');
    if (!opacityEl) return;
    const isNoBg = btn.dataset.noBg === '1';
    if (isNoBg) {
        // Restore previous opacity
        opacityEl.value = btn.dataset.prevOpacity || '60';
        btn.dataset.noBg = '0';
        btn.style.color = 'var(--text-secondary)';
        btn.style.borderColor = 'var(--border)';
        btn.textContent = 'Không nền';
    } else {
        btn.dataset.prevOpacity = opacityEl.value;
        opacityEl.value = '0';
        btn.dataset.noBg = '1';
        btn.style.color = 'var(--primary)';
        btn.style.borderColor = 'var(--primary)';
        btn.textContent = '✓ Không nền';
    }
}

// ── Cover original subtitle controls ──
const coverOriginalEl  = $('cover-original-sub');
const coverSubOptions  = $('cover-sub-options');
const coverSubPosEl    = $('cover-sub-pos');
const coverSubPosVal   = $('cover-sub-pos-val');
const coverSubHeightEl = $('cover-sub-height');
const coverSubHeightVal= $('cover-sub-height-val');
const coverSubWidthEl  = $('cover-sub-width');
const coverSubRadiusEl = $('cover-sub-radius');
const coverSubRadiusVal= $('cover-sub-radius-val');
const coverSubWidthVal = $('cover-sub-width-val');

const coverSubOpacityEl= $('cover-sub-opacity');
const coverSubOpacityVal=$('cover-sub-opacity-val');

if (coverOriginalEl) {
    coverOriginalEl.addEventListener('change', () => {
        if (coverSubOptions) coverSubOptions.style.display = coverOriginalEl.checked ? 'block' : 'none';
        updateOriginalSubCoverPreview();
    });
}
if (coverSubPosEl) {
    coverSubPosEl.addEventListener('input', () => {
        if (coverSubPosVal) coverSubPosVal.textContent = coverSubPosEl.value + '%';
        updateOriginalSubCoverPreview();
    });
}
if (coverSubHeightEl) {
    coverSubHeightEl.addEventListener('input', () => {
        if (coverSubHeightVal) coverSubHeightVal.textContent = coverSubHeightEl.value + '%';
        updateOriginalSubCoverPreview();
    });
}
if (coverSubWidthEl) {
    coverSubWidthEl.addEventListener('input', () => {
        if (coverSubWidthVal) coverSubWidthVal.textContent = coverSubWidthEl.value + '%';
        updateOriginalSubCoverPreview();
    });
}
if (coverSubOpacityEl) {
    coverSubOpacityEl.addEventListener('input', () => {
        if (coverSubOpacityVal) coverSubOpacityVal.textContent = coverSubOpacityEl.value + '%';
        updateOriginalSubCoverPreview();
    });
}
if (coverSubRadiusEl) {
    coverSubRadiusEl.addEventListener('input', () => {
        if (coverSubRadiusVal) coverSubRadiusVal.textContent = coverSubRadiusEl.value + 'px';
        updateOriginalSubCoverPreview();
    });
}

/* ── Shared helper: read all cover params as ratios (0-1) ── */
function getCoverSubParams() {
    return {
        pos     : parseInt(coverSubPosEl?.value    || 20)  / 100,
        height  : parseInt(coverSubHeightEl?.value || 8)   / 100,
        width   : parseInt(coverSubWidthEl?.value  || 100) / 100,
        opacity : parseInt(coverSubOpacityEl?.value|| 100) / 100,
        radius  : parseInt(coverSubRadiusEl?.value || 0),
        color   : $('cover-sub-color')?.value || '#000000',
        snap    : $('snap-sub-to-cover')?.checked ?? true,
    };
}

/* ── Update the cover bar overlay in preview ── */
function updateOriginalSubCoverPreview() {
    const coverEl = $('original-sub-cover');
    if (!coverEl) return;

    const enabled = coverOriginalEl?.checked;
    if (!enabled || !DOM.videoPreview.src || DOM.videoPreview.style.display === 'none') {
        coverEl.style.display = 'none';
        return;
    }

    const p = getCoverSubParams();
    const cr = parseInt(p.color.slice(1,3),16);
    const cg = parseInt(p.color.slice(3,5),16);
    const cb = parseInt(p.color.slice(5,7),16);

    // Compute actual video content bounds (letterbox-aware)
    const bounds = getVideoContentBounds(DOM.videoPreview);

    const barH   = bounds.h * p.height;
    const barY   = bounds.y + bounds.h * (1 - p.pos - p.height);
    const barW   = bounds.w * p.width;
    const barX   = bounds.x + (bounds.w - barW) / 2; // centered

    // Scale border radius to preview box
    const nativeW = DOM.videoPreview.videoWidth || 1080;
    const scale   = bounds.w / nativeW;

    coverEl.style.display      = 'block';
    coverEl.style.top          = barY + 'px';
    coverEl.style.height       = barH + 'px';
    coverEl.style.left         = barX + 'px';
    coverEl.style.width        = barW + 'px';
    coverEl.style.background   = `rgba(${cr},${cg},${cb},${p.opacity})`;
    coverEl.style.borderRadius = Math.round(p.radius * scale) + 'px';
}



// Target lang helper
function getTargetLang() {
    return document.querySelector('input[name="target-lang"]:checked')?.value || 'en';
}

/* ================================================
   STEP 4 — VOICE GENERATION
   ================================================ */
function updateVoiceSections() {
    const lang = getTargetLang();
    DOM.voiceSectionEn.style.display = lang !== 'tl'   ? 'block' : 'none';
    DOM.voiceSectionTl.style.display = lang !== 'en'   ? 'block' : 'none';

    // Update export lang options
    DOM.exportLang.innerHTML = '';
    if (lang !== 'tl') DOM.exportLang.add(new Option('🇺🇸 Tiếng Anh', 'en'));
    if (lang !== 'en') DOM.exportLang.add(new Option('🇵🇭 Filipino', 'tl'));

    syncTTSProviderUI();
}

/* — TTS Provider toggle — */
function getTTSProvider() {
    return document.querySelector('input[name="tts-provider"]:checked')?.value || 'elevenlabs';
}

function syncTTSProviderUI() {
    const isEL = getTTSProvider() === 'elevenlabs';
    // English
    const gelEn  = $('voice-grid-el-en');
    const gttsEn = $('voice-grid-tts-en');
    if (gelEn)  gelEn.style.display  = isEL ? 'block' : 'none';
    if (gttsEn) gttsEn.style.display = isEL ? 'none'  : 'block';
    // Filipino
    const gelTl  = $('voice-grid-el-tl');
    const gttsTl = $('voice-grid-tts-tl');
    if (gelTl)  gelTl.style.display  = isEL ? 'block' : 'none';
    if (gttsTl) gttsTl.style.display = isEL ? 'none'  : 'block';
}

document.querySelectorAll('input[name="tts-provider"]').forEach(r => {
    r.addEventListener('change', syncTTSProviderUI);
});

// Range sliders live update
[[DOM.stabilityEn, DOM.stabilityEnVal], [DOM.similarityEn, DOM.similarityEnVal],
 [DOM.stabilityTl, DOM.stabilityTlVal], [DOM.similarityTl, DOM.similarityTlVal]
].forEach(([slider, label]) => {
    slider?.addEventListener('input', () => { label.textContent = slider.value; });
});

// Preview voice
DOM.btnPreviewEn.addEventListener('click', () => previewVoice('en'));
DOM.btnPreviewTl.addEventListener('click', () => previewVoice('tl'));

async function previewVoice(lang) {
    const provider = getTTSProvider();
    const text  = lang === 'en' ? DOM.previewTextEn.value : DOM.previewTextTl.value;
    const btn   = lang === 'en' ? DOM.btnPreviewEn : DOM.btnPreviewTl;
    const audio = lang === 'en' ? DOM.audioPreviewEn : DOM.audioPreviewTl;

    if (!text) { showToast('⚠️ Nhập câu thử giọng trước', 'warning'); return; }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    try {
        let blob;
        if (provider === 'ttsfree') {
            const ttsKey   = localStorage.getItem('sv2_ttsfree_key');
            if (!ttsKey) { showToast('❌ Chưa nhập TTSFree API key trong Cài đặt API', 'error'); return; }
            const voiceID  = lang === 'en' ? $('ttsfree-voice-en').value : $('ttsfree-voice-tl').value;
            const speed    = lang === 'en' ? $('ttsfree-speed-en').value  : $('ttsfree-speed-tl').value;
            blob = await callTTSFree(text, voiceID, speed, ttsKey);
        } else {
            const elKey  = localStorage.getItem('sv2_el_key');
            if (!elKey) { showToast('❌ Chưa nhập ElevenLabs API key', 'error'); return; }
            const voiceId = lang === 'en' ? DOM.voiceEn.value : DOM.voiceTl.value;
            const model   = lang === 'en' ? DOM.modelEn.value : DOM.modelTl.value;
            const stab    = lang === 'en' ? DOM.stabilityEn.value : DOM.stabilityTl.value;
            const sim     = lang === 'en' ? DOM.similarityEn.value : DOM.similarityTl.value;
            blob = await callElevenLabs(text, voiceId, model, parseFloat(stab), parseFloat(sim), elKey);
        }
        const url = URL.createObjectURL(blob);
        audio.src = url;
        audio.style.display = 'block';
        audio.play();
    } catch (err) {
        showToast('❌ Lỗi tạo giọng: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Thử';
    }
}

/* ——— TTSFree API ——— */
async function callTTSFree(text, voiceID, voiceSpeed, apiKey) {
    // TTSFree returns base64 audio in JSON
    // Note: may require CORS proxy in browser environment
    const CORS_PROXY = 'https://corsproxy.io/?' ; // fallback proxy
    const endpoint   = 'https://ttsfree.com/api/v1/tts';

    const body = JSON.stringify({
        text,
        voiceService: 'servicebin', // Microsoft Neural voices
        voiceID,
        voiceSpeed: String(voiceSpeed ?? 0),
    });

    // Try direct first, then CORS proxy
    let res;
    try {
        res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body,
        });
    } catch {
        // Direct blocked by CORS — use proxy
        res = await fetch(CORS_PROXY + encodeURIComponent(endpoint), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body,
        });
    }

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`TTSFree HTTP ${res.status}: ${txt.slice(0, 200)}`);
    }

    const data = await res.json();
    if (data.status !== 'success' || !data.audioData) {
        throw new Error(data.mess || data.error || 'TTSFree không trả về audio');
    }

    // Decode base64 → Blob
    const binary   = atob(data.audioData);
    const bytes    = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: 'audio/mpeg' });
}

async function callElevenLabs(text, voiceId, model, stability, similarityBoost, apiKey) {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
        },
        body: JSON.stringify({
            text,
            model_id: model,
            voice_settings: { stability, similarity_boost: similarityBoost }
        })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail?.message || err.detail || res.statusText);
    }
    return await res.blob();
}

// Generate all
DOM.btnGenerateVoice.addEventListener('click', async () => {
    const provider = getTTSProvider();
    const ttsKey   = provider === 'ttsfree'
        ? localStorage.getItem('sv2_ttsfree_key')
        : localStorage.getItem('sv2_el_key');

    if (!ttsKey) {
        const svc = provider === 'ttsfree' ? 'TTSFree' : 'ElevenLabs';
        showToast(`⚠️ Chưa nhập ${svc} API key trong Cài đặt`, 'warning');
        return;
    }

    const lang  = getTargetLang();
    const langs = lang === 'both' ? ['en', 'tl'] : [lang];

    const segsToProcess = state.segments.filter(s => langs.some(l => s[l]?.trim()));
    if (!segsToProcess.length) { showToast('⚠️ Chưa có bản dịch. Quay lại Bước 3.', 'warning'); return; }

    DOM.btnGenerateVoice.disabled = true;
    DOM.generateProgress.style.display = 'block';

    let done = 0;
    const total = segsToProcess.length * langs.length;

    for (const seg of segsToProcess) {
        for (const l of langs) {
            if (!seg[l]?.trim()) continue;

            const svcLabel = provider === 'ttsfree' ? 'TTSFree' : 'ElevenLabs';
            DOM.generateStatusText.textContent = `[${svcLabel}] Đang tạo giọng ${l.toUpperCase()} — phân đoạn ${seg.id + 1}/${segsToProcess.length}…`;

            try {
                let blob;
                if (provider === 'ttsfree') {
                    const voiceID = l === 'en' ? $('ttsfree-voice-en').value : $('ttsfree-voice-tl').value;
                    const speed   = l === 'en' ? $('ttsfree-speed-en').value  : $('ttsfree-speed-tl').value;
                    blob = await callTTSFree(seg[l], voiceID, speed, ttsKey);
                } else {
                    const voiceId = l === 'en' ? DOM.voiceEn.value : DOM.voiceTl.value;
                    const model   = l === 'en' ? DOM.modelEn.value : DOM.modelTl.value;
                    const stab    = parseFloat(l === 'en' ? DOM.stabilityEn.value : DOM.stabilityTl.value);
                    const sim     = parseFloat(l === 'en' ? DOM.similarityEn.value : DOM.similarityTl.value);
                    blob = await callElevenLabs(seg[l], voiceId, model, stab, sim, ttsKey);
                }
                seg[`audioBlob${l.charAt(0).toUpperCase() + l.slice(1)}`] = blob;
            } catch (err) {
                console.error(`Segment ${seg.id} error:`, err);
                showToast(`⚠️ Phân đoạn ${seg.id + 1}: ${err.message}`, 'warning');
            }

            done++;
            const pct = Math.round((done / total) * 100);
            DOM.generateProgressBar.style.width = pct + '%';
            DOM.generateCount.textContent = `${done} / ${total} phân đoạn`;
        }
    }

    state.generatedLangs = langs;
    DOM.btnGenerateVoice.disabled = false;
    DOM.generateStatusText.textContent = '✅ Hoàn thành!';
    DOM.btnStep4Next.disabled = false;
    updateSegmentSidebar();
    showToast('✅ Đã tạo xong toàn bộ giọng đọc!', 'success');
    DOM.btnStep4Next.disabled = false;

    // Show dubbed preview button + lang switcher
    const dubbedBtn    = $('btn-preview-dubbed');
    const langWrap     = $('dubbed-lang-wrap');
    const hasBoth      = langs.includes('en') && langs.includes('tl');

    if (dubbedBtn) {
        dubbedBtn.style.display = 'flex';
        dubbedBtn.style.alignItems = 'center';
        dubbedBtn.style.gap = '.4rem';
    }

    if (langWrap) {
        langWrap.style.display = hasBoth ? 'flex' : 'none';
        // Default to EN for dubbed preview
        state.dubbedLang = langs[0] || 'en';
        const btnEn = $('dubbed-btn-en');
        const btnTl = $('dubbed-btn-tl');
        if (btnEn) btnEn.classList.toggle('active', state.dubbedLang === 'en');
        if (btnTl) btnTl.classList.toggle('active', state.dubbedLang === 'tl');
        // Hide TL button if only EN generated (and vice versa)
        if (btnEn) btnEn.style.display = langs.includes('en') ? '' : 'none';
        if (btnTl) btnTl.style.display = langs.includes('tl') ? '' : 'none';
    }

    enableDubbedMode(false); // don't auto-enable — user clicks 'Preview Dubbed' when ready
    showToast('✅ Giọng đọc xong! Nhấn "Giọng AI" để nghe thử.', 'success');

    // Decode durations + show Timeline in background (no block)
    setTimeout(() => {
        computeAudioDurations().then(() => {
            showTimeline();
            timelineFit();
        });
    }, 200);
});

/* ================================================
   STEP 5 — EXPORT
   ================================================ */
function addExportLangOption() {
    const lang = getTargetLang();
    if (lang !== 'tl') DOM.exportLang.add(new Option('🇺🇸 Tiếng Anh', 'en'));
    if (lang !== 'en') DOM.exportLang.add(new Option('🇵🇭 Filipino', 'tl'));
}

function updateExportInfo() {
    const lang = getTargetLang();
    const baseName = state.videoFile?.name.replace(/\.[^.]+$/, '') || 'output';
    const fmt = DOM.exportFormat?.value || 'mp4';
    DOM.exportInfoName.textContent = `${baseName}_dubbed_${lang}.${fmt}`;
    DOM.exportInfoDuration.textContent = formatDuration(state.videoDuration || 0);
    const blobKey = `audioBlob${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
    const cnt = state.segments.filter(s => s[blobKey]).length;
    DOM.exportInfoSegments.textContent = `${cnt} / ${state.segments.length}`;
}

/* ── Global Voice Speed slider ── */
const globalSpeedSlider = document.getElementById('global-voice-speed');
const globalSpeedVal    = document.getElementById('global-speed-val');
if (globalSpeedSlider) {
    globalSpeedSlider.value = state.globalSpeed || 1.0;
    if (globalSpeedVal) globalSpeedVal.textContent = (state.globalSpeed || 1.0).toFixed(2) + '×';
    globalSpeedSlider.addEventListener('input', () => {
        const r = parseFloat(globalSpeedSlider.value);
        state.globalSpeed = r;
        if (globalSpeedVal) globalSpeedVal.textContent = r.toFixed(2) + '×';
        // Invalidate dubbed preview cache so it rebuilds with new speed
        invalidateMergedBuffer(null);
        renderTimeline();
    });
}

DOM.btnExport.addEventListener('click', exportVideo);

async function exportVideo() {
    if (!state.videoFile) { showToast('⚠️ Chưa upload video', 'warning'); return; }

    const lang = DOM.exportLang.value;
    const blobKey = `audioBlob${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
    const hasAudio = state.segments.some(s => s[blobKey]);

    DOM.btnExport.disabled = true;
    DOM.exportProgress.style.display = 'block';
    DOM.exportResult.style.display = 'none';

    try {
        // Try to use ffmpeg.wasm if available, otherwise fall back to simple download
        if (typeof FFmpeg !== 'undefined') {
            await exportWithFFmpeg(lang, blobKey);
        } else {
            // Fallback: export without re-encoding
            await exportSimple(lang, blobKey);
        }
    } catch (err) {
        console.error(err);
        showToast('❌ Lỗi xuất video: ' + err.message, 'error');
    } finally {
        DOM.btnExport.disabled = false;
    }
}

async function exportSimple(lang, blobKey) {
    const baseName = state.videoFile.name.replace(/\.[^.]+$/, '');
    DOM.exportStatusText.textContent = 'Đang ghép audio AI vào video…';
    DOM.exportProgressBar.style.width = '10%';

    try {
        // ── Step 1: Pre-render dubbed audio via OfflineAudioContext ──
        DOM.exportStatusText.textContent = 'Đang render audio AI…';
        DOM.exportProgressBar.style.width = '20%';

        const mergedAudioBuffer = await mergeAudioSegments(lang, blobKey);
        if (!mergedAudioBuffer) {
            showToast('⚠️ Không có audio AI để ghép. Hãy tạo giọng trước.', 'warning');
            DOM.exportProgress.style.display = 'none';
            return;
        }

        // ── Step 2: Mux video + dubbed audio via Canvas + MediaRecorder ──
        DOM.exportStatusText.textContent = 'Đang ghép video + giọng AI (MediaRecorder)…';
        DOM.exportProgressBar.style.width = '40%';

        const videoBlob = await muxVideoWithAudio(mergedAudioBuffer, lang, blobKey);

        DOM.exportProgressBar.style.width = '95%';
        DOM.exportStatusText.textContent = 'Đang tạo file tải về…';

        const url = URL.createObjectURL(videoBlob);
        DOM.btnDownloadVideo.href = url;
        const ext = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
        DOM.btnDownloadVideo.download = `${baseName}_dubbed_${lang}.${ext}`;

    } catch (err) {
        console.error('[Export] mux failed:', err);
        // ── Fallback: audio-only WAV ──
        showToast('⚠️ Không ghép được video, tải audio WAV thay thế.', 'warning');
        try {
            const wavBuf = await mergeAudioSegments(lang, blobKey);
            if (wavBuf) {
                const wavBlob = audioBufferToWavBlob(wavBuf);
                const url = URL.createObjectURL(wavBlob);
                DOM.btnDownloadVideo.href = url;
                DOM.btnDownloadVideo.download = `${baseName}_dubbed_${lang}.wav`;
            }
        } catch (_) {}
    }

    DOM.exportProgressBar.style.width = '100%';
    DOM.exportStatusText.textContent = '✅ Hoàn thành!';
    await sleep(400);
    DOM.exportProgress.style.display = 'none';
    DOM.exportResult.style.display = 'flex';
    DOM.btnDownloadSrt.onclick = () => downloadSRT(lang);
    showToast('✅ Xử lý xong! Nhấn "Tải video" để lưu.', 'success');
}

/* ── Mux: play video on canvas, replace audio track with dubbed buffer ── */
async function muxVideoWithAudio(dubbedAudioBuffer, lang, blobKey) {
    return new Promise(async (resolve, reject) => {
        const video = document.createElement('video');
        video.src = state.videoURL;
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';

        await new Promise((res, rej) => {
            video.onloadedmetadata = res;
            video.onerror = rej;
        });

        const W = video.videoWidth  || 1280;
        const H = video.videoHeight || 720;
        const fps = 30;
        const duration = state.videoDuration || video.duration;

        // Canvas to capture video frames
        const canvas = document.createElement('canvas');
        canvas.width  = W;
        canvas.height = H;
        const ctx2d = canvas.getContext('2d');

        // AudioContext to play dubbed buffer and capture its stream
        const audioCtx = new AudioContext();
        const src = audioCtx.createBufferSource();
        src.buffer = dubbedAudioBuffer;

        // Only AI voice — original audio muted
        const dubbedGain = audioCtx.createGain();
        dubbedGain.gain.value = 1.0;

        // Capture destination
        const dest = audioCtx.createMediaStreamDestination();

        src.connect(dubbedGain);
        dubbedGain.connect(dest);

        // Combined stream: canvas video + mixed audio
        const videoStream = canvas.captureStream(fps);
        const audioStream = dest.stream;
        const combined   = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
        ]);

        // MediaRecorder
        const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=h264,aac')
            ? 'video/mp4;codecs=h264,aac'
            : MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
            ? 'video/webm;codecs=vp9,opus'
            : 'video/webm';

        const recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 5_000_000 });
        const chunks = [];
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
            audioCtx.close();
            resolve(new Blob(chunks, { type: mimeType }));
        };
        recorder.onerror = e => { audioCtx.close(); reject(e.error); };

        // Draw loop — video frame + burned subtitles synced to sequential audio position
        let rafId;
        let stopped = false;
        let audioCtxStartTime = 0; // set when audio starts
        const draw = () => {
            if (stopped) return;
            ctx2d.drawImage(video, 0, 0, W, H);
            const audioTime = audioCtxStartTime
                ? (audioCtx.currentTime - audioCtxStartTime)
                : video.currentTime;
            drawSubtitlesOnCanvas(ctx2d, audioTime, W, H, lang);
            rafId = requestAnimationFrame(draw);
        };

        recorder.start(200); // collect every 200ms

        // Start playback — video and sequential audio both from t=0
        video.currentTime = 0;
        await video.play();
        src.start(0);
        audioCtxStartTime = audioCtx.currentTime;
        draw();

        // Total time = max(video duration, voice duration)
        const voiceDuration = dubbedAudioBuffer.duration;
        const totalDuration = Math.max(duration, voiceDuration);

        // Update progress bar
        const progressInterval = setInterval(() => {
            const elapsed = audioCtxStartTime
                ? (audioCtx.currentTime - audioCtxStartTime)
                : video.currentTime;
            const pct = 40 + Math.round((elapsed / totalDuration) * 55);
            DOM.exportProgressBar.style.width = Math.min(pct, 95) + '%';
            DOM.exportStatusText.textContent =
                `Đang mã hoá video… ${Math.round(elapsed)}s / ${Math.round(totalDuration)}s`;
        }, 500);

        // Stop when video ends (if audio is longer, let audio finish too)
        video.onended = () => {
            if (voiceDuration <= duration) {
                // Audio ≤ video — stop immediately
                stopped = true;
                cancelAnimationFrame(rafId);
                clearInterval(progressInterval);
                video.pause();
                recorder.stop();
            } else {
                // Audio is longer than video — auto-extend with video shuffler clips
                cancelAnimationFrame(rafId);
                autoExtendWithShuffleClips(
                    video, ctx2d, W, H,
                    audioCtx, audioCtxStartTime,
                    voiceDuration, lang,
                    progressInterval,
                    recorder,
                    () => { stopped = true; }
                );
            }
        };

        // Safety timeout
        setTimeout(() => {
            if (!stopped) {
                stopped = true;
                cancelAnimationFrame(rafId);
                clearInterval(progressInterval);
                try { recorder.stop(); } catch (_) {}
            }
        }, (totalDuration + 5) * 1000);
    });
}


/* ── Auto-extend video with random shuffle clips when voice > video duration ── */
async function autoExtendWithShuffleClips(
    video, ctx2d, W, H,
    audioCtx, audioCtxStartTime,
    voiceDuration, lang,
    progressInterval,
    recorder,
    markStopped
) {
    const videoDur = video.duration || state.videoDuration || 0;
    if (!videoDur) { recorder.stop(); markStopped(); return; }

    // Minimum clip length so we have enough varied segments (1.5s – 4s)
    const MIN_CLIP = 1.5;
    const MAX_CLIP = 4.0;

    showToast('🔀 Voice dài hơn video — đang nối thêm đoạn cắt ngẫu nhiên…', 'info', 3000);

    const playNextClip = () => {
        // Check elapsed audio time
        const audioElapsed = audioCtx.currentTime - audioCtxStartTime;
        if (audioElapsed >= voiceDuration) {
            clearInterval(progressInterval);
            recorder.stop();
            markStopped();
            return;
        }

        // Pick a random clip: random start, random length
        const clipLen   = MIN_CLIP + Math.random() * (MAX_CLIP - MIN_CLIP);
        const maxStart  = Math.max(0, videoDur - clipLen - 0.1);
        const clipStart = Math.random() * maxStart;

        video.currentTime = clipStart;

        // Once seeked, play the clip
        const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            video.play().catch(() => {});

            let clipRaf;
            let clipStartCtxTime = audioCtx.currentTime;
            const clipEndCtxTime = clipStartCtxTime + clipLen;

            const drawClip = () => {
                const nowCtx = audioCtx.currentTime;
                const audioElapsed2 = nowCtx - audioCtxStartTime;

                // Draw frame + subtitles
                ctx2d.drawImage(video, 0, 0, W, H);
                drawSubtitlesOnCanvas(ctx2d, audioElapsed2, W, H, lang);

                if (audioElapsed2 >= voiceDuration) {
                    // Voice finished — stop everything
                    video.pause();
                    cancelAnimationFrame(clipRaf);
                    clearInterval(progressInterval);
                    recorder.stop();
                    markStopped();
                } else if (nowCtx >= clipEndCtxTime) {
                    // This clip finished — move to next
                    video.pause();
                    cancelAnimationFrame(clipRaf);
                    playNextClip();
                } else {
                    clipRaf = requestAnimationFrame(drawClip);
                }
            };
            clipRaf = requestAnimationFrame(drawClip);
        };

        video.addEventListener('seeked', onSeeked, { once: true });
    };

    // Start the first shuffle clip
    playNextClip();
}


function drawSubtitlesOnCanvas(ctx, audioTime, W, H, exportLang) {
    // ── Cover original burned-in subtitle first ──
    const coverEnabled = document.getElementById('cover-original-sub')?.checked;
    let cp = null; // cover params — reused for subtitle snap
    if (coverEnabled) {
        cp = getCoverSubParams();
        const cr = parseInt(cp.color.slice(1,3),16);
        const cg = parseInt(cp.color.slice(3,5),16);
        const cb = parseInt(cp.color.slice(5,7),16);
        const coverW = W * cp.width;
        const coverX = (W - coverW) / 2;          // centered
        const coverY = H * (1 - cp.pos - cp.height);
        const coverH = H * cp.height;
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${cp.opacity})`;
        ctx.beginPath();
        ctx.roundRect?.(coverX, coverY, coverW, coverH, cp.radius) || 
            ctx.rect(coverX, coverY, coverW, coverH);
        ctx.fill();
    }

    const mode = document.getElementById('subtitle-mode')?.value || 'none';
    if (mode === 'none') return;

    // Find which segment is playing at this sequential audio position
    const lang   = exportLang || 'en';
    const speed  = state.globalSpeed || 1.0;
    let   seg    = null;
    let   offset = 0;
    for (const s of state.segments) {
        const bk = `audioBlob${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
        if (!s[bk]) continue;
        const audioDur = s._audioDuration?.[lang] || (s.end - s.start);
        const seqDur   = audioDur / speed;
        const segStart = s._voiceOffset?.[lang] ?? offset;
        if (audioTime >= segStart && audioTime < segStart + seqDur) { seg = s; break; }
        offset = segStart + seqDur;
    }
    if (!seg) return;

    let lines = [];
    if      (mode === 'source') lines = [seg.cn].filter(Boolean);
    else if (mode === 'target') lines = [seg[lang] || seg.cn].filter(Boolean);
    else if (mode === 'both')   lines = [seg[lang], seg.cn].filter(Boolean);
    if (!lines.length) return;

    const ss = getSubtitleStyle();
    if (ss.uppercase) lines = lines.map(l => l ? l.toUpperCase() : l);

    ctx.save();
    ctx.font         = `${ss.bold ? 'bold' : 'normal'} ${ss.size}px ${ss.font}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';

    // ── Determine usable zone for subtitle ──────────────────────────────────
    let safeX, safeW, computeRectY;
    const snapToCover = coverEnabled && cp?.snap;

    if (snapToCover) {
        const coverW = W * cp.width;
        safeX = (W - coverW) / 2 + W * 0.02;
        safeW = coverW - W * 0.04;
        const coverZoneTop = H * (1 - cp.pos - cp.height);
        const coverZoneH   = H * cp.height;
        computeRectY = (rectH) => coverZoneTop + (coverZoneH - rectH) / 2;
    } else {
        const safeH = Math.round(H * 0.10);
        safeX = Math.round(W * 0.10);
        safeW = W - safeX * 2;
        computeRectY = (rectH) => ss.pos === 'bottom'
            ? H - safeH - rectH
            : safeH;
    }

    // Word-wrap each line to fit the usable width
    const wrappedLines = [];
    for (const line of lines) {
        wrappedLines.push(...wrapCanvasText(ctx, line, safeW));
    }
    if (!wrappedLines.length) { ctx.restore(); return; }

    const fontSize = ss.size;
    const lineH  = Math.round(fontSize * 1.5);
    const padX   = Math.round(fontSize * 0.7);
    const padY   = Math.round(fontSize * 0.35);

    const maxTextW = wrappedLines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);
    const rectW    = Math.min(maxTextW + padX * 2, safeW);
    const rectH    = wrappedLines.length * lineH + padY * 2;
    const rectX    = (W - rectW) / 2;
    const rectY    = computeRectY(rectH);

    // Background box
    const br = parseInt(ss.bgHex.slice(1,3), 16);
    const bg = parseInt(ss.bgHex.slice(3,5), 16);
    const bb = parseInt(ss.bgHex.slice(5,7), 16);
    ctx.fillStyle = `rgba(${br},${bg},${bb},${ss.bgOpacity})`;
    const radius  = ss.radius;
    ctx.beginPath();
    ctx.roundRect?.(rectX, rectY, rectW, rectH, radius) ||
        ctx.rect(rectX, rectY, rectW, rectH);
    ctx.fill();

    // Text with optional stroke
    wrappedLines.forEach((line, i) => {
        const ty = rectY + padY + lineH * i + fontSize;
        if (ss.strokeWidth > 0) {
            ctx.lineWidth   = ss.strokeWidth * 2;
            ctx.strokeStyle = ss.strokeColor;
            ctx.lineJoin    = 'round';
            ctx.strokeText(line, W / 2, ty);
        }
        ctx.fillStyle = ss.color;
        ctx.fillText(line, W / 2, ty);
    });

    ctx.restore();
}


/* Word-wrap text to fit maxWidth pixels on a canvas context */
function wrapCanvasText(ctx, text, maxWidth) {
    if (!text) return [];
    const words = text.split(' ');
    if (words.length === 1) return [text]; // single word, no wrap needed
    const rows = [];
    let cur = '';
    for (const word of words) {
        const test = cur ? cur + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && cur) {
            rows.push(cur);
            cur = word;
        } else {
            cur = test;
        }
    }
    if (cur) rows.push(cur);
    return rows.length ? rows : [text];
}

async function mergeAudioSegments(lang, blobKey) {
    const segsWithAudio = state.segments.filter(s => s[blobKey]);
    if (!segsWithAudio.length) return null;

    const sampleRate  = 44100;
    const speed       = state.globalSpeed || 1.0;

    // Total sequential duration = sum of all audioDur / speed
    let totalSeqDur = 0;
    const metaList  = [];
    for (const seg of segsWithAudio) {
        const ab  = await seg[blobKey].arrayBuffer();
        metaList.push({ seg, ab });
    }
    // Pre-decode to get durations
    const tmpCtx = new OfflineAudioContext(1, 1024, sampleRate);
    for (const m of metaList) {
        try {
            const buf = await tmpCtx.decodeAudioData(m.ab.slice(0));
            m.buf     = buf;
            totalSeqDur += buf.duration / speed;
        } catch { totalSeqDur += (m.seg.end - m.seg.start); }
    }

    let offCtx;
    const frameCount = Math.ceil((totalSeqDur + 0.5) * sampleRate);
    try   { offCtx = new OfflineAudioContext(2, frameCount, sampleRate); }
    catch { offCtx = new OfflineAudioContext(1, frameCount, sampleRate); }

    // Sequential placement — each segment starts exactly after previous ends
    let seqOffset = 0;
    for (const m of metaList) {
        if (!m.buf) continue;
        try {
            const buf2 = await offCtx.decodeAudioData(await m.seg[blobKey].arrayBuffer());
            const source = offCtx.createBufferSource();
            source.buffer = buf2;
            source.playbackRate.value = speed;
            source.connect(offCtx.destination);
            source.start(seqOffset);
            // Cache sequential offset (used for subtitle sync in export)
            m.seg._voiceOffset        = m.seg._voiceOffset || {};
            m.seg._voiceOffset[lang]  = seqOffset;
            seqOffset += buf2.duration / speed;
        } catch (e) {
            console.warn('Could not decode audio segment', m.seg.id, e);
        }
    }

    return offCtx.startRendering();
}

async function exportWithFFmpeg(lang, blobKey) {
    // Placeholder for ffmpeg.wasm integration
    showToast('ℹ️ FFmpeg.wasm integration coming soon', 'info');
    await exportSimple(lang, blobKey);
}

/* SRT Export */
function downloadSRT(lang) {
    const segs = state.segments.filter(s => s[lang]?.trim());
    let srt = '';
    segs.forEach((seg, i) => {
        srt += `${i + 1}\n`;
        srt += `${toSRTTime(seg.start)} --> ${toSRTTime(seg.end)}\n`;
        srt += `${seg[lang]}\n\n`;
    });
    const blob = new Blob([srt], { type: 'text/srt' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `subtitles_${lang}.srt`;
    a.click();
    URL.revokeObjectURL(url);
}

function toSRTTime(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    const ms = Math.round((seconds % 1) * 1000).toString().padStart(3, '0');
    return `${h}:${m}:${s},${ms}`;
}

DOM.btnNewProject.addEventListener('click', () => {
    if (confirm('Bắt đầu dự án mới? Dữ liệu hiện tại sẽ bị xóa.')) {
        resetAll();
    }
});

function resetAll() {
    state.segments = [];
    state.generatedLangs = [];
    resetVideoUpload();
    DOM.cnText.value = '';
    DOM.transcribeResult.style.display = 'none';
    DOM.translationTable.innerHTML = '';
    DOM.generateProgress.style.display = 'none';
    DOM.exportResult.style.display = 'none';
    DOM.exportProgress.style.display = 'none';
    DOM.segmentListWrap.style.display = 'none';
    goToStep(1);
    showToast('🆕 Dự án mới đã sẵn sàng', 'info');
}

DOM.btnReset.addEventListener('click', () => {
    if (confirm('Đặt lại toàn bộ? Tất cả dữ liệu sẽ bị xóa.')) resetAll();
});

/* ================================================
   DUBBED PREVIEW ENGINE v5 — "Merged Buffer"
   ================================================
   Uses OfflineAudioContext to pre-render ALL voice
   segments into ONE seamless AudioBuffer that spans
   the full video duration. Each segment is placed at
   its exact start time with the correct playback rate.

   Playback = one AudioBufferSourceNode started at
   offset = video.currentTime → perfectly seamless,
   zero per-segment logic needed.
   ================================================ */
const DUBBED_MAX_RATE = 1.8;

/* ── Global playback speed (single control for all segments) ── */
if (!state.globalSpeed) state.globalSpeed = 1.0;

state.dubbedMode           = false;
state.dubbedAudioCtx       = null;
state.dubbedMergedBuffers  = {};   // { en: AudioBuffer, tl: AudioBuffer }
state.dubbedActiveSrc      = null;
state.dubbedActiveGain     = null;
state.dubbedBuilding       = false;

function getDubbedBlobKey() {
    const lang = state.dubbedLang || 'en';
    return `audioBlob${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
}

function setDubbedLang(lang) {
    state.dubbedLang = lang;
    const btnEn = $('dubbed-btn-en');
    const btnTl = $('dubbed-btn-tl');
    if (btnEn) btnEn.classList.toggle('active', lang === 'en');
    if (btnTl) btnTl.classList.toggle('active', lang === 'tl');
    if (state.dubbedMode) {
        dubbedReset();
        if (!DOM.videoPreview.paused) dubbedPlay();
    }
}

function getOrCreateAudioCtx() {
    if (!state.dubbedAudioCtx || state.dubbedAudioCtx.state === 'closed') {
        state.dubbedAudioCtx = new AudioContext();
    }
    return state.dubbedAudioCtx;
}

function enableDubbedMode(on) {
    state.dubbedMode = on;
    DOM.videoPreview.muted = on;
    const btn = $('btn-preview-dubbed');
    if (btn) {
        btn.classList.toggle('active', on);
        btn.title = on ? 'Đang nghe giọng AI — click để tắt' : 'Preview giọng AI đã tạo';
        btn.innerHTML = on
            ? '<i class="fa-solid fa-ear-listen"></i> Giọng AI'
            : '<i class="fa-solid fa-ear-listen"></i> Preview Dubbed';
    }
    if (!on) {
        dubbedReset();
    } else if (!DOM.videoPreview.paused) {
        dubbedPlay();
    }
}

function dubbedReset() {
    state._shuffleLooping = false; // stop any active preview shuffle loop
    if (state.dubbedActiveSrc) {
        try { state.dubbedActiveSrc.stop(); } catch {}
        try { state.dubbedActiveSrc.disconnect(); } catch {}
        state.dubbedActiveSrc = null;
    }
    if (state.dubbedActiveGain) {
        try { state.dubbedActiveGain.disconnect(); } catch {}
        state.dubbedActiveGain = null;
    }
}

/* ── Preview shuffle: loop random clips when voice > video ── */
function _playShuffleClip() {
    const video  = DOM.videoPreview;
    const dur    = state.videoDuration || video.duration || 0;
    if (!dur) return;

    const MIN_CLIP = 2.0;
    const MAX_CLIP = 5.0;
    const clipLen  = MIN_CLIP + Math.random() * (MAX_CLIP - MIN_CLIP);
    const maxStart = Math.max(0, dur - clipLen - 0.1);
    const clipStart = Math.random() * maxStart;

    state._shuffleLooping = true;
    video.currentTime = clipStart;
    video.play().catch(() => {});
}

function dubbedPlay() {
    startMergedSource().catch(e => console.warn('[Dubbed] play error', e));
}
function dubbedOnUserPause() { dubbedReset(); }
function syncDubbedAudio()   {} // no-op — merged buffer handles sync

/* ── Render all segments into one sequential AudioBuffer for preview ── */
async function renderMergedBuffer(lang) {
    const blobKey = `audioBlob${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
    if (!state.videoDuration) return null;

    const sampleRate = 44100;
    const speed      = state.globalSpeed || 1.0;

    // Collect segments with audio and decode them
    const decoded = [];
    for (const seg of state.segments) {
        if (!seg[blobKey]) continue;
        try {
            const ab  = await seg[blobKey].arrayBuffer();
            // Temporary ctx just for decoding — avoids reuse issues
            const tmpCtx = new OfflineAudioContext(1, 1024, sampleRate);
            const buf    = await tmpCtx.decodeAudioData(ab);
            decoded.push({ seg, buf });

            // Cache decoded duration
            seg._audioDuration       = seg._audioDuration || {};
            seg._audioDuration[lang] = buf.duration;
        } catch (e) {
            console.warn('[Merged] decode fail', seg.id, e);
        }
        await new Promise(r => setTimeout(r, 0)); // yield
    }

    if (!decoded.length) return null;

    // Total sequential length
    const totalSeqDur = decoded.reduce((s, d) => s + d.buf.duration / speed, 0);
    const frameCount  = Math.ceil((totalSeqDur + 0.5) * sampleRate);

    let offCtx;
    try   { offCtx = new OfflineAudioContext(2, frameCount, sampleRate); }
    catch { offCtx = new OfflineAudioContext(1, frameCount, sampleRate); }

    // Place each segment SEQUENTIALLY — no overlap, no gap
    let seqOffset = 0;
    for (const { seg, buf } of decoded) {
        const src2 = offCtx.createBufferSource();
        src2.buffer             = buf;
        src2.playbackRate.value = speed;
        src2.connect(offCtx.destination);
        src2.start(seqOffset);

        // Cache sequential offset so subtitle overlay can sync
        seg._voiceOffset        = seg._voiceOffset || {};
        seg._voiceOffset[lang]  = seqOffset;

        seqOffset += buf.duration / speed;
    }

    return offCtx.startRendering();
}

/* ── Start playing the merged buffer from current video time ── */
async function startMergedSource() {
    // Guard: don't start a new build if one is already in progress
    if (state.dubbedBuilding) return;

    dubbedReset(); // stop any previous source

    if (!state.dubbedMode) return;

    const lang = state.dubbedLang || 'en';

    // Build if not cached
    if (!state.dubbedMergedBuffers[lang]) {
        state.dubbedBuilding = true;
        const buildBtn = $('btn-preview-dubbed');
        if (buildBtn) buildBtn.textContent = '⏳ Đang ghép...';

        try {
            state.dubbedMergedBuffers[lang] = await renderMergedBuffer(lang);
        } catch (e) {
            console.error('[Merged] Build failed', e);
            state.dubbedBuilding = false;
            showToast('❌ Lỗi khi ghép audio', 'error');
            return;
        }
        state.dubbedBuilding = false;

        if (buildBtn) {
            buildBtn.innerHTML = '<i class="fa-solid fa-ear-listen"></i> Giọng AI';
        }
        if (!state.dubbedMode || DOM.videoPreview.paused) return;
    }

    const mergedBuf = state.dubbedMergedBuffers[lang];
    if (!mergedBuf) return;

    const ctx = getOrCreateAudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();

    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    const src = ctx.createBufferSource();
    src.buffer = mergedBuf;
    src.connect(gain);

    // Map video currentTime → sequential audio offset
    // All segs whose video-start <= currentTime contribute their full audio duration
    const lang2  = state.dubbedLang || 'en';
    const bk2    = `audioBlob${lang2.charAt(0).toUpperCase() + lang2.slice(1)}`;
    const speed2 = state.globalSpeed || 1.0;
    let seqAudioOffset = 0;
    for (const seg of state.segments) {
        if (!seg[bk2]) continue;
        if (seg.start > DOM.videoPreview.currentTime) break;
        const audioDur = seg._audioDuration?.[lang2] || (seg.end - seg.start);
        seqAudioOffset += audioDur / speed2;
    }

    const duration = mergedBuf.duration - seqAudioOffset;
    if (duration <= 0.01) return;

    src.start(0, seqAudioOffset, duration);
    // Store start reference so subtitle overlay can compute current voice segment
    state.dubbedSeqOffset   = seqAudioOffset;
    state.dubbedSeqCtxStart = (getOrCreateAudioCtx()).currentTime;
    state.dubbedActiveSrc  = src;
    state.dubbedActiveGain = gain;

    src.onended = () => {
        if (state.dubbedActiveSrc !== src) return;
        state.dubbedActiveSrc  = null;
        state.dubbedActiveGain = null;
        state._shuffleLooping  = false; // voice finished — stop video shuffle loop
        // Pause the video if it was looping shuffle clips
        if (!DOM.videoPreview.paused && !DOM.videoPreview.ended) {
            DOM.videoPreview.pause();
        }
        try { gain.disconnect(); } catch {}
    };
}

/* ── Invalidate cache when speed changes ── */
function invalidateMergedBuffer(lang) {
    if (lang)  delete state.dubbedMergedBuffers[lang];
    else       state.dubbedMergedBuffers = {};
    if (state.dubbedMode) {
        dubbedReset();
        if (!DOM.videoPreview.paused) dubbedPlay();
    }
}

/* ================================================
   SUBTITLE OVERLAY
   ================================================ */
function updateSubtitleOverlay() {
    const currentTime = DOM.videoPreview.currentTime;
    const mode = DOM.subtitleMode.value;
    if (mode === 'none') { DOM.subtitleOverlay.innerHTML = ''; return; }

    const seg = state.segments.find(s => currentTime >= s.start && currentTime < s.end);
    if (!seg) { DOM.subtitleOverlay.innerHTML = ''; return; }

    const lang = getTargetLang() === 'tl' ? 'tl' : 'en';
    let rawLines = [];
    if      (mode === 'source') rawLines = [seg.cn];
    else if (mode === 'target') rawLines = [seg[lang] || seg.cn];
    else if (mode === 'both')   rawLines = [seg[lang] || '', seg.cn];

    const ss      = getSubtitleStyle();
    const sizeBase = ss.size;

    // Compute pixel-accurate bounds of actual video content (handles letterbox/pillarbox)
    const bounds = getVideoContentBounds(DOM.videoPreview);

    // Scale font size to match the actual rendered video content width.
    const nativeW = DOM.videoPreview.videoWidth || 1080;
    const scale   = bounds.w / nativeW;
    const size    = Math.max(8, Math.round(sizeBase * scale));

    // Position overlay to match the actual video content area
    const ov = DOM.subtitleOverlay;
    ov.style.position = 'absolute';
    ov.style.left     = bounds.x + 'px';
    ov.style.width    = bounds.w + 'px';
    ov.style.top      = 'auto';
    ov.style.bottom   = 'auto';
    if (ss.pos === 'top') {
        ov.style.top  = (bounds.y + bounds.h * 0.04) + 'px';
    } else {
        ov.style.bottom = (bounds.yFromBottom + bounds.h * 0.04) + 'px';
    }

    // Wrap long lines based on content width
    const charsPerLine = Math.floor(bounds.w / (size * 0.55));
    const strokeScaled = Math.max(0, Math.round(ss.strokeWidth * scale));
    const strokeStyle  = strokeScaled > 0 ? `-webkit-text-stroke:${strokeScaled}px ${ss.strokeColor};paint-order:stroke fill;` : '';

    ov.innerHTML = rawLines.filter(Boolean).map(line => {
        const text    = ss.uppercase ? line.toUpperCase() : line;
        const wrapped = wrapSubtitleLine(text, charsPerLine);
        return `<div class="subtitle-text" style="
            font-size:${size}px;
            font-family:${ss.font};
            font-weight:${ss.bold ? 'bold' : 'normal'};
            color:${ss.color};
            background:${hexToRgba(ss.bgHex, ss.bgOpacity)};
            border-radius:${Math.round(ss.radius * scale)}px;
            ${strokeStyle}
            display:block;
            margin-bottom:4px;
            padding:${Math.round(2*scale)}px ${Math.round(6*scale)}px;
        ">${wrapped.map(l => escHtml(l)).join('<br>')}</div>`;
    }).join('');
}


/* Compute the actual rendered content rect of a video element with object-fit:contain */
function getVideoContentBounds(videoEl) {
    const elW = videoEl.clientWidth  || videoEl.offsetWidth  || 320;
    const elH = videoEl.clientHeight || videoEl.offsetHeight || 180;
    const vW  = videoEl.videoWidth   || elW;
    const vH  = videoEl.videoHeight  || elH;

    // Scale the video to fit inside element while preserving aspect ratio (object-fit:contain)
    const scale = Math.min(elW / vW, elH / vH);
    const rendW = vW * scale;
    const rendH = vH * scale;
    const offX  = (elW - rendW) / 2;   // horizontal letterbox padding
    const offY  = (elH - rendH) / 2;   // vertical letterbox padding

    return {
        x:            offX,
        y:            offY,
        w:            rendW,
        h:            rendH,
        yFromBottom:  offY,             // distance from bottom of element to content bottom edge
    };
}


/* Split a subtitle line into rows no longer than maxChars */
function wrapSubtitleLine(text, maxChars) {
    if (!text || maxChars < 4) return [text];
    const words = text.split(' ');
    const rows  = [];
    let   cur   = '';
    for (const w of words) {
        const test = cur ? cur + ' ' + w : w;
        if (test.length > maxChars && cur) {
            rows.push(cur);
            cur = w;
        } else {
            cur = test;
        }
    }
    if (cur) rows.push(cur);
    return rows.length ? rows : [text];
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
}

/* ================================================
   SEGMENT SIDEBAR (Preview Panel)
   ================================================ */
function updateSegmentSidebar() {
    if (!state.segments.length) {
        DOM.segmentListWrap.style.display = 'none';
        return;
    }
    DOM.segmentListWrap.style.display = 'flex';
    DOM.segCountBadge.textContent = state.segments.length;
    DOM.segmentList.innerHTML = '';

    const lang = getTargetLang() === 'tl' ? 'tl' : 'en';

    state.segments.forEach(seg => {
        const hasAudio = seg[`audioBlob${lang.charAt(0).toUpperCase() + lang.slice(1)}`];
        const item = document.createElement('div');
        item.className = 'segment-list-item';
        item.dataset.start = seg.start;

        item.innerHTML = `
            <span class="seg-list-time">${formatDuration(seg.start)} → ${formatDuration(seg.end)}</span>
            <div class="seg-list-content">
                <div class="seg-list-cn">${escHtml(seg.cn)}</div>
                <div class="seg-list-trans">${escHtml(seg[lang] || '—')}</div>
            </div>
            <div class="seg-list-actions">
                <button class="seg-play-btn ${hasAudio ? 'has-audio' : ''}" title="${hasAudio ? 'Phát audio AI' : 'Chưa có audio'}">
                    <i class="fa-solid ${hasAudio ? 'fa-play' : 'fa-volume-xmark'}"></i>
                </button>
            </div>
        `;

        // Click to seek video
        item.addEventListener('click', () => {
            if (DOM.videoPreview.src) {
                DOM.videoPreview.currentTime = seg.start;
                DOM.videoPreview.play();
            }
            document.querySelectorAll('.segment-list-item').forEach(el => el.classList.remove('playing'));
            item.classList.add('playing');
        });

        // Play audio
        item.querySelector('.seg-play-btn').addEventListener('click', e => {
            e.stopPropagation();
            if (hasAudio) {
                const blob = seg[`audioBlob${lang.charAt(0).toUpperCase() + lang.slice(1)}`];
                const url  = URL.createObjectURL(blob);
                const audio = new Audio(url);
                audio.play();
                audio.onended = () => URL.revokeObjectURL(url);
            } else {
                showToast('⚠️ Phân đoạn này chưa có audio AI', 'warning');
            }
        });

        DOM.segmentList.appendChild(item);
    });
}

/* ================================================
   FULLSCREEN PREVIEW
   ================================================ */
DOM.btnFullscreen.addEventListener('click', () => {
    if (DOM.videoPreview.requestFullscreen) DOM.videoPreview.requestFullscreen();
});

/* ================================================
   UTILITIES
   ================================================ */
function formatDuration(secs) {
    if (!secs && secs !== 0) return '—';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function escHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }


/* ================================================
   INIT
   ================================================ */
function init() {
    loadApiKeys();
    goToStep(1);

    // Load saved theme
    const theme = localStorage.getItem('sorav2-theme') || 'dark';
    document.body.setAttribute('data-theme', theme);
}

init();

/* ================================================
   TIMELINE EDITOR ENGINE
   ================================================ */
const TL = {
    zoom:       1.0,
    basePPS:    60,         // base pixels-per-second at zoom=1
    get pps()   { return this.basePPS * this.zoom; },
    open:       true,       // collapsed state
};

// Per-segment manual voice window: key = `${seg.id}_${lang}` → seconds
state.voiceWindows = state.voiceWindows || {};

// Popover state
let _popSeg = null, _popLang = null;

/* ── helpers ── */
function getVoiceWindow(seg, lang) {
    return state.voiceWindows[`${seg.id}_${lang}`] ?? (seg.end - seg.start);
}
function setVoiceWindow(seg, lang, secs) {
    const audioDur = seg._audioDuration?.[lang] || (seg.end - seg.start);
    const min = audioDur / DUBBED_MAX_RATE;
    state.voiceWindows[`${seg.id}_${lang}`] = Math.max(min, Math.max(0.05, secs));
}
function deleteVoiceWindow(seg, lang) {
    delete state.voiceWindows[`${seg.id}_${lang}`];
}
function computeVoiceRate(seg, lang) {
    const audioDur = seg._audioDuration?.[lang];
    if (!audioDur) return 1.0;
    const win  = getVoiceWindow(seg, lang);
    return Math.min(audioDur / win, DUBBED_MAX_RATE);
}
function rateClass(r) {
    return r >= 1.75 ? 'rate-high' : r >= 1.2 ? 'rate-mid' : 'rate-ok';
}

/* ── decode audio durations once after generate ── */
async function computeAudioDurations() {
    const ctx = new AudioContext();
    for (const seg of state.segments) {
        for (const lang of ['en', 'tl']) {
            const bk = `audioBlob${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
            if (!seg[bk] || seg._audioDuration?.[lang]) continue;
            try {
                const ab  = await seg[bk].arrayBuffer();
                const buf = await ctx.decodeAudioData(ab);
                seg._audioDuration            = seg._audioDuration || {};
                seg._audioDuration[lang]      = buf.duration;
            } catch {}
        }
    }
    ctx.close();
}

/* ── show / open timeline ── */
function showTimeline() {
    const panel = $('timeline-panel');
    if (panel) panel.style.display = 'block';
    renderTimeline();
}
function toggleTimeline() {
    const body    = $('timeline-body');
    const chevron = $('timeline-chevron');
    if (!body) return;
    TL.open = body.style.display === 'none';
    body.style.display  = TL.open ? 'block' : 'none';
    if (chevron) chevron.style.transform = TL.open ? 'rotate(180deg)' : '';
    if (TL.open) renderTimeline();
}

/* ── zoom ── */
function timelineZoom(dir) {
    TL.zoom = Math.max(0.15, Math.min(10, TL.zoom * (dir > 0 ? 1.5 : 1/1.5)));
    $('tl-zoom-label').textContent = TL.zoom.toFixed(1) + '×';
    renderTimeline();
}
function timelineFit() {
    const scroll = $('tl-tracks-scroll');
    const dur    = state.videoDuration || 30;
    if (!scroll) return;
    TL.zoom = 1.0;
    TL.basePPS = Math.max(15, (scroll.clientWidth - 10) / dur);
    $('tl-zoom-label').textContent = '1×';
    renderTimeline();
}
function resetAllSpeeds() {
    state.voiceWindows = {};
    renderTimeline();
    invalidateMergedBuffer(null);
    showToast('↺ Đã reset tất cả speed về Auto', 'info');
}

/* ── Compute effective total duration of voice track (sequential sum at globalSpeed) ── */
function getVoiceTotalDuration(lang) {
    const bk    = `audioBlob${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
    const speed = state.globalSpeed || 1.0;
    let total   = 0;
    for (const seg of state.segments) {
        if (!seg[bk]) continue;
        const audioDur = seg._audioDuration?.[lang] || (seg.end - seg.start);
        total += audioDur / speed;  // sequential: SUM, not max
    }
    return total;
}

/* ── main render ── */
function renderTimeline() {
    const canvas = $('tl-canvas');
    if (!canvas || !TL.open) return;

    const dur     = state.videoDuration || 0;
    // Expand canvas to cover any voice that overflows past video end
    const voiceEn = getVoiceTotalDuration('en');
    const voiceTl = getVoiceTotalDuration('tl');
    const maxDur  = Math.max(dur, voiceEn, voiceTl);
    const width   = Math.max(200, maxDur * TL.pps);

    ['tl-ruler','tl-track-video','tl-track-en','tl-track-tl'].forEach(id => {
        const el = $(id); if (el) el.style.width = width + 'px';
    });
    canvas.style.width = width + 'px';

    renderRuler(maxDur, width);
    renderVideoBar(dur);
    renderVoiceBlocks('en');
    renderVoiceBlocks('tl');
    updateTLPlayhead();

    const badge = $('tl-badge');
    if (badge) badge.textContent = state.segments.length + ' segments';
}

function renderRuler(dur, width) {
    const ruler = $('tl-ruler');
    if (!ruler) return;
    ruler.innerHTML = '';
    ruler.style.width = width + 'px';

    const pps = TL.pps;
    const steps = [0.25,0.5,1,2,5,10,15,30,60];
    const minPx = 45;
    const step  = steps.find(s => s * pps >= minPx) || 60;

    for (let t = 0; t <= dur + 0.01; t += step) {
        const m = document.createElement('div');
        m.className    = 'ruler-mark';
        m.style.left   = (t * pps) + 'px';
        m.textContent  = formatDuration(t);
        ruler.appendChild(m);
    }

    // Click ruler to seek
    ruler.onclick = e => {
        const rect = ruler.getBoundingClientRect();
        const t    = (e.clientX - rect.left) / pps;
        DOM.videoPreview.currentTime = Math.max(0, Math.min(t, dur));
    };
}

function renderVideoBar(dur) {
    const track = $('tl-track-video');
    if (!track || !dur) return;
    track.innerHTML = '';
    const bar = document.createElement('div');
    bar.className  = 'tl-video-bar';
    bar.style.width = (dur * TL.pps) + 'px';
    track.appendChild(bar);

    // Click video bar to seek
    track.onclick = e => {
        const rect = track.getBoundingClientRect();
        DOM.videoPreview.currentTime = Math.max(0, (e.clientX - rect.left) / TL.pps);
    };
}

function renderVoiceBlocks(lang) {
    const track = $(`tl-track-${lang}`);
    if (!track) return;
    track.innerHTML = '';

    const bk = `audioBlob${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
    const segsWithAudio = state.segments.filter(s => s[bk]);
    if (!segsWithAudio.length) return;

    const videoDur     = state.videoDuration || 0;
    if (!videoDur) return;

    const speed        = state.globalSpeed || 1.0;
    const voiceEndTime = getVoiceTotalDuration(lang);  // effective end at current speed
    const barW         = voiceEndTime * TL.pps;        // bar width = actual voice duration
    const videoW       = videoDur * TL.pps;
    const overflowW    = Math.max(0, barW - videoW);   // px beyond video end
    const fitsW        = Math.min(barW, videoW);        // px within video range

    // Color: green fits, yellow slight overflow, red big overflow
    const overflowRatio = voiceEndTime / videoDur;
    const rc = overflowRatio <= 1.0  ? 'rate-ok'
             : overflowRatio <= 1.2  ? 'rate-mid'
             :                         'rate-high';

    // Duration label
    const voiceLabel = voiceEndTime.toFixed(1) + 's';
    const videoLabel = videoDur.toFixed(1) + 's';
    const diffLabel  = voiceEndTime > videoDur
        ? `(+${(voiceEndTime - videoDur).toFixed(1)}s tràn)`
        : voiceEndTime < videoDur
        ? `(−2${(videoDur - voiceEndTime).toFixed(1)}s còn trống)`
        : '(khớp video)';

    // ── Main bar (within video range) ──
    const block = document.createElement('div');
    block.className    = `voice-block ${rc} voice-block-unified`;
    block.style.left   = '0px';
    block.style.width  = fitsW + 'px';
    block.dataset.lang = lang;
    block.title        = `Voice: ${voiceLabel} · Video: ${videoLabel} ${diffLabel}\nClick hoặc kéo ▶ để chỉnh speed`;

    block.innerHTML = `
        <div class="voice-block-inner" style="pointer-events:none">
            <span class="voice-block-text">🎙 ${segsWithAudio.length} phân đoạn — ${voiceLabel} ${diffLabel}</span>
            <span class="voice-block-rate-badge">${speed.toFixed(2)}×</span>
        </div>
        ${overflowW <= 0 ? '<div class="voice-block-handle" title="Kéo để chỉnh tốc độ toàn bộ"></div>' : ''}
    `;

    // Click → open global speed popover
    block.addEventListener('click', e => {
        if (e.target.classList.contains('voice-block-handle')) return;
        e.stopPropagation();
        openGlobalSpeedPopover();
    });

    if (overflowW <= 0) {
        block.querySelector('.voice-block-handle')?.addEventListener('mousedown',
            e => startGlobalSpeedDrag(e));
    }

    track.appendChild(block);

    // ── Overflow extension (beyond video end) ──
    if (overflowW > 0) {
        const overflow = document.createElement('div');
        overflow.className  = 'voice-block-overflow-bar';
        overflow.style.left = videoW + 'px';
        overflow.style.width = overflowW + 'px';
        overflow.title = `Voice tràn ${(voiceEndTime - videoDur).toFixed(1)}s so với video`;

        // Drag handle on the overflow bar's right edge
        const handle = document.createElement('div');
        handle.className = 'voice-block-handle';
        handle.title = 'Kéo để chỉnh tốc độ toàn bộ';
        overflow.appendChild(handle);
        handle.addEventListener('mousedown', e => startGlobalSpeedDrag(e));

        overflow.addEventListener('click', e => {
            if (e.target === handle) return;
            e.stopPropagation();
            openGlobalSpeedPopover();
        });

        track.appendChild(overflow);
    }
}

/* ── Global speed drag (right handle of unified bar) ── */
function startGlobalSpeedDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    closeSpeedPopover();

    const startX     = e.clientX;
    const startSpeed = state.globalSpeed || 1.0;

    function onMove(ev) {
        const dx = ev.clientX - startX;
        // 200px drag → ±1× speed
        const newSpeed = Math.max(0.5, Math.min(2.0, startSpeed + dx / 200));
        _applyGlobalSpeed(newSpeed);
        renderTimeline();
    }
    function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
        invalidateMergedBuffer(null);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
}

/* ── Apply globalSpeed and sync all UI controls ── */
function _applyGlobalSpeed(r) {
    r = Math.max(0.5, Math.min(2.0, r));
    state.globalSpeed = r;
    // Sync Step-5 slider
    const gs = document.getElementById('global-voice-speed');
    const gv = document.getElementById('global-speed-val');
    if (gs) gs.value = r;
    if (gv) gv.textContent = r.toFixed(2) + '×';
}

/* ── Global Speed Popover (reuses the existing speed-popover element) ── */
function openGlobalSpeedPopover() {
    const pop    = $('speed-popover');
    const slider = $('speed-pop-slider');
    const valEl  = $('speed-pop-val');
    const durEl  = $('speed-pop-dur');
    const txtEl  = $('speed-pop-seg-text');
    if (!pop) return;

    _popSeg  = null;   // null signals "global mode"
    _popLang = null;

    const speed = state.globalSpeed || 1.0;
    const cnt   = state.segments.filter(s =>
        s.audioBlobEn || s.audioBlobTl).length;

    if (txtEl) txtEl.textContent = `Tốc độ toàn bộ — ${cnt} phân đoạn đồng bộ`;
    if (valEl) valEl.textContent = speed.toFixed(2) + '×';
    if (durEl) durEl.textContent = '↕ Kéo slider hoặc chọn preset bên dưới';

    if (slider) {
        slider.value   = Math.min(speed, 2.0);
        slider.oninput = () => {
            const r = parseFloat(slider.value);
            if (valEl) valEl.textContent = r.toFixed(2) + '×';
            if (durEl) durEl.textContent = r < 1 ? `Chậm hơn ${(1/r).toFixed(1)}×` : r > 1 ? `Nhanh hơn ${r.toFixed(1)}×` : 'Tốc độ gốc';
            _applyGlobalSpeed(r);
            renderTimeline();
            invalidateMergedBuffer(null);
        };
    }
    pop.style.display = 'block';
}

function closeSpeedPopover() {
    const pop = $('speed-popover');
    if (pop) pop.style.display = 'none';
    _popSeg = null; _popLang = null;
}

/* preset buttons in the popover HTML call setSpeedPreset(rate) */
function setSpeedPreset(rate) {
    _applyGlobalSpeed(rate);
    const slider = $('speed-pop-slider');
    const valEl  = $('speed-pop-val');
    const durEl  = $('speed-pop-dur');
    if (slider) slider.value = rate;
    if (valEl)  valEl.textContent = rate.toFixed(2) + '×';
    if (durEl)  durEl.textContent = rate < 1 ? `Chậm hơn ${(1/rate).toFixed(1)}×` : rate > 1 ? `Nhanh hơn ${rate.toFixed(1)}×` : 'Tốc độ gốc';
    renderTimeline();
    invalidateMergedBuffer(null);
}

/* "Auto" / 1× button → reset to normal speed */
function setSpeedAuto() {
    setSpeedPreset(1.0);
    closeSpeedPopover();
}


/* ── Playhead ── */
function updateTLPlayhead() {
    const ph  = $('tl-playhead');
    const dur = state.videoDuration || 0;
    if (!ph || !dur || !TL.open) return;
    ph.style.display = 'block';
    ph.style.left    = (DOM.videoPreview.currentTime * TL.pps) + 'px';
    // Auto-scroll to keep playhead visible
    const scroll = $('tl-tracks-scroll');
    if (scroll) {
        const x = DOM.videoPreview.currentTime * TL.pps;
        if (x < scroll.scrollLeft || x > scroll.scrollLeft + scroll.clientWidth - 40) {
            scroll.scrollLeft = Math.max(0, x - 60);
        }
    }
}

// Close popover on outside click
document.addEventListener('click', e => {
    const pop = $('speed-popover');
    if (pop && pop.style.display !== 'none'
        && !pop.contains(e.target)
        && !e.target.closest('.voice-block')) {
        closeSpeedPopover();
    }
});
