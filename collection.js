import Scraper from "./scraper.js";

const ul = document.getElementById("ringsList");
const dropdown = document.getElementById("sort-by");
const search = document.getElementById("search");
const total = document.getElementById("total");

let searchValue = "";
let sortProperty = dropdown.options[dropdown.selectedIndex].value;

let allData;

chrome.storage.local.get("rings", result => {
  chrome.storage.local.get("newUrl", res => {
    console.log("collection.js -> last ringUrl: ", res.newUrl);
    console.log("collection.js -> current rings: ", result.rings);
    if (result.rings && result.rings.length) {
      // rings data array exists
      if (result.rings.map(ring => ring.url).includes(res.newUrl)) {
        // newUrl already added
        console.log("newUrl already added");
        getRingsAndSetup();
      } else if (!!res.newUrl) {
        // newUrl new
        console.log("newUrl new");
        getRingsAndSetup().then(addLoading);
        addNewUrl(res.newUrl);
      } else {
        // newUrl is null
        getRingsAndSetup();
      }
    } else if (!!res.newUrl) {
      // rings data array empty, newUrl new
      console.log("rings data array empty");
      addLoading();
      addNewUrl(res.newUrl);
    } else {
      // empty array, no newUrl
      emptyList();
    }
    chrome.storage.local.set({ newUrl: null });
  });
});

const getRingsAndSetup = () => {
  ul.innerHTML = "";

  return new Promise((res, rej) => {
    chrome.storage.local.get("rings", async result => {
      allData = await result.rings;
      setup();
      res(allData);
    });
  });
};

/**
 * Main setup function. Called after every filter / sorting.
 * Appends HTML item cards to ul element.
 */

const setup = () => {
  ul.innerHTML = "";
  console.log(allData);

  if (allData && allData.length === 0) {
    emptyList();
  } else if (allData.length > 0) {
    document.querySelector("div.items-container").classList.remove("invisible");
    document
      .querySelector("div#nav__search-container")
      .classList.remove("invisible");
    document.querySelector("div.sort-bar").classList.remove("invisible");
  }

  total.innerText = allData.length
    ? allData.length > 1
      ? allData.length + " items"
      : "1 item"
    : null;

  [...allData]
    /* ^ this doesn't destructively manipulate the original list,
  and the products can later be sorted by date */
    .sort(dynamicSort(sortProperty))
    .filter(data => data.title.toLowerCase().includes(searchValue))
    .forEach(data => {
      ul.appendChild(turnDataIntoHtml(data));
    });
};

const addNewUrl = url => {
  chrome.storage.local.get("newDoc", nd => {
    const newDoc = nd.newDoc;

    const x = new Scraper(url, newDoc);
    x.scrape().then(res => {
      console.log("RES ", res);
      if (res) {
        // fetch successful
        chrome.storage.local.set(
          {
            rings: [
              // ...allData,
              ...(allData || []),
              {
                ...res,
                description: capDescriptionLength(res.description),
                notes: ""
              }
            ]
          },
          () => {
            removeLoading();
            getRingsAndSetup();
          }
        );
      } else {
        // fetch failed
        removeLoading();
      }
    });
    chrome.storage.local.set({ newDoc: null });
  });
};

/**
 * Takes JS Object of data and creates item card and remove button
 */
const turnDataIntoHtml = data => {
  const div = `
    <div class="card-img">
    ${
      data.image === undefined || data.image === ""
        ? `<p class="unavailable">Image unavailable. Visit product link for more details.</p>`
        : `<img src="${data.image}" alt="${data.title}">`
    }

    </div>
    <div class="card-title">
      <h3>${data.title}</h3>
    </div>
    <div class="card-desc">
      <p>${data.description}</p>
    </div>
    <div class="notes">
    ${
      data.notes.trim() === ""
        ? ""
        : `<h4>Notes: </h4><p>${data.notes.replace(/\n/g, "<br />")}</p>`
    }
    </div>
    <div class="card-cost">
    ${
      data.price === undefined
        ? `<p><span class="unavailable">Price unavailable. Visit product link for more details.</span></p>`
        : `<p><span>Price:</span>  &nbsp; ${parseFloat(
            data.price
          ).toLocaleString("en-US", {
            style: "currency",
            currency: "USD"
          })}</p>`
    }
    </div>
    <a href="${data.url}" rel="nofollow" target="_blank" class="view">
    <div class="clear">View Product</div>
    </a>
    <a class="overlay-link" href="${
      data.url
    }" rel="nofollow" target="_blank" class="view">
    </a>
    `;

  const li = document.createElement("li");
  li.className = "card";

  li.innerHTML = div;

  const edit = document.createElement("button");
  edit.className = "edit normal-padding";
  edit.innerText = "edit";
  li.appendChild(edit);

  edit.onclick = e => {
    editData(data);
  };

  const remove = document.createElement("div");
  remove.className = "card-remove";
  remove.innerHTML = "&times;";
  li.prepend(remove);

  remove.onclick = e => {
    const yes = confirm(`Are you sure you want to remove ${data.title}?`);
    if (yes) {
      removeItemFromList(data.url);
    }
  };

  return li;
};

const removeItemFromList = removeUrl => {
  const newArray = [...allData].filter(ring => ring.url !== removeUrl);
  chrome.storage.local.set({ rings: newArray }, () => {
    allData = newArray;
    setup();
  });
};

/**
 * Appends edit form and fills it with editable data that can be saved or reset
 */
const editData = data => {
  const form = document.getElementById("edit-form");

  document.getElementById("url-edit").value = data.url;
  document.getElementById("edit-display-image").src = data.image || "";
  form.elements["title"].value = data.title;
  form.elements["image"].value = data.image;
  form.elements["description"].value = data.description;
  form.elements["price"].value = data.price;
  form.elements["notes"].value = data.notes;

  const modal = document.getElementById("edit-modal");
  modal.style.display = "block";

  document.getElementById("closeEditModal").onclick = () => {
    modal.style.display = "none";
  };

  window.onclick = event => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };

  window.onkeydown = e => {
    if (event.key === "Escape") {
      modal.style.display = "none";
    }
  };

  const reset = document.getElementById("resetFields");
  reset.onclick = e => {
    e.preventDefault(); // otherwise form submits

    const spinner = document.getElementById("spinner");
    reset.classList.add("invisible");
    spinner.classList.remove("invisible");

    const x = new Scraper(data.url);
    x.scrape().then(res => {
      reset.classList.remove("invisible");
      spinner.classList.add("invisible");

      document.getElementById("url-edit").innerText = res.url;
      form.elements["title"].value = res.title;
      form.elements["image"].value = res.image;
      form.elements["description"].value = capDescriptionLength(
        res.description
      );
      form.elements["price"].value = res.price;
    });
  };

  const submitHandler = e => {
    e.preventDefault();

    const newTitle = document.getElementById("title-edit").value;
    const newImage = document.getElementById("image-edit").value;
    const newDescription = document.getElementById("description-edit").value;
    const newPrice = parseFloat(document.getElementById("price-edit").value);
    const newNotes = document.getElementById("notes-edit").value;

    // brilliant!
    const newArray = [...allData].map(ring => {
      return ring.url === data.url
        ? {
            ...ring,
            title: newTitle,
            image: newImage,
            description: newDescription,
            price: newPrice,
            notes: newNotes
          }
        : ring;
    });
    chrome.storage.local.set({ rings: newArray }, () => {
      getRingsAndSetup();
      modal.style.display = "none";
    });
  };

  form.onsubmit = e => submitHandler(e);
};

const emailFunction = (() => {
  const emailButton = document.getElementById("emailButton");
  const emailModal = document.getElementById("email-modal");
  const emailForm = document.getElementById("email-form");
  const cancelEmail = document.getElementById("closeEmailModal");
  // const emailInput = document.getElementById("email-input");
  // const submitEmail = document.getElementById("submitEmail");

  const selectAll = document.getElementById("select-all");
  const selectNone = document.getElementById("select-none");
  const checkboxDiv = document.getElementById("select-rings-email");

  emailButton.onclick = e => {
    // do once on page load?
    for (let i = 0; i < allData.length; i++) {
      checkboxDiv.innerHTML += `<input type="checkbox" name="ring${i}" id="ring-${i}" value="${i}" />
      <img ${allData[i].image ? "src=" + allData[i].image : ""} alt="${
        allData[i].title
      }" class="email-ring-img" />
      <label class="unbold" for='ring-${i}'> ${allData[i].title}${
        allData[i].price
          ? "<span class='right'>" +
            parseFloat(allData[i].price).toLocaleString("en-US", {
              style: "currency",
              currency: "USD"
            }) +
            "</span>"
          : "<span class='right'><i>no price</i></span>"
      }</label>`;
    }
    emailModal.style.display = "block";
  };

  selectAll.onclick = e => {
    e.preventDefault();
    let checkboxes = document.querySelectorAll("[name*=ring]");
    checkboxes.forEach(cbox => (cbox.checked = true));
  };

  selectNone.onclick = e => {
    e.preventDefault();
    let checkboxes = document.querySelectorAll("[name*=ring]");
    checkboxes.forEach(cbox => (cbox.checked = false));
  };

  cancelEmail.onclick = e => {
    // remove form data
    emailModal.style.display = "none";
    // emailButton.style.display = "block";
  };

  window.onclick = event => {
    if (event.target === emailModal) {
      // remove form data
      emailModal.style.display = "none";
    }
  };

  window.onkeydown = e => {
    if (event.key === "Escape") {
      // remove form data
      emailModal.style.display = "none";
    }
  };

  emailForm.onsubmit = e => {
    e.preventDefault();
    console.log(e);
    // process form data
    // remove form data
  };
})();

/**
 * Pretty much a sort function for when the sort buttons are clicked
 */
const dynamicSort = sortProperty => {
  if (sortProperty === "price-low") {
    return function(a, b) {
      if (!!a.price && !!b.price) {
        const result =
          parseFloat(a["price"]) < parseFloat(b["price"])
            ? -1
            : parseFloat(a["price"]) > parseFloat(b["price"])
            ? 1
            : 0;
        return result;
      } else if (!!a.price) {
        return -1;
      } else if (!!b.price) {
        return 1;
      }
    };
  } else if (sortProperty === "price-high") {
    return function(a, b) {
      if (!!a.price && !!b.price) {
        const result =
          parseFloat(a["price"]) < parseFloat(b["price"])
            ? 1
            : parseFloat(a["price"]) > parseFloat(b["price"])
            ? -1
            : 0;
        return result;
      } else if (!!a.price) {
        return -1;
      } else if (!!b.price) {
        return 1;
      }
    };
  } else if (sortProperty === "date-last") {
    return function(a, b) {
      return -1; // reverses array
    };
  } else if (sortProperty === "date-first") {
    return function(a, b) {
      return 1;
    };
  } else {
    return function(a, b) {
      const result =
        a[sortProperty] < b[sortProperty]
          ? -1
          : a[sortProperty] > b[sortProperty]
          ? 1
          : 0;
      return result;
    };
  }
};

/**
 * Add event listener to dropdown inputs, reloading data when clicked
 */

dropdown.onchange = e => {
  sortProperty = e.target.value;
  ul.innerHTML = "";
  setup();
};

/**
 * Add event listener to search input, filtering and reloading data when changed
 */
search.oninput = e => {
  searchValue = e.target.value;
  ul.innerHTML = "";
  setup();
};

const capDescriptionLength = description => {
  return !!description
    ? description.length > 400
      ? description.slice(0, 397) + "..."
      : description
    : description;
};

const emptyList = () => {
  document.querySelector("div.items-container").classList.add("invisible");
  document
    .querySelector("div#nav__search-container")
    .classList.add("invisible");
  document.querySelector("div.sort-bar").classList.add("invisible");

  ul.innerHTML = `<h3 id="empty-list">Add a ring to get started. Need help? <a
    rel="nofollow"
    target="_blank"
    href="https://www.estatediamondjewelry.com/how-use-engagement-ring-wishlist-extension"
    >Click here</a
  ></h3>`;
};

const addLoading = () => {
  const loader = document.createElement("li");
  loader.className = "card loading";
  loader.id = "loading";
  loader.innerHTML = `
  <div class="sk-circle">
    <div class="sk-circle1 sk-child"></div>
    <div class="sk-circle2 sk-child"></div>
    <div class="sk-circle3 sk-child"></div>
    <div class="sk-circle4 sk-child"></div>
    <div class="sk-circle5 sk-child"></div>
    <div class="sk-circle6 sk-child"></div>
    <div class="sk-circle7 sk-child"></div>
    <div class="sk-circle8 sk-child"></div>
    <div class="sk-circle9 sk-child"></div>
    <div class="sk-circle10 sk-child"></div>
    <div class="sk-circle11 sk-child"></div>
    <div class="sk-circle12 sk-child"></div>
  </div>
`;
  ul.appendChild(loader);
};

const removeLoading = () => {
  document.getElementById("loading").remove();
};

const analytics = ((i, s, o, g, r, a, m) => {
  i["GoogleAnalyticsObject"] = r;
  (i[r] =
    i[r] ||
    function() {
      (i[r].q = i[r].q || []).push(arguments);
    }),
    (i[r].l = 1 * new Date());
  (a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]);
  a.async = 1;
  a.src = g;
  m.parentNode.insertBefore(a, m);
})(
  window,
  document,
  "script",
  "https://www.google-analytics.com/analytics.js",
  "ga"
); // Note: https protocol here

ga("create", "UA-145168497-1", "auto"); // Enter your GA identifier
ga("set", "checkProtocolTask", function() {}); // Removes failing protocol check. @see: http://stackoverflow.com/a/22152353/1958200
ga("require", "displayfeatures");
ga("send", "pageview", "/collection.html");
