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
      allData = result.rings;
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
  const x = new Scraper(url);
  x.scrape().then(res => {
    chrome.storage.local.set(
      {
        rings: [
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
        : `<img src="${data.image}">`
    }

    </div>
    <div class="card-title">
      <a href="${data.url}" rel="nofollow" target="_blank">
        <h3>${data.title}</h3>
      </a>
    </div>
    <div class="card-desc">
      <p>${data.description}</p>
    </div>
    <div class="notes">
    ${data.notes.trim() === "" ? "" : `<h4>Notes: </h4><p>${data.notes}</p>`}
    </div>
    <div class="card-cost">
    ${
      data.price === undefined
        ? `<p><span class="unavailable">Price unavailable. Visit product link for more details.</span></p>`
        : `<p><span>Price:</span>  &nbsp; $${data.price}</p>`
    }
    </div>
    <a href="${data.url}" rel="nofollow" target="_blank" class="view">
    <div class="clear">View Product</div>
    </a>
    `;

  const li = document.createElement("li");
  li.className = "card";

  li.innerHTML = div;

  const edit = document.createElement("button");
  edit.className = "edit";
  edit.innerText = "edit";
  li.appendChild(edit);

  edit.onclick = e => {
    editData(data);
  };

  const remove = document.createElement("div");
  remove.className = "card-remove";
  remove.innerText = "X";
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

  document.getElementById("url-edit").innerText = data.url;
  document.getElementById("edit-display-image").src = data.image;
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

  document.getElementById("resetFields").onclick = e => {
    e.preventDefault(); // otherwise form submits
    const x = new Scraper(data.url);
    x.scrape().then(res => {
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
  const emailForm = document.getElementById("email-form");
  const emailInput = document.getElementById("email-input");
  const cancelEmail = document.getElementById("cancelEmail");
  const submitEmail = document.getElementById("submitEmail");

  emailButton.onclick = e => {
    emailForm.style.display = "block";
    emailButton.style.display = "none";
    emailInput.focus();
  };

  submitEmail.onclick = e => {
    console.log(emailInput.value);
    // send export email
    emailInput.value = "";
    emailForm.style.display = "none";
    emailButton.style.display = "block";
  };

  cancelEmail.onclick = e => {
    emailInput.value = "";
    emailForm.style.display = "none";
    emailButton.style.display = "block";
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
  return description.length > 400
    ? description.slice(0, 397) + "..."
    : description;
};

const emptyList = () => {
  // TODO: elements briefly visible
  document.querySelector("div.email").style.display = "none";
  document.querySelector("#nav__search-container").style.display = "none";
  document.querySelector(".sort-bar").style.display = "none";

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
