chrome.runtime.onMessage.addListener(gotMessage);

function gotMessage(message, sender, sendResponse) {
  console.log(message.txt);
  if (message.txt === "pull_document") {
    chrome.storage.local.set({ newDoc: document.all[0].outerHTML });
  }
}
