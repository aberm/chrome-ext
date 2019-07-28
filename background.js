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

    chrome.storage.local.set({ newUrl: request.url }, () => {
      console.log("newUrl is ", request.url);
    });
  }
});

chrome.contextMenus.create({
  title: "Wish List Extension",
  contexts: ["page", "selection", "image", "link"], // link?
  onclick: function(e) {
    console.log(e.pageUrl);
    chrome.storage.local.set({ newUrl: e.pageUrl }, () => {
      console.log("newUrl is ", e.pageUrl);
      chrome.tabs.create({ url: "collection.html" });
    });
  }
});
