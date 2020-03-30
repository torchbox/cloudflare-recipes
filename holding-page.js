// Add a holding page, served from an external URL (e.g. S3)

addEventListener("fetch", event => {
    event.respondWith(fetchAndReplace(event.request))
})

async function fetchAndReplace(request) {
    let modifiedHeaders = new Headers()

    modifiedHeaders.set('Content-Type', 'text/html')
    modifiedHeaders.append('Pragma', 'no-cache')

    const holdingPage = await fetch(holdingPageUrl)
    const content = await holdingPage.text();

    // Return modified response.
    return new Response(content, {
        headers: modifiedHeaders
    })
}

// Update the URL to your holding page.
// Keep it simple, small and self-contained.
const holdingPageUrl = "https://example.com"
