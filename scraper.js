class Scraper {
  constructor(url, doc, debugMode = false) {
    this.url = url;
    this.doc = doc;
    this.debugMode = debugMode;
  }

  scrape = async () => {
    this.doc =
      this.doc === undefined
        ? await this.fetchAndParseUrl(this.url)
        : this.parseDoc();
    return this.scrapeInfo();
  };

  /**
   * fetch and parse a given url and return HTML Document
   */
  fetchAndParseUrl = async url => {
    const res = await fetch(url);
    const site = await res.text();
    const parser = new DOMParser();
    return parser.parseFromString(site, "text/html");
  };

  parseDoc = () => {
    const parser = new DOMParser();
    return parser.parseFromString(this.doc, "text/html");
  };

  /**
   * Returns JS Object of data
   */
  scrapeInfo = () => {
    if (this.doc === undefined) {
      console.error("fetch failed: " + this.url);
      return;
    }
    const data = {
      url: this.url,
      title: this.getTitle(),
      image: this.getImage(),
      description: this.getDescription(),
      price: this.getPrice()
    };

    return data;
  };

  getTitle = () => {
    const s = () => {
      const results = this.doc.querySelectorAll("h1");
      if (results.length) {
        this.debugMode
          ? console.log({
              ["h1"]: [...results].map(el => el.innerText.trim())
            })
          : null;
        return [...results].map(el => el.innerText.trim());
      }
    };

    const all = [
      s(),
      ...(this.listRules("title") || [this.doc.title]),
      ...this.jsonFieldScraper("title")
    ];

    if (this.debugMode) {
      console.log("all titles: ", all);
    }

    return this.mostCommonItem(all);
  };

  getImage = () => {
    const s = () => {
      const titles = this.getTitlesForAlt().filter(x => x);

      const results = titles.map(title =>
        this.doc.querySelectorAll(
          `img[alt*="${title
            .replace(/"/g, '\\"')
            .replace(/'/g, "\\'")
            .replace(/(\r\n|\n|\r)/g, " ")}"]`
        )
      );

      const results2 = [...results].map(a => [...a].map(el => el.src)).flat();

      if (results2.length) {
        this.debugMode
          ? console.log({
              ['img[alt*="' + "titles" + '"]']: [...results2]
            })
          : null;
        return this.tripleFlat(results2);
      }
    };

    const all = [
      s(),
      ...this.listRules("image"),
      ...this.jsonFieldScraper("image")
    ];

    if (this.debugMode) {
      console.log("all images: ", all);
    }

    return this.imageHttp(this.mostCommonItem(this.sortImagesByHost(all)));
  };

  getDescription = () => {
    const all = [
      ...this.listRules("description"),
      ...this.jsonFieldScraper("description")
    ];

    if (this.debugMode) {
      console.log("all descriptions: ", all);
    }

    const desc = this.sortDescriptionsByLongest(all)[0];

    return desc === undefined
      ? undefined
      : this.decodeHtmlEntities(desc).trim();
  };

  getPrice = () => {
    const s = () => {
      const results = this.doc.querySelectorAll('span[id*="price"]');
      if (results.length) {
        this.debugMode
          ? console.log({
              ['span[id*="price"] innerText']: [...results].map(el =>
                el.innerText.trim()
              )
            })
          : null;
        return [...results].map(el => el.innerText.trim());
      }
    };
    const p = () => {
      const results = this.doc.querySelectorAll('span[itemprop="price"]');
      if (results.length) {
        this.debugMode
          ? console.log({
              ['span[itemprop="price"]']: [...results].map(el =>
                el.innerText.trim()
              )
            })
          : null;
        return [...results].map(el => el.innerText.trim());
      }
    };

    const all = [
      s(),
      p(),
      ...(this.listRules("price") || this.listRules("price:amount")),
      ...(this.jsonFieldScraper("price") ||
        this.jsonFieldScraper("price:amount"))
    ];

    if (this.debugMode) {
      console.log("all prices: ", all);
    }

    return this.priceRemoveCommasAnd$(
      this.mostCommonItem(
        this.tripleFlat(all)
          .filter(x => /\d/.test(x))
          .filter(x => parseFloat(x) !== 0)
      )
    );
  };

  singleRuleScraper = (field, output, attribute = "", tag = "", seo = "") => {
    const results = this.doc.querySelectorAll(
      `${tag}[${attribute}="${seo}${field}"]`
    );
    if (results.length) {
      this.debugMode
        ? console.log({
            [`${tag}[${attribute}="${seo}${field}"]`]: [...results].map(
              el => el[output]
            )
          })
        : null;

      return [...results].map(z => z.getAttribute(output));
    }
  };

  listRules = field => {
    const list = [
      ["content", "itemprop"],
      ["content", "property", "meta", "og:"],
      ["content", "property", "meta", "twitter:"],
      ["content", "name", "meta", "og:"],
      ["content", "name", "meta", "twitter:"],
      ["value", "name", "meta", "og:"],
      ["value", "name", "meta", "twitter:"],
      ["content", "itemprop", "meta"],
      ["content", "name", "meta"],
      ["content", "itemprop", "span"]
    ];

    switch (field) {
      case "image":
        list.push(["src", "itemprop", "img"]);
        break;
    }

    return list.map(rule => this.singleRuleScraper(field, ...rule));
  };

  jsonFieldScraper = field => {
    if (
      this.doc.querySelectorAll('script[type="application/ld+json"]').length
    ) {
      const arr = [];
      this.doc
        .querySelectorAll('script[type="application/ld+json"]')
        .forEach(json => {
          if (!!json.innerText.trim()) {
            // not empty json
            const a = [];

            this.jsonFieldSearcher(JSON.parse(json.innerText), field, a);
            arr.push(a);
          }
        });
      this.debugMode
        ? console.log({
            ['script[type="application/ld+json"] ' + field]: arr
              .filter(item => item.length)
              .flat()
          })
        : null;
      return arr.filter(item => item.length);
    } else {
      return [];
    }
  };

  jsonFieldSearcher = (json, field, array) => {
    // if (array.length < 1) {
    // comment this line to get multiple results
    if (
      field in json &&
      // json["@type"] === "Product" &&
      (typeof json[field] == "string" || typeof json[field] == "number")
    ) {
      // success
      array.push(json[field]);
    } else {
      for (let i = 0; i < Object.keys(json).length; i++) {
        if (typeof json[Object.keys(json)[i]] == "object") {
          this.jsonFieldSearcher(json[Object.keys(json)[i]], field, array);
        }
      }
    }
  };

  mostCommonItem = arr => {
    const cnts = this.tripleFlat(arr.filter(x => x)) // remove undefined, null
      .filter(x => x)
      .reduce((obj, val) => {
        obj[val] = (obj[val] || 0) + 1;
        return obj;
      }, {});

    const sorted = Object.keys(cnts).sort((a, b) => {
      return cnts[b] - cnts[a];
    });

    return sorted[0];
  };

  getTitlesForAlt = () => {
    const s = () => {
      const results = this.doc.querySelectorAll("h1");
      if (results.length) {
        this.debugMode
          ? console.log({
              ["h1"]: [...results].map(el => el.innerText.trim())
            })
          : null;
        return [...results].map(el => el.innerText.trim());
      }
    };

    const all = [
      s(),
      ...(this.listRules("title") || [this.doc.title]),
      ...this.jsonFieldScraper("title")
    ];

    return [...new Set(this.tripleFlat(all))];
  };

  decodeHtmlEntities = str => {
    const txt = document.createElement("textarea");
    txt.innerHTML = str;
    return txt.value;
  };

  sortDescriptionsByLongest = arr => {
    return arr
      ? this.tripleFlat(arr)
          .filter(x => x)
          .sort((a, b) => b.length - a.length) // return longest first
      : undefined;
  };

  sortImagesByHost = arr => {
    const hostname = new URL(this.url).hostname;
    const hn = [];
    const notHn = [];
    arr
      ? this.tripleFlat(arr)
          .filter(x => x)
          .forEach(x => {
            !x.startsWith("chrome-extension://" + chrome.runtime.id) &&
            !x.startsWith("data:image/png;base64") // no base64
              ? x.includes(hostname)
                ? hn.push(x)
                : notHn.push(x)
              : null;
          })
      : undefined;
    return hn.concat(notHn);
  };

  imageHttp = src => {
    src = !!src && src.startsWith("//") ? "http:" + src : src;
    src =
      !!src && src.startsWith("chrome-extension://")
        ? src.replace(/chrome-extension:/, "http:")
        : src;
    return src;
  };

  priceRemoveCommasAnd$ = price => {
    return typeof price === "string" || price instanceof String
      ? price.replace(/[$,]/g, "")
      : price;
  };

  tripleFlat = arr => {
    return arr
      .flat()
      .flat()
      .flat();
  };
}

export default Scraper;
