class Scraper {
  constructor(url, debugMode = false) {
    this.url = url;
    this.debugMode = debugMode;
  }

  scrape = async () => {
    return await this.unpackUrl(this.url);
  };

  /**
   * Pure function that returns JS Object with scraped metadata values.
   */
  unpackUrl = async url => {
    return await this.fetchAndParseUrl(url).then(htmlDocument => {
      return this.scrapeInfo(htmlDocument, url);
    });
  };

  /**
   * fetch and parse a given url and return HTML Document
   */
  fetchAndParseUrl = url => {
    const proxyurl = "https://cors-anywhere.herokuapp.com/";
    return fetch(proxyurl + url).then(res => {
      if (res.ok) {
        return res.text().then(site => {
          const parser = new DOMParser();
          const htmlDocument = parser.parseFromString(site, "text/html");
          return htmlDocument;
        });
      }
    });
  };

  /**
   * Scrape metadata from given HTML Document and return JS Object of data
   */
  scrapeInfo = (site, url) => {
    const data = {
      url: url,
      title: this.scrapeField("name", site).length
        ? this.scrapeField("name", site)[0]
        : site.title,
      image: this.imagePrependHttp(this.scrapeField("image", site)[0]),
      description: this.decodeHtmlEntities(
        this.scrapeField("description", site)[0]
      ).trim(),
      price:
        this.priceRemoveCommas(this.scrapeField("price", site)[0]) ||
        this.priceRemoveCommas(this.scrapeField("price:amount", site)[0])
    };

    return data;
  };

  /**
   * Rules for scraping HTML Document to find metadata. Returns array of found data.
   */
  scrapeField = (field, doc) => {
    // for the weird Javascript nested scope variable bindings:
    const jsonFieldFinder = this.jsonFieldFinder;
    const debugMode = this.debugMode;

    let rules = [
      function() {
        const results = doc.querySelectorAll('[itemprop="' + field + '"]');
        if (results.length) {
          debugMode
            ? console.log({
                ['[itemprop="' + field + '"]']: [...results].map(
                  el => el.content
                )
              })
            : null;
          return results[0].content;
        }
      },
      function() {
        const results = doc.querySelectorAll(
          'meta[property="og:' + field + '"]'
        );
        if (results.length) {
          debugMode
            ? console.log({
                ['meta[property="og:' + field + '"]']: [...results].map(
                  el => el.content
                )
              })
            : null;
          return results[0].content;
        }
      },
      function() {
        const results = doc.querySelectorAll(
          'meta[property="twitter:' + field + '"]'
        );
        if (results.length) {
          debugMode
            ? console.log({
                ['meta[property="twitter:' + field + '"]']: [...results].map(
                  el => el.content
                )
              })
            : null;
          return results[0].content;
        }
      },
      function() {
        const results = doc.querySelectorAll('meta[name="og:' + field + '"]');
        if (results.length) {
          debugMode
            ? console.log({
                ['meta[name="og:' + field + '"]']: [...results].map(
                  el => el.content
                )
              })
            : null;
          return results[0].content;
        }
      },
      function() {
        const results = doc.querySelectorAll(
          'meta[name="twitter:' + field + '"]'
        );
        if (results.length) {
          debugMode
            ? console.log({
                ['meta[name="twitter:' + field + '"]']: [...results].map(
                  el => el.content
                )
              })
            : null;
          return results[0].content;
        }
      },
      function() {
        const results = doc.querySelectorAll('meta[itemprop="' + field + '"]');
        if (results.length) {
          debugMode
            ? console.log({
                ['meta[itemprop="' + field + '"]']: [...results].map(
                  el => el.content
                )
              })
            : null;
          return results[0].content;
        }
      },
      function() {
        const results = doc.querySelectorAll('meta[name="' + field + '"]');
        if (results.length) {
          debugMode
            ? console.log({
                ['meta[name="' + field + '"]']: [...results].map(
                  el => el.content
                )
              })
            : null;
          return results[0].content;
        }
      },
      function() {
        const results = doc.querySelectorAll('span[itemprop="' + field + '"]');
        if (results.length) {
          debugMode
            ? console.log({
                ['span[itemprop="' + field + '"]']: [...results].map(el =>
                  el.getAttribute("content")
                )
              })
            : null;
          return results[0].getAttribute("content");
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
          debugMode
            ? console.log({
                'script[type="application/ld+json"]': arr
                  .filter(item => item.length)
                  .flat()
              })
            : null;
          return arr.filter(item => item.length);
        }
      }
    ];

    if (field === "image") {
      rules.push(function() {
        if (doc.querySelectorAll('img[itemprop="image"]').length) {
          return doc.querySelectorAll('img[itemprop="image"]')[0].src;
        }
      });
    }
    if (field === "name") {
      // rules = rules.reverse();
      rules.push(function() {
        const results = doc.querySelectorAll("h1");
        if (results.length) {
          debugMode
            ? console.log({
                ["h1"]: [...results].map(el => el.innerText.trim())
              })
            : null;
          return results[0].innerText.trim();
        }
      });
    }

    /* sorts for majority */

    const flatArray = rules
      .map(rule => rule())
      .filter(rule => rule)
      .flat()
      .flat()
      .flat();

    const cnts = flatArray.reduce((obj, val) => {
      obj[val] = (obj[val] || 0) + 1;
      return obj;
    }, {});

    const sorted = Object.keys(cnts).sort((a, b) => {
      return cnts[b] - cnts[a];
    });

    // return rules
    //   .map(rule => rule())
    //   .filter(rule => rule)
    //   .flat()
    //   .flat();

    return sorted;
  };

  /**
   * Function for scraping HTML Document to find LD-JSON metadata.
   * Returns array of found data.
   */
  jsonFieldFinder = (json, field, array) => {
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
          this.jsonFieldFinder(json[Object.keys(json)[i]], field, array);
        }
      }
    }
  };

  decodeHtmlEntities = str => {
    const txt = document.createElement("textarea");
    txt.innerHTML = str;
    return txt.value;
  };

  imagePrependHttp = src => {
    return !!src && src.startsWith("//") ? "http:" + src : src;
  };

  priceRemoveCommas = price => {
    return typeof price === "string" || price instanceof String
      ? price.replace(/,/g, "")
      : price;
  };
}

export default Scraper;
