const SCRIPT_ID = 'voicein-custom-canvas';

async function refreshCustomDomains() {
  const { customDomains = [] } = await chrome.storage.local.get('customDomains');
  const matches = customDomains.map(domain => `https://${domain}/*`);
  try { await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] }); } catch {}
  if (!matches.length) return;
  await chrome.scripting.registerContentScripts([{
    id: SCRIPT_ID, matches, js: ['content.js'], css: ['content.css'],
    allFrames: false, runAt: 'document_idle', persistAcrossSessions: true
  }]);
}

chrome.runtime.onInstalled.addListener(refreshCustomDomains);
chrome.runtime.onStartup.addListener(refreshCustomDomains);
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'VOICEIN_REFRESH_DOMAINS') return;
  refreshCustomDomains().then(() => sendResponse({ ok: true })).catch(error => sendResponse({ ok: false, error: error.message }));
  return true;
});

chrome.commands.onCommand.addListener(async command => {
  if (command !== 'toggle-dictation') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try { await chrome.tabs.sendMessage(tab.id, { type: 'VOICEIN_TOGGLE' }); } catch {}
});

