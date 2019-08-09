class Scraper {
  constructor(url, doc, debugMode = false) {
    this.url = url;
    this.doc = doc;
    this.debugMode = debugMode;
  }

  scrape = async () => {
    const res =
      this.doc === undefined
        ? await this.fetchAndParseUrl(this.url)
        : this.parseDoc();
    this.doc = res;
    return this.scrapeInfo();
  };

  /**
   * fetch and parse a given url and return HTML Document
   */
  fetchAndParseUrl = async url => {
    const proxyurl = "https://cors-anywhere.herokuapp.com/";
    const res = await fetch(proxyurl + url);
    const site = await res.text();
    const parser = new DOMParser();
    return parser.parseFromString(site, "text/html");
  };

  parseDoc = () => {
    const parser = new DOMParser();
    return parser.parseFromString(this.doc, "text/html");
  };

  /**
   * Scrape metadata from given HTML Document and return JS Object of data
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

    return this.mostCommonItem([
      s(),
      ...(this.listRules("title") || [this.doc.title]),
      ...this.jsonFieldScraper("title")
    ]);
  };

  getImage = () => {
    const s = () => {
      const title = this.getTitle();
      const results = this.doc.querySelectorAll('img[alt*="' + title + '"]');
      if (results.length) {
        this.debugMode
          ? console.log({
              ['img[alt*="' + title + '"]']: [...results].map(el => el.src)
            })
          : null;
        return [...results].map(el => el.src);
      }
    };

    return this.imagePrependHttp(
      this.mostCommonItem([
        s(),
        ...this.listRules("image"),
        ...this.jsonFieldScraper("image")
      ])
    );
  };

  getDescription = () => {
    const desc = this.mostCommonItem([
      ...this.listRules("description"),
      ...this.jsonFieldScraper("description")
    ]);

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
              ['span[id*="price"]']: [...results].map(el => el.innerText.trim())
            })
          : null;
        return [...results].map(el => el.innerText.trim());
      }
    };

    return this.priceRemoveCommasAnd$(
      this.mostCommonItem([
        s(),
        ...(this.listRules("price") || this.listRules("price:amount")),
        ...(this.jsonFieldScraper("price") ||
          this.jsonFieldScraper("price:amount"))
      ])
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
          const a = [];

          this.jsonFieldSearcher(JSON.parse(json.innerText), field, a);
          arr.push(a);
        });
      this.debugMode
        ? console.log({
            'script[type="application/ld+json"]': arr
              .filter(item => item.length)
              .flat()
          })
        : null;
      return arr.filter(item => item.length);
    } else {
      return [];
    }
  };

  /**
   * Function for scraping HTML Document to find LD-JSON metadata.
   * Returns array of found data.
   */
  jsonFieldSearcher = (json, field, array) => {
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
          this.jsonFieldSearcher(json[Object.keys(json)[i]], field, array);
        }
      }
    }
  };

  mostCommonItem = arr => {
    const cnts = arr
      .filter(x => x) // remove undefined, null
      .flat()
      .flat()
      .flat()
      .reduce((obj, val) => {
        obj[val] = (obj[val] || 0) + 1;
        return obj;
      }, {});

    const sorted = Object.keys(cnts).sort((a, b) => {
      return cnts[b] - cnts[a];
    });

    return sorted[0];
  };

  decodeHtmlEntities = str => {
    const txt = document.createElement("textarea");
    txt.innerHTML = str;
    return txt.value;
  };

  imagePrependHttp = src => {
    return !!src && src.startsWith("//") ? "http:" + src : src;
  };

  priceRemoveCommasAnd$ = price => {
    return typeof price === "string" || price instanceof String
      ? price.replace(/[$,]/g, "")
      : price;
  };
}

export default Scraper;
