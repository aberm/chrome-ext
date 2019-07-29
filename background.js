console.log("background running");

chrome.contextMenus.create({
  title: "Add This Page To Wish List",
  contexts: ["page", "selection", "image", "link"], // link?
  onclick: function(e) {
    console.log(e.pageUrl);
    if (!e.pageUrl.startsWith("chrome")) {
      chrome.storage.local.set({ newUrl: e.pageUrl }, () =>
        chrome.tabs.create({ url: "collection.html" })
      );
    } else {
      chrome.tabs.create({ url: "collection.html" });
    }
  }
});
