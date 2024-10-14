// Inject some HTML before a given element in the response
// Uses the HTMLRewriter API https://developers.cloudflare.com/workers/runtime-apis/html-rewriter

addEventListener("fetch", (event) => {
  event.respondWith(main(event));
});

async function main(event) {
  const response = await fetch(event.request);
  return addBanner(response);
}

class BannerElementHandler {
  static async element(element) {
    element.before(
      `<div>
            Banner content
       </div>`,
      { html: true }
    );
  }
}

function addBanner(response) {
  return new HTMLRewriter()
    .on("*", new BannerElementHandler())
    .transform(response);
}
