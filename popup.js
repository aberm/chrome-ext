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
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      txt: "pull_document"
    });
    if (!activeTab.url.startsWith("chrome")) {
      chrome.storage.local.set({ newUrl: activeTab.url }, () =>
        chrome.tabs.create({ url: "collection.html" })
      );
    } else {
      chrome.tabs.create({ url: "collection.html" });
    }
  });
});

const analytics = ((i, s, o, g, r, a, m) => {
  i["GoogleAnalyticsObject"] = r;
  (i[r] =
    i[r] ||
    function() {
      (i[r].q = i[r].q || []).push(arguments);
    }),
    (i[r].l = 1 * new Date());
  (a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]);
  a.async = 1;
  a.src = g;
  m.parentNode.insertBefore(a, m);
})(
  window,
  document,
  "script",
  "https://www.google-analytics.com/analytics.js",
  "ga"
); // Note: https protocol here

ga("create", "UA-145168497-1", "auto"); // Enter your GA identifier
ga("set", "checkProtocolTask", function() {}); // Removes failing protocol check. @see: http://stackoverflow.com/a/22152353/1958200
ga("require", "displayfeatures");
ga("send", "pageview", "/popup.html");
