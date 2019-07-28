let activeTab;

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  activeTab = tabs[0];
});

document.getElementById("add").addEventListener("click", e => {
  chrome.storage.local.set({ newUrl: activeTab.url }, () =>
    chrome.tabs.create({ url: "collection.html" })
  );
});
