(() => {
  if (document.getElementById('voicein-canvas-widget')) return;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const defaults = { language: 'en-US', autoPunctuation: true, vocabulary: '' };
  let settings = { ...defaults }, recognition, listening = false, activeTarget = null;
  let savedSelection = null, interimText = '', silenceTimer = null, lastInserted = '';

  const isEditable = el => el && (el.matches?.('textarea,input[type="text"],input:not([type]),[contenteditable="true"],body[contenteditable]') || el.closest?.('[contenteditable="true"]'));
  const editable = el => el?.closest?.('[contenteditable="true"]') || el;
  const deepActiveElement = (doc = document) => {
    let el = doc.activeElement;
    while (el?.tagName === 'IFRAME') {
      try { const inner = el.contentDocument?.activeElement; if (!inner || inner === el) break; el = inner; } catch { break; }
    }
    return el;
  };
  const captureTarget = () => {
    const focused = deepActiveElement();
    if (isEditable(focused)) activeTarget = editable(focused);
    if (!activeTarget) return false;
    if (activeTarget.isContentEditable) {
      const selection = activeTarget.ownerDocument.getSelection();
      if (selection?.rangeCount && activeTarget.contains(selection.anchorNode)) savedSelection = selection.getRangeAt(0).cloneRange();
    } else savedSelection = { start: activeTarget.selectionStart ?? activeTarget.value.length, end: activeTarget.selectionEnd ?? activeTarget.value.length };
    return true;
  };
  document.addEventListener('focusin', captureTarget, true);
  document.addEventListener('pointerup', captureTarget, true);
  document.addEventListener('keyup', captureTarget, true);

  const widget = document.createElement('div');
  widget.id = 'voicein-canvas-widget';
  widget.innerHTML = `
    <button type="button" id="voicein-toggle">🎙 Start</button>
    <select id="voicein-language" aria-label="Recognition language"><option value="en-US">English</option><option value="zh-CN">普通话</option><option value="zh-TW">中文（台湾）</option><option value="zh-HK">粤语</option></select>
    <span class="voicein-meter" aria-hidden="true"><i></i><i></i><i></i></span>
    <span class="voicein-status" aria-live="polite">Click a Canvas text box first</span>
    <span class="voicein-preview" aria-live="polite"></span>
    <button type="button" id="voicein-restore" hidden>Restore</button>
    <button type="button" class="voicein-close" aria-label="Hide VoiceIn">×</button>`;
  document.documentElement.appendChild(widget);
  const toggle = widget.querySelector('#voicein-toggle'), language = widget.querySelector('#voicein-language');
  const status = widget.querySelector('.voicein-status'), preview = widget.querySelector('.voicein-preview'), restore = widget.querySelector('#voicein-restore');

  chrome.storage.local.get(['voiceinLanguage', 'autoPunctuation', 'vocabulary', 'voiceinDraft'], data => {
    settings = { ...defaults, language: data.voiceinLanguage || defaults.language, autoPunctuation: data.autoPunctuation ?? true, vocabulary: data.vocabulary || '' };
    language.value = settings.language;
    if (data.voiceinDraft?.text) restore.hidden = false;
  });
  chrome.storage.onChanged.addListener(changes => {
    if (changes.autoPunctuation) settings.autoPunctuation = changes.autoPunctuation.newValue;
    if (changes.vocabulary) settings.vocabulary = changes.vocabulary.newValue || '';
    if (changes.voiceinLanguage) { settings.language = changes.voiceinLanguage.newValue; language.value = settings.language; }
  });
  language.onchange = () => { settings.language = language.value; chrome.storage.local.set({ voiceinLanguage: language.value }); };
  widget.querySelector('.voicein-close').onclick = () => widget.remove();

  const setStatus = (text, kind = '') => { status.textContent = text; widget.dataset.status = kind; };
  const setListening = value => {
    listening = value; toggle.dataset.listening = String(value); toggle.textContent = value ? '■ Stop' : '🎙 Start';
    setStatus(value ? 'Listening…' : 'Ready', value ? 'listening' : '');
    if (!value) { preview.textContent = ''; interimText = ''; clearTimeout(silenceTimer); }
  };
  const dispatchInput = target => {
    target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const insertAtCursor = text => {
    if (!activeTarget || !text) return;
    if (activeTarget.isContentEditable) {
      activeTarget.focus(); const selection = activeTarget.ownerDocument.getSelection(); selection.removeAllRanges();
      if (savedSelection) selection.addRange(savedSelection); else { const range = activeTarget.ownerDocument.createRange(); range.selectNodeContents(activeTarget); range.collapse(false); selection.addRange(range); }
      activeTarget.ownerDocument.execCommand('insertText', false, text);
      if (selection.rangeCount) savedSelection = selection.getRangeAt(0).cloneRange(); dispatchInput(activeTarget);
    } else {
      activeTarget.focus(); const start = savedSelection?.start ?? activeTarget.value.length, end = savedSelection?.end ?? start;
      activeTarget.setRangeText(text, start, end, 'end'); savedSelection = { start: start + text.length, end: start + text.length }; dispatchInput(activeTarget);
    }
    lastInserted = text; saveDraft();
  };
  const targetText = () => activeTarget ? (activeTarget.isContentEditable ? activeTarget.innerText : activeTarget.value || '') : '';
  const saveDraft = () => chrome.storage.local.set({ voiceinDraft: { text: targetText(), url: location.href, timestamp: Date.now() } });
  restore.onclick = async () => { const { voiceinDraft } = await chrome.storage.local.get('voiceinDraft'); if (!captureTarget()) return setStatus('Click a text box first', 'error'); insertAtCursor(voiceinDraft?.text || ''); restore.hidden = true; setStatus('Draft restored'); };

  const replacements = () => settings.vocabulary.split(/\r?\n/).map(line => line.split('=').map(x => x.trim())).filter(parts => parts[0] && parts[1]);
  const applyVocabulary = text => replacements().reduce((value, [spoken, written]) => value.replace(new RegExp(spoken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), written), text);
  const formatCommands = value => applyVocabulary(value)
    .replace(/\b(new paragraph|new line)\b/gi, '\n').replace(/\bcomma\b/gi, ',').replace(/\b(period|full stop)\b/gi, '.')
    .replace(/\bquestion mark\b/gi, '?').replace(/\bexclamation (mark|point)\b/gi, '!').replace(/\bcolon\b/gi, ':').replace(/\bsemicolon\b/gi, ';')
    .replace(/逗号/g, '，').replace(/句号/g, '。').replace(/问号/g, '？').replace(/感叹号/g, '！').replace(/冒号/g, '：').replace(/分号/g, '；').replace(/(换行|另起一行|新段落)/g, '\n')
    .replace(/\s+([,.?!:;，。？！：；])/g, '$1').replace(/[ \t]*\n[ \t]*/g, '\n');

  const selectTextOffsets = (start, end) => {
    if (!activeTarget?.isContentEditable) { activeTarget?.setSelectionRange(start, end); savedSelection = { start, end }; return; }
    const walker = activeTarget.ownerDocument.createTreeWalker(activeTarget, NodeFilter.SHOW_TEXT); let node, offset = 0, startNode, endNode, startOffset = 0, endOffset = 0;
    while ((node = walker.nextNode())) { const next = offset + node.data.length; if (!startNode && start <= next) { startNode = node; startOffset = Math.max(0, start - offset); } if (end <= next) { endNode = node; endOffset = Math.max(0, end - offset); break; } offset = next; }
    if (!startNode || !endNode) return; const range = activeTarget.ownerDocument.createRange(); range.setStart(startNode, startOffset); range.setEnd(endNode, endOffset);
    const selection = activeTarget.ownerDocument.getSelection(); selection.removeAllRanges(); selection.addRange(range); savedSelection = range.cloneRange(); activeTarget.focus();
  };
  const replaceOffsets = (start, end, replacement) => { selectTextOffsets(start, end); if (activeTarget.isContentEditable) { activeTarget.ownerDocument.execCommand('insertText', false, replacement); captureTarget(); dispatchInput(activeTarget); } else insertAtCursor(replacement); saveDraft(); };
  const runCommand = raw => {
    const command = raw.trim().toLowerCase(); const text = targetText();
    if (/^(undo|撤销)$/.test(command)) { activeTarget?.ownerDocument.execCommand('undo'); saveDraft(); return true; }
    if (/^(delete last sentence|删除上一句)$/.test(command)) { const trimmed = text.replace(/\s+$/, ''); const matches = [...trimmed.matchAll(/[^.!?。！？]+[.!?。！？]?/g)]; const last = matches.at(-1); if (last) replaceOffsets(last.index, trimmed.length, ''); return true; }
    if (/^(select last paragraph|选择上一段)$/.test(command)) { const start = Math.max(text.lastIndexOf('\n\n') + 2, 0); selectTextOffsets(start, text.length); return true; }
    if (/^(capitalize that|首字母大写)$/.test(command)) { const start = Math.max(text.lastIndexOf(lastInserted), 0); if (lastInserted) replaceOffsets(start, start + lastInserted.length, lastInserted.charAt(0).toUpperCase() + lastInserted.slice(1)); return true; }
    return false;
  };
  const appendFinal = chunk => {
    if (runCommand(chunk)) return; let text = formatCommands(chunk.trim()); if (!text) return;
    const current = targetText(), chinese = language.value.startsWith('zh');
    if (!chinese && current && !/[\s\n]$/.test(current) && !/^[,.?!:;]/.test(text)) text = ' ' + text;
    insertAtCursor(text);
    if (settings.autoPunctuation && !/[.!?。！？]\s*$/.test(text)) {
      clearTimeout(silenceTimer); silenceTimer = setTimeout(() => insertAtCursor(chinese ? '。' : '.'), 1500);
    }
  };

  if (!SpeechRecognition) { toggle.disabled = true; setStatus('Speech recognition unavailable', 'error'); return; }
  recognition = new SpeechRecognition(); recognition.continuous = true; recognition.interimResults = true;
  recognition.onstart = () => setListening(true);
  recognition.onresult = event => { interimText = ''; for (let i = event.resultIndex; i < event.results.length; i++) { const chunk = event.results[i][0].transcript; if (event.results[i].isFinal) appendFinal(chunk); else interimText += chunk; } preview.textContent = interimText; };
  recognition.onerror = event => setStatus(event.error === 'not-allowed' ? 'Microphone permission denied' : `Error: ${event.error}`, 'error');
  recognition.onend = () => setListening(false);
  const toggleDictation = () => { if (listening) return recognition.stop(); if (!captureTarget()) return setStatus('Click a Canvas text box first', 'error'); recognition.lang = language.value; try { recognition.start(); } catch { setStatus('Could not start microphone', 'error'); } };
  toggle.addEventListener('pointerdown', captureTarget); toggle.onclick = toggleDictation;
  chrome.runtime.onMessage.addListener(message => { if (message?.type === 'VOICEIN_TOGGLE') toggleDictation(); });
})();

