
<img src="assets/img/promo/screenshot_1.png" alt="Sitemap Generator" style="display:table; margin:10px auto;" />
 
![alt text](https://img.shields.io/badge/latest-v0.0.3-8066d6.svg "version")
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://travis-ci.org/sneeakco/sitemap-generator.svg?branch=master)](https://travis-ci.org/sneeakco/sitemap-generator)

**Generate sitemaps using Chrome browser. Especially intended for generating sitemaps for dynamic single-page applications (SPAs).**

This extension lets you generate a sitemap for any public website right in the browser. While generating the sitemap, the extension renders the website pages and waits for javascript to load, making it great for crawling dynamic single-page applications.

## Installation

The latest version is available for installation at Chrome Web Store.

**[Install here](https://chrome.google.com/webstore/detail/hcnjemngcihnhncobgdgkkfkhmleapah "Sitemap Generator")**

## Documentation

**[View source documentation](https://sneeakco.github.io/sitemap-generator/documentation "Documentation")**

## Development

**[Getting started](https://sneeakco.github.io/sitemap-generator/development "Development")**

## Idea 💡

I make a lot of web apps using react and angular. I know there are dev tools that allow generating sitemaps but these require more or less custom setup. I also tried online services that offer to create sitemaps, but found that these were not actually rendering the client side code. My last attempt was trying a service that said it would run in the browser but required some custom code be placed on the website to circumvent cors. At this point I gave up and made my own solution. I decided to make a chrome extension because it addresses many of the issues that occur with the above solutions: 

<div style="float:left; padding: 20px 20px 20px 0;">
<table><tr><td>✔️ Allows rendering javascript</td></tr>
<tr><td>✔️ Avoids most server-side bottlenecks</td></tr>
<tr><td>✔️ Can override CORS policies</td></tr>
<tr><td>✔️ No application specific setup</td></tr>
<tr><td>✔️ Accommodates website changes</td></tr>
<tr><td>✔️ Suitable for non-technical users</td></tr></table></div>

This extension works by taking some start URL, crawling that page for more links, and then recursively crawling those pages for more links. Once all found links have been checked, the extension generates a sitemap file. Of course this approach assumes website is properly using anchor tags to connect its contents. The extension also checks HTTP headers and excludes pages that return failing response codes.

This implementation is not practical if website contains tens of thousands of pages. It can however, crawl a few thousand entries in a reasonable amount of time.
