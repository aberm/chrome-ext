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

    // chrome.storage.sync.get & chrome.storage.sync.set are asynchronous

    chrome.storage.sync.get("rings", function(result) {
      console.log("Value currently is " + result.rings);

      if (result.rings && result.rings.length) {
        if (!result.rings.includes(message.ringTitle)) {
          const newArray = [...result.rings, message.ringTitle];
          chrome.storage.sync.set({ rings: newArray }, function() {
            console.log("Value is set to " + newArray);
          });
        }
      } else {
        chrome.storage.sync.set({ rings: [message.ringTitle] }, function() {
          console.log("Value is set to " + message.ringTitle);
        });
      }
      // chrome.storage.sync.clear();
    });

    chrome.storage.sync.get("rings", function(result) {
      therings = result.rings;
      console.log("THRINGS: ", therings);
      const ringp = document.createElement("p");
      ringp.innerText = result.rings;
      document.body.appendChild(ringp);
    });
  }
});
