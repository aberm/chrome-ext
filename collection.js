const ul = document.getElementById("ringsList");
chrome.storage.sync.get("ringUrls", function(result) {
  console.log("THE URLS: ", result.ringUrls);
  result.ringUrls
    .filter(n => n)
    .forEach(url => {
      console.log(url);
      const li = document.createElement("li");
      li.innerHTML = `<p>${url}</p>`;
      const remove = document.createElement("button");
      remove.innerText = "remove";
      li.appendChild(remove);
      ul.appendChild(li);

      // remove.addEventListener("click", removeItem);
      function addClickHandler(elem) {
        elem.addEventListener("click", function(e) {
          // console.log(e);
          removeItemFromList(e.target.parentElement.children[0].innerText);
          location.reload();
        });
      }
      addClickHandler(remove);

      // fetch(url)
      //   .then(res => res.text())
      //   .then(site => {
      //     const parser = new DOMParser();
      //     const htmlDocument = parser.parseFromString(site, "text/html");
      // parseAndGetInfo(htmlDocument, li);
      // });
    });
});

const parseAndGetInfo = (site, li) => {
  console.log("site: ", site);
  console.log(site.getElementsByTagName("img"));
  const img = site.querySelectorAll("img.wp-post-image.lazyload")[0];
  console.log("IMG: ", img);
  console.log(img.src);
  const newImg = document.createElement("img");
  newImg.src = img.src;
  li.appendChild(newImg);
};
const clearButton = document.getElementById("clear");

clearButton.addEventListener("click", event => {
  console.log("clear button clicked");
  chrome.storage.sync.clear(); // Geeez why didn't I think of this...
  location.reload();
});

const removeItemFromList = remove => {
  console.log("REMOVE HERE: ", remove);
  chrome.storage.sync.get("ringUrls", function(result) {
    const newArray = result.ringUrls.filter(url => url !== remove);
    console.log(newArray);
    chrome.storage.sync.set({ ringUrls: newArray });
  });
};
