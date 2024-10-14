// Add a holding page, served from an external URL (e.g. S3)
// To send raw HTML directly from the worker,
// see https://developers.cloudflare.com/workers/templates/pages/send_raw_html/

// Update the URL to your holding page.
// Keep it simple, small and self-contained.
const HOLDING_PAGE_URL = "https://example.com";

addEventListener("fetch", (event) => {
  event.respondWith(fetchAndReplace());
});

async function fetchAndReplace() {
  const modifiedHeaders = new Headers();

  modifiedHeaders.set("Content-Type", "text/html");
  modifiedHeaders.append("Pragma", "no-cache");

  const holdingPage = await fetch(HOLDING_PAGE_URL);
  const content = await holdingPage.text();

  // Return modified response.
  return new Response(content, {
    headers: modifiedHeaders,
  });
}
