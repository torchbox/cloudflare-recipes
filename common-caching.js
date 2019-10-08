// NOTE: A 'Cache Level' page rule set to 'Cache Everything' will
// prevent private cookie cache skipping from working, as it is
// applied after this worker runs.

const PRIVATE_COOKIES = [
  'csrftoken',
  'sessionid',
];

const STRIP_QUERYSTRING_KEYS = [
  'utm_source',
  'utm_campaign',
  'utm_medium',
  'utm_term',
  'utm_content',
];

addEventListener('fetch', event => {
  event.respondWith(main(event));
});

async function main(event) {
  const cache = caches.default;
  let request = event.request;
  request = stripIgnoredQuerystring(request);

  if (hasPrivateCookie(request)) {
    return fetch(request);
  }

  let response = await cache.match(event.request)
  if (!response) {
    response = await fetch(request)
    event.waitUntil(cache.put(event.request, response.clone()))
  }

  return response;
}


function hasPrivateCookie(request) {
  // Check if the request includes any of the specified 'private' cookies
  const cookieString = request.headers.get('Cookie');
  return cookieString !== null && PRIVATE_COOKIES.some(item => {
    return cookieString.includes(item);
  });
}

function stripIgnoredQuerystring(request) {
  // Return a request with specified querystring keys stripped out
  const url = new URL(request.url);
  const stripKeys = STRIP_QUERYSTRING_KEYS.filter(v => url.searchParams.has(v));

  if (stripKeys.length) {
    stripKeys.forEach(v => url.searchParams.delete(v));

    return new Request(url, {
      body: request.body,
      headers: request.headers,
      redirect: request.redirect,
    });
  }
  return request;
}
