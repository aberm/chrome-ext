chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message === "add_page_to_collection") {
    console.log("content here: you've asked me to grab this page's url!");
    console.log(window.location.href);
    chrome.runtime.sendMessage({
      message: "captured_url",
      url: window.location.href
    });
  }
});
