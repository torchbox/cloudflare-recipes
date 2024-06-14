# Torchbox Cloudflare Worker Recipes

## common-caching.js

Worker for handling common operations when using Cloudflare as a frontend cache:

- Skip cache when private cookies are present
- Strip querystring keys that don't need to hit the server

## common-caching-utm-cookie.js
Similar to the above worker, with the following extra feature to allow for a user's landing UTM to be carried forward
through their site journey without impacting cacheability:

* Checks for UTM querystring keys (which will be stripped before passing on to the server)
* If any are present, append a cookie containing the querystring to the response (unless the cookie already exists)

## holding-page.js

Worker for putting up a holding page from an external source.

- Allows updating the markup without access to the Cloudflare dashboard

## insert-banner.js

Inject some content specified within the worker in to the response using the `HTMLRewriter` API.
Useful in a pinch when you need to get an alert banner up.

## insert-content.js

Replace comments on the source page with the content of requests to the specified URLs.

e.g. a source page containing

```
<html>
<body>
    <!-- include https://www.torchbox.com/ -->
</body>
</html>
```

will include the contents of a request to www.torchbox.com.

Also works with relative paths.
