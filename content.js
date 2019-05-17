console.log("EXTENSION WORKING");

const firstLink = document.querySelector("a[href^='http']").href;
console.log(firstLink);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message === "clicked_browser_action") {
    const firstHref = document.querySelector("a[href^='http']").href;

    console.log(firstHref);
    chrome.runtime.sendMessage({ message: "open_new_tab", url: firstHref });
  }
});
