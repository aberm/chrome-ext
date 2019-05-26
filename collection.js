const ul = document.getElementById("ringsList");
chrome.storage.sync.get("ringUrls", function(result) {
  result.ringUrls
    .filter(n => n)
    .forEach(url => {
      console.log(url);
      const li = document.createElement("li");
      li.innerText = url;
      ul.appendChild(li);
    });
});
