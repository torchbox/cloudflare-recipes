// This is a Cloudflare Worker script that implements caching with support for A/B testing.
// It is based on the common-caching.js script, with additional logic to handle A/B testing scenarios, based on:
// https://github.com/wagtail-nest/wagtail-ab-testing/blob/204493c2a78131acf52d5feda3ec40425cc0b58a/README.md#running-ab-tests-on-a-site-that-uses-cloudflare-caching
//
// A path can only be identified as having an A/B test after it has been requested.
// If it is an A/B test, ensure it never gets put into the cache via responseIsCachable, and the common caching
// logic will miss on the cache and fetch the A/B test from the origin.

// ** Set WAGTAIL_AB_TESTING_WORKER_TOKEN as a global variable in Cloudflare Workers dashboard **
// This should match the token on your Django settings
// NOTE: Wagtail AB Testing is incompatible with Basic Authentication because the worker uses the Authorization header
// to authenticate itself to the package, replacing any Basic scheme Authorization header on the incoming request.

const AB_TEST_HEADER = "X-WagtailAbTesting-Test";

async function fetchOrigin(request, env) {
  if (request.method === "GET") {
    const newRequest = new Request(request, {
      headers: {
        ...request.headers,
        Authorization: `Token ${env.WAGTAIL_AB_TESTING_WORKER_TOKEN}`,
        "X-Requested-With": "WagtailAbTestingWorker",
      },
    });

    const response = await fetch(newRequest);

    // If there is a test running at the URL, the worker would return
    // a JSON response containing both versions of the page. Also, it
    // returns the test ID in the X-WagtailAbTesting-Test header.
    const testId = response.headers.get(AB_TEST_HEADER);
    if (testId) {
      // Participants of a test would have a cookie that tells us which
      // version of the page being tested on that they should see
      // If they don't have this cookie, serve a random version
      const versionCookieName = `abtesting-${testId}-version`;
      const cookie = request.headers.get("cookie");
      let version;
      if (cookie && cookie.includes(`${versionCookieName}=control`)) {
        version = "control";
      } else if (cookie && cookie.includes(`${versionCookieName}=variant`)) {
        version = "variant";
      } else if (Math.random() < 0.5) {
        version = "control";
      } else {
        version = "variant";
      }

      const jsonResponse = await response.json();
      return new Response(jsonResponse[version], {
        headers: {
          ...response.headers,
          "Content-Type": "text/html",
        },
      });
    }

    return response;
  }

  return fetch(request);
}

// ----------------------------------------------------
//
// Lightly modified common-caching.js script, based on:
// https://github.com/torchbox/cloudflare-recipes/blob/cdafd8dbbb0475c25806fb32d3c6c24145924596/common-caching.js
//
// fetchOrigin replaces calls to fetch to ensure A/B test responses are handled correctly
// responseIsCachable has an additional clause to prevent caching of A/B tests
// ----------------------------------------------------

// NOTE: A 'Cache Level' page rule set to 'Cache Everything' will
// prevent private cookie cache skipping from working, as it is
// applied after this worker runs.

// When any cookie in this list is present in the request, cache will be skipped
const PRIVATE_COOKIES = ["sessionid"];

// Cookies to include in the cache key
const VARY_COOKIES = [];

// Request headers to include in the cache key.
// Note: Do not add `cookie` to this list!
const VARY_HEADERS = [
  "X-Requested-With",

  // HTMX
  "HX-Boosted",
  "HX-Current-URL",
  "HX-History-Restore-Request",
  "HX-Prompt",
  "HX-Request",
  "HX-Target",
  "HX-Trigger-Name",
  "HX-Trigger",
];

// These querystring keys are stripped from the request as they are generally not
// needed by the origin.
const STRIP_QUERYSTRING_KEYS = [
  // UTM
  "utm_id",
  "utm_source",
  "utm_campaign",
  "utm_medium",
  "utm_term",
  "utm_content",
  "utm_source_platform",
  "utm_creative_format",
  "utm_marketing_tactic",

  "gclid",
  "wbraid",
  "gbraid",
  "fbclid",
  "dm_i", // DotDigital
  "msclkid",
  "al_applink_data", // Meta outbound app links

  // https://docs.flying-press.com/cache/ignore-query-strings
  "age-verified",
  "ao_noptimize",
  "usqp",
  "cn-reloaded",
  "sscid",
  "ef_id",
  "_bta_tid",
  "_bta_c",
  "fb_action_ids",
  "fb_action_types",
  "fb_source",
  "_ga",
  "adid",
  "_gl",
  "gclsrc",
  "gdfms",
  "gdftrk",
  "gdffi",
  "_ke",
  "trk_contact",
  "trk_msg",
  "trk_module",
  "trk_sid",
  "mc_cid",
  "mc_eid",
  "mkwid",
  "pcrid",
  "mtm_source",
  "mtm_medium",
  "mtm_campaign",
  "mtm_keyword",
  "mtm_cid",
  "mtm_content",
  "epik",
  "pp",
  "pk_source",
  "pk_medium",
  "pk_campaign",
  "pk_keyword",
  "pk_cid",
  "pk_content",
  "redirect_log_mongo_id",
  "redirect_mongo_id",
  "sb_referer_host",
];

// If this is true, the querystring keys stripped from the request will be
// addeed to any Location header served by a redirect.
const REPLACE_STRIPPED_QUERYSTRING_ON_REDIRECT_LOCATION = false;

// If this is true, querystring key are stripped if they have no value eg. ?foo
// Disabled by default, but highly recommended
const STRIP_VALUELESS_QUERYSTRING_KEYS = false;

// Only these status codes should be considered cacheable
// (from https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html#sec13.4)
const CACHABLE_HTTP_STATUS_CODES = [200, 203, 206, 300, 301, 410];

export default {
  async fetch(originalRequest, env, ctx) {
    const cache = caches.default;
    // eslint-disable-next-line prefer-const
    const [request, strippedParams] = stripQuerystring(originalRequest);

    if (!requestIsCachable(request)) {
      // If the request isn't cacheable, return a Response directly from the origin.
      return fetchOrigin(request, env);
    }

    const cachingRequest = getCachingRequest(request);
    let response = await cache.match(cachingRequest);

    if (!response) {
      // If we didn't get a response from the cache, fetch one from the origin
      // and put it in the cache.
      response = await fetchOrigin(request, env);
      if (responseIsCachable(response)) {
        ctx.waitUntil(cache.put(cachingRequest, response.clone()));
      }
    }

    if (REPLACE_STRIPPED_QUERYSTRING_ON_REDIRECT_LOCATION) {
      response = replaceStrippedQsOnRedirectResponse(response, strippedParams);
    }

    return response;
  },
};

/*
 * Cacheability Utilities
 */
function requestIsCachable(request) {
  /*
   * Given a Request, determine if it should be cached.
   * Currently the only factor here is whether a private cookie is present.
   */
  return !hasPrivateCookie(request);
}

function responseIsCachable(response) {
  /*
   * Given a Response, determine if it should be cached.
   * Factors here are whether the status code is cachable, and whether it is an A/B test response (uncached if so).
   */
  return (
    CACHABLE_HTTP_STATUS_CODES.includes(response.status) &&
    !response.headers.has(AB_TEST_HEADER)
  );
}

function getCachingRequest(request) {
  /**
   * Create a new request for use as a cache key.
   *
   * Note: Modifications to this request are not sent upstream.
   */

  const cookies = getCookies(request);

  const requestURL = new URL(request.url);

  // Include specified cookies in cache key
  VARY_COOKIES.forEach((cookieName) =>
    requestURL.searchParams.set(
      `cookie-${cookieName}`,
      cookies[cookieName] || ""
    )
  );

  // Include specified headers in cache key
  VARY_HEADERS.forEach((headerName) =>
    requestURL.searchParams.set(
      `header-${headerName}`,
      request.headers.get(headerName) || ""
    )
  );

  return new Request(requestURL, request);
}

/*
 * Request Utilities
 */
function stripQuerystring(request) {
  /**
   * Given a Request, return a new Request with the ignored or blank querystring keys stripped out,
   * along with an object representing the stripped values.
   */
  const url = new URL(request.url);

  const stripKeys = STRIP_QUERYSTRING_KEYS.filter((v) =>
    url.searchParams.has(v)
  );

  const strippedParams = {};

  if (stripKeys.length) {
    stripKeys.reduce((acc, key) => {
      acc[key] = url.searchParams.getAll(key);
      url.searchParams.delete(key);
      return acc;
    }, strippedParams);
  }

  if (STRIP_VALUELESS_QUERYSTRING_KEYS) {
    // Strip query params without values to avoid unnecessary cache misses
    [...url.searchParams.entries()].forEach(([key, value]) => {
      if (!value) {
        url.searchParams.delete(key);
        strippedParams[key] = "";
      }
    });
  }

  return [new Request(url, request), strippedParams];
}

function hasPrivateCookie(request) {
  /*
   * Given a Request, determine if one of the 'private' cookies are present.
   */
  const allCookies = getCookies(request);

  // Check if any of the private cookies are present and have a non-empty value
  return PRIVATE_COOKIES.some(
    (cookieName) => cookieName in allCookies && allCookies[cookieName]
  );
}

function getCookies(request) {
  /*
   * Extract the cookies from a given request
   */
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce((cookieMap, cookieString) => {
    const [cookieKey, cookieValue] = cookieString.split("=");
    return { ...cookieMap, [cookieKey.trim()]: (cookieValue || "").trim() };
  }, {});
}

/**
 * Response Utilities
 */

function replaceStrippedQsOnRedirectResponse(response, strippedParams) {
  /**
   * Given an existing Response, and an object of stripped querystring keys,
   * determine if the response is a redirect.
   * If it is, add the stripped querystrings to the location header.
   * This allows us to persist tracking querystrings (like UTM) over redirects.
   */

  if ([301, 302].includes(response.status)) {
    const redirectResponse = new Response(response.body, response);
    const locationHeaderValue = redirectResponse.headers.get("location");
    let locationUrl;

    if (!locationHeaderValue) {
      return redirectResponse;
    }

    const isAbsolute = isUrlAbsolute(locationHeaderValue);

    if (!isAbsolute) {
      // If the Location URL isn't absolute, we need to provide a Host so we can use
      // a URL object.
      locationUrl = new URL(locationHeaderValue, "http://www.example.com");
    } else {
      locationUrl = new URL(locationHeaderValue);
    }

    Object.entries(strippedParams).forEach(([key, value]) =>
      locationUrl.searchParams.append(key, value)
    );

    let newLocation;

    if (isAbsolute) {
      newLocation = locationUrl.toString();
    } else {
      newLocation = `${locationUrl.pathname}${locationUrl.search}`;
    }

    redirectResponse.headers.set("location", newLocation);
    return redirectResponse;
  }

  return response;
}

/**
 * URL Utilities
 */
function isUrlAbsolute(url) {
  return url.indexOf("://") > 0 || url.indexOf("//") === 0;
}
