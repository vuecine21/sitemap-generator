---
title: Development
permalink: /development 
---

{% include_relative nav.md %}

## Development

#### Repo organization

Directory/File | Purpose
--- | ---
`assets > img > icons` | extension icons
`assets > img > promo` | promo images
`assets > locales` | i18n for different supported languages
`src` | source code
`test` | unit tests
`manifest.json` | extension manifest

#### Requirements

To build and run this program locally you will need the following:

-   Node.js
-   [yarn](https://yarnpkg.com/en/) (_optional_), if you prefer this over npm
-   Web IDE of your choice
-   Chrome browser

#### Build Instructions

1) Clone the repo 
2) If you have yarn installed, install dependecies by running
    ```
    yarn
    ``` 
    or, to install dependecies using npm, run `npm install`

3) Build the extension 
    ```
    gulp
    ```   
#### List of CLI options

command | details
------- | -------
`gulp` | run build and continue to watch file changes
`gulp build` |  run dev build then exit
`gulp build --prod` | run prod build then exit
`gulp build --bump=step` | run build and increment version, where step is `major`, `minor` or `patch`   
`yarn test` | run unit tests once then exit
`yarn test:watch` |  run unit tests and continue to watch changes
`gulp release` | generate release package (.zip)

#### Debug Instructions

Using Chrome browser:

1) Go to `chrome://extensions`. Make sure you have developer mode enabled.
2) Click `Load unpacked extension...`
3) Choose the `dist/` directory.


{% include_relative nav.md %}

{% include_relative ga.html %}
