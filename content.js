console.log("EXTENSION WORKING");

const firstLink = document.querySelector("a[href^='http']").href;
console.log(firstLink);

const pic = document.querySelector("img.zoomImg");
const ringTitle = document.querySelector("h1.product_title.entry-title")
  .innerText;
console.log("RING: ", ringTitle);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message === "clicked_browser_action") {
    console.log("action clicked!");
    chrome.runtime.sendMessage({
      message: "captured_pic",
      pic: pic.src,
      ringTitle: ringTitle
    });
  }
});

// chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
//   if (request.message === "clicked_browser_action") {
//     const firstHref = document.querySelector("a[href^='http']").href;
//
//     // console.log(firstHref);
//     chrome.runtime.sendMessage({ message: "open_new_tab", url: firstHref });
//   }
// });
