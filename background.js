console.log("background running");

chrome.contextMenus.create({
  title: "Add this Page to Wish List",
  contexts: ["page", "selection", "image", "link"], // link?
  onclick: function(e) {
    if (!e.pageUrl.startsWith("chrome")) {
      chrome.storage.local.set({ newUrl: e.pageUrl }, () =>
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              txt: "pull_document"
            },
            res => {
              chrome.tabs.create({ url: "collection.html" });
            }
          );
        })
      );
    } else {
      chrome.tabs.create({ url: "collection.html" });
    }
  }
});
