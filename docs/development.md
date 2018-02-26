---
title: Development
permalink: /development 
---

{% include_relative nav.md %}

## Development

#### Repo organization

Directory/File | Purpose
--- | ---
`assets` | extension static resources
`assets > img > icons` | extension icons
`assets > img > promo` | promo images
`assets > locales` | string dictionaries for supported languages
`docs` | web content for gh-pages
`src` | source code
`src/manifest.json` |  [extension manifest](https://developer.chrome.com/extensions/manifest "extension manifest")
`test` | unit tests

#### Requirements

To build and run this program locally you will need the following:

-   Node.js
-   [yarn](https://yarnpkg.com/en/) (_optional_)
-   Web IDE of your choice
-   Chrome browser

### Build Instructions / Basic Usage

1) Clone the repo 
```
https://github.com/sneeakco/sitemap-generator.git
```
2) Install dependecies by running  `yarn` or `npm install`

3) Build the extension `yarn dev` or `npm run dev`
  
#### Full List of CLI options

command | details
------- | -------
`dev` | run dev build and continue watching changes
`test` | run unit tests then exit
`test:watch` | run unit tests and continue watching changes
`test:coverage` | run unit tests and get coverage stats 
`build` | run production build and tests
`build:patch` | build w/ patch version increment  
`build:minor` | build w/ minor version increment  
`build:major` | build w/ major version increment   

#### Debug Instructions

Using Chrome browser:

1) Go to `chrome://extensions`. Make sure you have developer mode enabled.

2) Click `Load unpacked extension...`

3) Choose the `dist/` directory.


{% include_relative nav.md %}

{% include_relative ga.html %}
