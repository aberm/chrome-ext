import Scraper from "./scraper.js";

let activeTab;

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  activeTab = tabs[0];

  if (!activeTab.url.startsWith("chrome")) {
    const x = new Scraper(activeTab.url);
    x.scrape().then(res => {
      document.getElementById("name").innerText = res.title;
    });
  }
});

document.getElementById("add").addEventListener("click", e => {
  if (!activeTab.url.startsWith("chrome")) {
    chrome.storage.local.set({ newUrl: activeTab.url }, () =>
      chrome.tabs.create({ url: "collection.html" })
    );
  } else {
    chrome.tabs.create({ url: "collection.html" });
  }
});
