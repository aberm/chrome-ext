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
  if (request.message === "captured_pic") {
    console.log(request.pic);
  }
  if (request.message === "captured_url") {
    console.log("Background here: I've picked up the url!", request.url);

    chrome.storage.sync.get("ringUrls", function(result) {
      console.log("Value currently is " + result.ringUrls);

      if (result.ringUrls && result.ringUrls.length) {
        if (!result.ringUrls.includes(request.url)) {
          const newArray = [...result.ringUrls, request.url];
          chrome.storage.sync.set({ ringUrls: newArray }, function() {
            console.log("Value is set to " + newArray);
          });
        }
      } else {
        chrome.storage.sync.set({ ringUrls: [request.url] }, function() {
          console.log("Value is set to " + request.url);
        });
      }
      // chrome.storage.sync.clear();
    });
  }
});
