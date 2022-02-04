// In some cases, Cloudflare require using a "well-known" URL to verify domain ownership to restore access to an account.
// This worker emulates that process using a URL challenge.

// 1. Update `TOKENS` below and deploy this worker to the account
// 2. Add a route for `/.well-known/cf-2fa-verify.txt` ONLY (as it responds to all requests) on any domains Cloudflare requests
// 3. (optional) add a page rule which matches `/.well-known/*` to force HTTPS (it doesn't matter what it does, it just makes sure it doesn't match an existing rule)

// Cloudflare will provide these
const TOKENS = {
  "example.com": "deadbeef5",
};

async function handleRequest(request) {
  const url = new URL(request.url);

  const verificationToken = TOKENS[url.host];
  if (verificationToken) {
    // If the domain is known and we have a token, return it.
    return new Response(verificationToken);
  }

  // Return something nonsensical for an invalid domain
  return new Response("", {status: 404});
}

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});
