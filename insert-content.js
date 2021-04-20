// Inject content from another URL specified within a comment block on the requested page.
// e.g.
// <!-- include https://www.google.co.uk -->

addEventListener("fetch", (event) => {
  event.respondWith(main(event));
});

async function main(event) {
  let response = await fetch(event.request);
  return insertContent(response);
}

class DocumentHandler {
  constructor(response) {
    this.response = response;
  }

  async comments(comment) {
    const [directive, url] = comment.text.trim().split(" ");
    let fetchUrl;

    // Determine if the specified URL is relative or absolute
    if (url.indexOf("://") > 0 || url.indexOf("//") === 0) {
      fetchUrl = new URL(url);
    } else {
      // Create a URL object using the origin from the original response
      // to create an absolute URL
      const responseUrl = new URL(this.response.url);
      fetchUrl = new URL(responseUrl.origin);
      fetchUrl.pathname = url;
    }

    if (directive == "include") {
      const response = await fetch(fetchUrl.href);
      comment.replace(await response.text(), { html: true });
    }
  }
}

function insertContent(response) {
  return new HTMLRewriter()
    .onDocument(new DocumentHandler(response))
    .transform(response);
}
