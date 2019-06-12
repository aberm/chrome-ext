console.log("EXTENSION WORKING");

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message === "clicked_browser_action") {
    console.log("action clicked!");
    chrome.runtime.sendMessage({
      message: "captured_pic",
      pic: pic.src,
      ringTitle: ringTitle
    });
  }
  if (request.message === "add_page_to_collection") {
    console.log("content here: you've asked me to grab this page's url!");
    console.log(window.location.href);
    chrome.runtime.sendMessage({
      message: "captured_url",
      url: window.location.href
    });
  }
});

// For collection.html page...

// const clearButton = document.getElementById("clear");
//
// clearButton.addEventListener("click", event => {
//   alert("clear button clicked");
//   chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
//     var activeTab = tabs[0];
//     chrome.tabs.sendMessage(activeTab.id, {
//       message: "clear_collection"
//     });
//   });
//   location.reload();
// });
