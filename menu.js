document.getElementById("add").addEventListener("click", e => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const activeTab = tabs[0];
    chrome.tabs.sendMessage(
      activeTab.id,
      {
        message: "add_page_to_collection"
      },
      chrome.tabs.create({ url: "collection.html" })
    );
  });
});

// chrome.storage.sync.get & chrome.storage.sync.set are asynchronous
