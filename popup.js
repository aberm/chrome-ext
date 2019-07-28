import Scraper from "./scraper.js";

let activeTab;

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  activeTab = tabs[0];

  const x = new Scraper(activeTab.url);
  x.scrape().then(res => {
    document.getElementById("name").innerText = res.title;
  });
});

document.getElementById("add").addEventListener("click", e => {
  chrome.storage.local.set({ newUrl: activeTab.url }, () =>
    chrome.tabs.create({ url: "collection.html" })
  );
});
