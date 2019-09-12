import Scraper from "./scraper.js";
import { gaTrack } from "./gajs.js";

chrome.tabs.executeScript(
  {
    code: `[window.location.href, document.all[0].outerHTML]`
  },
  result => {
    !result[0][0].startsWith("chrome") &&
      new Scraper(result[0][0], result[0][1]).scrape().then(res => {
        !!res.title && (document.getElementById("name").innerText = res.title);
      });
  }
);

document.getElementById("add").addEventListener("click", e => {
  chrome.tabs.executeScript(
    {
      code: `!window.location.href.startsWith("chrome") &&
        chrome.storage.local.set({ newUrl: window.location.href }, () => {
          chrome.storage.local.set({ newDoc: document.all[0].outerHTML });
        });`
    },
    () => chrome.tabs.create({ url: "collection.html" })
  );
});

gaTrack("UA-145168497-1", "yoursite.com", "/popup.js");
