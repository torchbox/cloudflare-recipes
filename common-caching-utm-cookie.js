// NOTE: A 'Cache Level' page rule set to 'Cache Everything' will
// prevent private cookie cache skipping from working, as it is
// applied after this worker runs.

const PRIVATE_COOKIES = ['wagtailcsrftoken', 'sessionid'];
const UTM_COOKIE = 'initialutm';

const STRIP_QUERYSTRING_KEYS = [
    'utm_source',
    'utm_campaign',
    'utm_medium',
    'utm_term',
    'utm_content',
];

addEventListener('fetch', (event) => {
    event.respondWith(main(event));
});

async function main(event) {
    const cache = caches.default;
    let request = event.request;

    // get value for setting a new UTM cookie
    newUtmCookieValue = getUtmCookieValue(request);

    request = stripIgnoredQuerystring(request);

    if (hasPrivateCookie(request)) {
        return fetch(request);
    }

    let response = await cache.match(request);
    if (!response) {
        response = await fetch(request);
        event.waitUntil(cache.put(request, response.clone()));
    }

    // set UTM cookie if required
    if (newUtmCookieValue) {
        const newResponse = new Response(response.body, response);
        newResponse.headers.append(
            'Set-Cookie',
            `${UTM_COOKIE}=${newUtmCookieValue}; path=/`,
        );
        return newResponse;
    }

    return response;
}

function hasPrivateCookie(request) {
    // Check if the request includes any of the specified 'private' cookies
    const cookieString = request.headers.get('Cookie');
    return (
        cookieString !== null &&
        PRIVATE_COOKIES.some((item) => {
            return cookieString.includes(item);
        })
    );
}

function hasUtmCookie(request) {
    // Check if the request already has the UTM cookie set
    const cookieString = request.headers.get('Cookie');
    return cookieString !== null && cookieString.includes(UTM_COOKIE);
}

function getUtmCookieValue(request) {
    // If there's no existing UTM cookie, and the querystring contains a UTM key,
    // return the querystring to save into a new UTM cookie
    if (!hasUtmCookie(request)) {
        const url = new URL(request.url);
        if (STRIP_QUERYSTRING_KEYS.some((key) => url.searchParams.get(key))) {
            return url.search;
        }
    }
    return null;
}

function stripIgnoredQuerystring(request) {
    // Return a request with specified querystring keys stripped out
    const url = new URL(request.url);
    const stripKeys = STRIP_QUERYSTRING_KEYS.filter((v) =>
        url.searchParams.has(v),
    );

    if (stripKeys.length) {
        stripKeys.forEach((v) => url.searchParams.delete(v));

        return new Request(url, request);
    }
    return request;
}
