const ul = document.getElementById("ringsList");
chrome.storage.sync.get("ringUrls", function(result) {
  console.log("THE URLS: ", result.ringUrls);
  result.ringUrls
    .filter(n => n)
    .forEach(url => {
      console.log(url);
      const li = document.createElement("li");
      li.style.width = "22%";
      li.style.display = "inline-block";
      li.style.verticalAlign = "top";
      li.style.padding = "10px";
      const link = document.createElement("a");
      link.href = url;
      li.appendChild(link);
      const title = document.createElement("h4");
      link.appendChild(title);
      const newImg = document.createElement("img");
      // newImg.width = 175;
      newImg.style =
        "display: block; margin-left: auto; margin-right: auto; width: 50%;";
      li.appendChild(newImg);
      const description = document.createElement("p");
      li.appendChild(description);
      const price = document.createElement("h4");
      price.innerText = "Price: $";
      li.appendChild(price);
      const remove = document.createElement("button");
      remove.innerText = "remove";
      remove.style.float = "right";
      li.appendChild(remove);
      ul.appendChild(li);

      // remove.addEventListener("click", removeItem);
      function addClickHandler(elem) {
        elem.addEventListener("click", function(e) {
          // console.log(e);
          removeItemFromList(e.target.parentElement.children[0].href);
          location.reload();
        });
      }
      addClickHandler(remove);

      const proxyurl = "https://cors-anywhere.herokuapp.com/";
      fetch(proxyurl + url)
        .then(res => res.text())
        .then(site => {
          const parser = new DOMParser();
          const htmlDocument = parser.parseFromString(site, "text/html");
          parseAndGetInfo(htmlDocument, newImg, title, description, price);
        });
    });
});

const parseAndGetInfo = (site, newImg, title, description, price) => {
  const ldjsons = site.querySelectorAll("[type='application/ld+json']");
  // if (ldjsons.length) {
  //   const ldjson = JSON.parse(ldjsons[1].innerText);
  //
  //   const product = [...ldjsons]
  //     .map(json => JSON.parse(json.innerText))
  //     .filter(json => json["@type"] === "Product")[0];
  //
  //   // console.log(product);
  //
  //   newImg.src = ldjson["@graph"][1].image;
  //   title.innerText = ldjson["@graph"][1].name;
  //   description.innerText = ldjson["@graph"][1].description;
  //   price.innerText += ldjson["@graph"][1].offers[0].price;
  // } else {

  // needs url (take from storage) + product title
  // title.innerText = console.log(scrapeField("name", site));
  title.innerText = site.title;
  newImg.src = scrapeField("image", site)[0];
  description.innerText = scrapeField("description", site)[0];
  price.innerText += scrapeField("price", site)[0];
  // }
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

const scrapeField = (field, doc) => {
  const rules = [
    function() {
      if (doc.querySelectorAll('meta[property="og:' + field + '"]').length) {
        return doc.querySelectorAll('meta[property="og:' + field + '"]')[0]
          .content;
      }
    },
    function() {
      if (
        doc.querySelectorAll('meta[property="twitter:' + field + '"]').length
      ) {
        return doc.querySelectorAll('meta[property="twitter:' + field + '"]')[0]
          .content;
      }
    },
    function() {
      if (doc.querySelectorAll('meta[itemprop="' + field + '"]').length) {
        return doc.querySelectorAll('meta[itemprop="' + field + '"]')[0]
          .content;
      }
    },
    function() {
      if (doc.querySelectorAll('meta[name="' + field + '"]').length) {
        return doc.querySelectorAll('meta[name="' + field + '"]')[0].content;
      }
    },
    function() {
      if (doc.querySelectorAll('script[type="application/ld+json"]').length) {
        const arr = [];
        doc
          .querySelectorAll('script[type="application/ld+json"]')
          .forEach(json => {
            const a = [];
            jsonFieldFinder(JSON.parse(json.innerText), field, a);
            arr.push(a);
          });
        return arr.filter(item => item.length);
      }
    }
  ];

  return rules
    .map(rule => rule())
    .filter(rule => rule)
    .flat();
};

const jsonFieldFinder = (json, field, array) => {
  // if (array.length < 1) {
  // comment this line to get multiple results
  if (
    field in json &&
    // json["@type"] === "Product" &&
    typeof json[field] == "string"
  ) {
    // success
    array.push(json[field]);
  } else {
    for (let i = 0; i < Object.keys(json).length; i++) {
      if (typeof json[Object.keys(json)[i]] == "object") {
        jsonFieldFinder(json[Object.keys(json)[i]], field, array);
      }
    }
  }
  // }
};
