const openNewTab = (element, tab) => {
  document.getElementById(element).addEventListener("click", function(e) {
    chrome.tabs.create({ url: tab });
  });
};

openNewTab("view", "collection.html");
openNewTab("how", "how.html");
openNewTab(
  "shmuella",
  "https://media.licdn.com/dms/image/C5603AQHi7OD80ugWTw/profile-displayphoto-shrink_800_800/0?e=1564617600&v=beta&t=bnS1H9va8K6WZjBvFYuHNLmPxM1iImWI9MNcsNV3V_U"
);

document.getElementById("add").addEventListener("click", e => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const activeTab = tabs[0];
    chrome.tabs.sendMessage(
      activeTab.id,
      {
        message: "add_page_to_collection"
      },
      chrome.tabs.create({ url: "collection.html" })
    );
  });
});

// chrome.storage.sync.get & chrome.storage.sync.set are asynchronous
