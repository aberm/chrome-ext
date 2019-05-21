chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
  var activeTab = tabs[0];
  chrome.tabs.sendMessage(activeTab.id, {
    message: "clicked_browser_action"
  });
});

chrome.extension.onMessage.addListener(function(
  message,
  messageSender,
  sendResponse
) {
  if (message.message === "captured_pic") {
    const ringTitle = document.createElement("h4");
    ringTitle.innerHTML = message.ringTitle;
    const img = document.createElement("img");
    img.src = message.pic;
    img.style.width = "100%";
    document.body.appendChild(ringTitle);
    document.body.appendChild(img);
  }
});
