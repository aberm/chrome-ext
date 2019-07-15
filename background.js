console.log("background running");

chrome.browserAction.onClicked.addListener(function(tab) {
  // Send a message to the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    var activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, {
      message: "clicked_browser_action"
    });
  });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message === "captured_url") {
    console.log("Background here: I've picked up the url!", request.url);

    chrome.storage.sync.set({ newUrl: request.url }, () => {
      console.log("newUrl is ", request.url);
    });
  }
});
