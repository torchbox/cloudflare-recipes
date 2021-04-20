# Torchbox Cloudflare Worker Recipes

## common-caching.js

Worker for handling common operations when using Cloudflare as a frontend cache:

- Skip cache when private cookies are present
- Strip querystring keys that don't need to hit the server

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
