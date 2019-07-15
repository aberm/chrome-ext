import Scraper from "./scraper.js";

const ul = document.getElementById("ringsList");
const radios = document.querySelectorAll('input[type="radio"]');
const search = document.getElementById("search");
const total = document.getElementById("total");

let allData;

// url added
// url received, check storage of objects for matching object.url

// scrape url
// add to storage
// HTML-setup all objects
// add editable functions for objects

// initial setup, fetching, and saving data to variables

chrome.storage.sync.get("rings", result => {
  chrome.storage.sync.get("newUrl", res => {
    console.log("collection.js -> last ringUrl: ", res.newUrl);
    console.log("collection.js -> current rings: ", result.rings);
    if (result.rings && result.rings.length) {
      // rings data array exists
      if (result.rings.map(ring => ring.url).includes(res.newUrl)) {
        // newUrl already added
        console.log("hi");
        b4setup();
      } else if (!!res.newUrl) {
        // newUrl new
        console.log("heyhey--");
        const x = new Scraper(res.newUrl);
        x.scrape().then(res => {
          chrome.storage.sync.set({ rings: [...result.rings, res] }, () => {
            b4setup();
          });
        });
      } else {
        // newUrl is null
        b4setup();
      }
    } else if (!!res.newUrl) {
      // rings data array empty
      console.log("heyhey");
      const x = new Scraper(res.newUrl);
      x.scrape().then(res => {
        chrome.storage.sync.set({ rings: [res] }, () => {
          b4setup();
        });
      });
    }
    chrome.storage.sync.set({ newUrl: null });
  });
});

const b4setup = () => {
  chrome.storage.sync.get("rings", result => {
    result.rings.length
      ? (total.innerText = result.rings.length + " items")
      : null;
    allData = result.rings;
    setup(allData);
  });
};

/**
 * Main setup function. Called after every filter / sorting. Not called initially.
 * Appends HTML item cards to ul element.
 */
const setup = (allData, sortProperty = null, searchValue = "") => {
  console.log(allData);
  [...allData]
    /* ^ this doesn't destructively manipulate the original list,
  and the products can later be sorted by date */
    .sort(dynamicSort(sortProperty))
    .filter(data => data.title.toLowerCase().includes(searchValue))
    .forEach(data => {
      ul.appendChild(turnDataIntoHtml(data));
    });
};

/**
 * Takes JS Object of data and creates item card and remove button
 */
const turnDataIntoHtml = data => {
  const div = `<div>
    <a href="${data.url}" rel="nofollow" target="_blank">
    <h4>${data.title}</h4>
    </a>
    <img src="${imagePrependHttp(
      data.image
    )}" style="display: block; margin-left: auto; margin-right: auto; width: 50%;">
    <p>${decodeHtmlEntities(data.description).trim()}</p>
    ${/*<h4>Price: $${data.price}</h4>*/ ""}
    ${
      data.price === undefined
        ? "<h4>Price unavailable. Visit product link for more details.</h4>"
        : `<h4>Price: $${data.price}</h4>`
    }
    </div>`;

  const li = document.createElement("li");
  li.style.width = "22%";
  li.style.display = "inline-block";
  li.style.verticalAlign = "top";
  li.style.padding = "10px";

  li.innerHTML = div;
  const remove = document.createElement("button");
  remove.innerText = "remove";
  remove.style.float = "right";
  li.appendChild(remove);

  remove.onclick = e => {
    removeItemFromList(data.url);
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
  chrome.storage.sync.get("rings", result => {
    const newArray = result.rings.filter(ring => ring.url !== removeUrl);
    console.log(newArray);
    chrome.storage.sync.set({ rings: newArray });
  });
};

/**
 * Pretty much a sort function for when the sort buttons are clicked
 */
const dynamicSort = sortProperty => {
  if (sortProperty === "price") {
    return function(a, b) {
      const result =
        parseFloat(a["price"]) < parseFloat(b["price"])
          ? -1
          : parseFloat(a["price"]) > parseFloat(b["price"])
          ? 1
          : 0;
      return result;
    };
  }

  return function(a, b) {
    const result =
      a[sortProperty] < b[sortProperty]
        ? -1
        : a[sortProperty] > b[sortProperty]
        ? 1
        : 0;
    return result;
  };
};

/**
 * Add event listener to radio inputs, reloading data when clicked
 */
radios.forEach(radio => {
  radio.onclick = e => {
    ul.innerHTML = "";
    e.target.value === "date"
      ? setup(allData, null)
      : setup(allData, e.target.value);
  };
});

/**
 * Add event listener to search input, filtering and reloading data when changed
 */
search.oninput = e => {
  ul.innerHTML = "";
  setup(allData, null, e.target.value);
};

const decodeHtmlEntities = str => {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
};

const imagePrependHttp = src => {
  if (!!src && src.startsWith("//")) {
    return "http:" + src;
  }
  return src;
};
