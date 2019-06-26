const ul = document.getElementById("ringsList");
const radios = document.querySelectorAll('input[type="radio"]');
const search = document.getElementById("search");

const dynamicSort = property => {
  if (property === "price") {
    return function(a, b) {
      const result =
        parseFloat(a[property]) < parseFloat(b[property])
          ? -1
          : parseFloat(a[property]) > parseFloat(b[property])
          ? 1
          : 0;
      return result;
    };
  }

  return function(a, b) {
    const result =
      a[property] < b[property] ? -1 : a[property] > b[property] ? 1 : 0;
    return result;
  };
};

radios.forEach(radio => {
  radio.onclick = e => {
    ul.innerHTML = "";
    setup(allData, e.target.value);
  };
});

search.oninput = e => {
  ul.innerHTML = "";
  setup(allData, null, (searchValue = e.target.value));
};

let allData;

// initial setup, fetching, and saving data to variables
chrome.storage.sync.get("ringUrls", function(result) {
  console.log("THE URLS: ", result.ringUrls);
  const urlData = result.ringUrls
    .filter(n => n)
    .map(async url => {
      return await unpackUrl(url);
    });
  Promise.all(urlData).then(urlData => {
    allData = urlData;
    setup(allData);
  });
});

const setup = (allData, property = null, searchValue = "") => {
  console.log(allData);
  allData
    .sort(dynamicSort(property))
    .filter(data => data.title.toLowerCase().includes(searchValue))
    .forEach(data => {
      ul.appendChild(turnDataIntoHtml(data));
    });
};

const unpackUrl = async url => {
  return await fetchAndParseUrl(url).then(htmlDocument => {
    return scrapeInfo(htmlDocument, url);
  });
};

const proxyurl = "https://cors-anywhere.herokuapp.com/";

const fetchAndParseUrl = thisUrl => {
  return fetch(thisUrl).then(res => {
    if (res.ok) {
      return res.text().then(site => {
        const parser = new DOMParser();
        const htmlDocument = parser.parseFromString(site, "text/html");
        return htmlDocument;
      });
    } else {
      return thisUrl === proxyurl + url
        ? null
        : fetchAndParseUrl(proxyurl + url);
    }
  });
};

const scrapeInfo = (site, url) => {
  const data = {
    url: url,
    title: scrapeField("name", site).length
      ? scrapeField("name", site)[0]
      : site.title,
    image: scrapeField("image", site)[0],
    description: scrapeField("description", site)[0],
    price: scrapeField("price", site)[0]
  };

  return data;
};

const turnDataIntoHtml = data => {
  const li = document.createElement("li");
  li.style.width = "22%";
  li.style.display = "inline-block";
  li.style.verticalAlign = "top";
  li.style.padding = "10px";
  const link = document.createElement("a");
  link.href = data.url;
  link.target = "_blank";
  li.appendChild(link);
  const title = document.createElement("h4");
  title.innerText = data.title;
  link.appendChild(title);
  const newImg = document.createElement("img");
  newImg.src = data.image;
  newImg.style =
    "display: block; margin-left: auto; margin-right: auto; width: 50%;";
  li.appendChild(newImg);
  const description = document.createElement("p");
  description.innerText = data.description;
  li.appendChild(description);
  const price = document.createElement("h4");
  price.innerText = `Price: $${data.price}`;
  li.appendChild(price);
  const remove = document.createElement("button");
  remove.innerText = "remove";
  remove.style.float = "right";
  li.appendChild(remove);

  remove.onclick = e => {
    removeItemFromList(url);
    location.reload();
  };

  return li;
};

const clearButton = document.getElementById("clear");

clearButton.addEventListener("click", event => {
  console.log("clear button clicked");
  chrome.storage.sync.clear(); // Geeez why didn't I think of this...
  location.reload();
});

const removeItemFromList = removeUrl => {
  console.log("REMOVE HERE: ", removeUrl);
  chrome.storage.sync.get("ringUrls", function(result) {
    const newArray = result.ringUrls.filter(url => url !== removeUrl);
    console.log(newArray);
    chrome.storage.sync.set({ ringUrls: newArray });
  });
};

const scrapeField = (field, doc) => {
  let rules = [
    function() {
      if (doc.querySelectorAll('[itemprop="' + field + '"]').length) {
        return doc.querySelectorAll('[itemprop="' + field + '"]')[0].content;
      }
    },
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
      if (doc.querySelectorAll('span[itemprop="' + field + '"]').length) {
        return doc
          .querySelectorAll('span[itemprop="' + field + '"]')[0]
          .getAttribute("content");
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

  if (field === "image") {
    rules.push(function() {
      if (doc.querySelectorAll('img[itemprop="' + field + '"]').length) {
        return doc.querySelectorAll('img[itemprop="' + field + '"]')[0].src;
      }
    });
  }
  if (field === "name") {
    rules.push(function() {
      if (doc.querySelectorAll("h1").length) {
        return doc.querySelectorAll("h1")[0].innerText.trim();
      }
    });
  }

  return rules
    .map(rule => rule())
    .filter(rule => rule)
    .flat()
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
