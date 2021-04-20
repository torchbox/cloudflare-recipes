// Inject some HTML before a given element in the response
// Uses the HTMLRewriter API https://developers.cloudflare.com/workers/runtime-apis/html-rewriter

addEventListener("fetch", (event) => {
  event.respondWith(main(event));
});

async function main(event) {
  let response = await fetch(event.request);
  return insertContent(response);
}

class ContentElementHandler {
  async comments(comment) {
    const { directive, url } = comment.text.split(":");

    if (directive == "insert") {
      const response = await fetch(url);
      comment.replace(response.body, { html: true });
    }
  }
}

function insertContent(response) {
  return new HTMLRewriter()
    .on("*", new ContentElementHandler())
    .transform(response);
}
