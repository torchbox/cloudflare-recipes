// Inject some HTML before a given element in the response
// Uses the HTMLRewriter API https://developers.cloudflare.com/workers/runtime-apis/html-rewriter

export default {
  async fetch(request) {
    const response = await fetch(request);
    return new HTMLRewriter()
      .on("*", new BannerElementHandler())
      .transform(response);
  },
};

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
