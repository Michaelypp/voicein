(()=>{
  if(document.getElementById('voicein-canvas-widget'))return;
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  let activeTarget=null,recognition=null,listening=false,committed='';
  const isEditable=el=>el&&(el.matches?.('textarea,input[type="text"],input:not([type]),[contenteditable="true"],body[contenteditable]')||el.closest?.('[contenteditable="true"]'));
  const editable=el=>el?.closest?.('[contenteditable="true"]')||el;
  const deepActiveElement=(doc=document)=>{let el=doc.activeElement;while(el?.tagName==='IFRAME'){try{const inner=el.contentDocument?.activeElement;if(!inner||inner===el)break;el=inner}catch{break}}return el};
  document.addEventListener('focusin',e=>{if(isEditable(e.target))activeTarget=editable(e.target)},true);
  document.addEventListener('pointerdown',e=>{if(isEditable(e.target))activeTarget=editable(e.target)},true);
  const widget=document.createElement('div');widget.id='voicein-canvas-widget';widget.innerHTML='<button type="button" id="voicein-toggle">🎙 Start</button><select id="voicein-language" aria-label="Recognition language"><option value="en-US">English</option><option value="zh-CN">普通话</option><option value="zh-TW">中文（台湾）</option><option value="zh-HK">粤语</option></select><span class="voicein-status" aria-live="polite">Click a text box first</span><button type="button" class="voicein-close" aria-label="Hide VoiceIn">×</button>';document.documentElement.appendChild(widget);
  const toggle=widget.querySelector('#voicein-toggle'),language=widget.querySelector('#voicein-language'),status=widget.querySelector('.voicein-status');
  chrome.storage.local.get(['voiceinLanguage'],v=>{if(v.voiceinLanguage)language.value=v.voiceinLanguage});language.onchange=()=>chrome.storage.local.set({voiceinLanguage:language.value});widget.querySelector('.voicein-close').onclick=()=>widget.remove();
  const readTarget=()=>{if(!activeTarget)return'';return activeTarget.isContentEditable?activeTarget.innerText:activeTarget.value||''};
  const writeTarget=value=>{if(!activeTarget)return;if(activeTarget.isContentEditable){activeTarget.focus();activeTarget.innerText=value;activeTarget.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:value}))}else{const setter=Object.getOwnPropertyDescriptor(activeTarget.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value')?.set;setter?setter.call(activeTarget,value):activeTarget.value=value;activeTarget.dispatchEvent(new Event('input',{bubbles:true}));activeTarget.dispatchEvent(new Event('change',{bubbles:true}))}};
  const formatCommands=value=>value
    .replace(/\b(new paragraph|new line)\b/gi,'\n')
    .replace(/\b(comma)\b/gi,',')
    .replace(/\b(period|full stop)\b/gi,'.')
    .replace(/\b(question mark)\b/gi,'?')
    .replace(/\b(exclamation (?:mark|point))\b/gi,'!')
    .replace(/\b(colon)\b/gi,':')
    .replace(/\b(semicolon)\b/gi,';')
    .replace(/逗号/g,'，').replace(/句号/g,'。').replace(/问号/g,'？').replace(/感叹号/g,'！').replace(/冒号/g,'：').replace(/分号/g,'；').replace(/(换行|另起一行|新段落)/g,'\n')
    .replace(/\s+([,.?!:;，。？！：；])/g,'$1').replace(/[ \t]*\n[ \t]*/g,'\n');
  const appendFinal=chunk=>{const formatted=formatCommands(chunk.trim());if(!formatted)return;if(/^[,.?!:;，。？！：；]/.test(formatted)){committed=committed.replace(/\s+$/,'')+formatted}else if(formatted.startsWith('\n')){committed=committed.replace(/[ \t]+$/,'')+formatted}else{const needsSpace=committed&&!/[\s\n]$/.test(committed)&&!language.value.startsWith('zh');committed+=(needsSpace?' ':'')+formatted}};
  const setListening=v=>{listening=v;toggle.dataset.listening=String(v);toggle.textContent=v?'■ Stop':'🎙 Start';status.textContent=v?'Listening…':'Ready'};
  if(!SpeechRecognition){toggle.disabled=true;status.textContent='Speech recognition unavailable';return}
  recognition=new SpeechRecognition();recognition.continuous=true;recognition.interimResults=true;recognition.onstart=()=>{committed=readTarget();setListening(true)};recognition.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const chunk=e.results[i][0].transcript;if(e.results[i].isFinal)appendFinal(chunk);else interim=chunk}writeTarget(committed+(interim?(committed&&!/[\s\n]$/.test(committed)?' ':'')+interim:''))};recognition.onerror=e=>{status.textContent=e.error==='not-allowed'?'Microphone permission denied':`Error: ${e.error}`};recognition.onend=()=>setListening(false);
  toggle.addEventListener('pointerdown',()=>{const focused=deepActiveElement();if(isEditable(focused))activeTarget=editable(focused)});
  toggle.onclick=()=>{if(listening){recognition.stop();return}if(!activeTarget){status.textContent='Click a Canvas text box first';return}recognition.lang=language.value;try{recognition.start()}catch{status.textContent='Could not start microphone'}};
})();

