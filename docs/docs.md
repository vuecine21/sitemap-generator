<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents

-   [Background](#background)
    -   [backgroundApi](#backgroundapi)
        -   [openSetupPage](#opensetuppage)
        -   [launchRequest](#launchrequest)
    -   [backgroundEvents](#backgroundevents)
        -   [onInstalledEvent](#oninstalledevent)
    -   [centeredPopup](#centeredpopup)
        -   [open](#open)
    -   [Generator](#generator)
        -   [generatorApi](#generatorapi)
        -   [start](#start)
        -   [status](#status)
        -   [noindex](#noindex)
        -   [urlMessage](#urlmessage)
    -   [GeneratorUtils](#generatorutils)
        -   [listAdd](#listadd)
        -   [download](#download)
        -   [makeSitemap](#makesitemap)
        -   [loadContentScript](#loadcontentscript)
-   [User Interface](#user-interface)
    -   [Setup](#setup)
    -   [Process](#process)
        -   [checkStatus](#checkstatus)
-   [Crawler](#crawler)
    -   [getRobotsMeta](#getrobotsmeta)
    -   [getBaseUrl](#getbaseurl)
    -   [findLinks](#findlinks)

## Background

The extension background context manages the sitemap generation process.


### backgroundApi

#### openSetupPage

-   **See: [onClicked](https://developer.chrome.com/extensions/browserAction#event-onClicked)**

When user clicks extension icon, launch the session configuration page.
Also read the url of the active tab and provide that as the default url to crawl on the setup page.

**Parameters**

-   `tab` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** current active tab,

#### launchRequest

-   **See: [onMessage event](https://developer.chrome.com/apps/runtime#event-onMessage).**
-   **See: [MessageSender](https://developer.chrome.com/extensions/runtime#type-MessageSender)**

Request to start new generator instance.
This function gets called when user is ready to start new crawling session.
At this point in time the extension will make sure the extension has been granted all necessary
permissions, then start the generator.

**Parameters**

-   `request`  
-   `sender` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** \-

### backgroundEvents

Listens and responds to interesting Chrome runtime events

#### onInstalledEvent

When user first installs extension,
launch Google image search page

**Parameters**

-   `details` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** @see [OnIstalled](https://developer.chrome.com/apps/runtime#event-onInstalled)

### centeredPopup

#### open

Create centered popup window in the middle of user's monitor viewport.
If user has multiple monitors this method launches window in the first/leftmost monitor.
This method requires `system.display` permission in `manifest.json`

**Parameters**

-   `width` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** width of the new window (px)
-   `height` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** height of the new window (px)
-   `url` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** url to open
-   `type` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** "popup" or "normal"
-   `focused` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** if window should be focused

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)** 

### Generator

-   **See: [Match Patterns](https://developer.chrome.com/apps/match_patterns)**

This module crawls some website and generates a sitemap
for it. The process works as follows:

1.  on start the generator will create a rendering window and
    open a tab for the start url; then wait for http headers response.
2.  If received headers indicate success, generator will load a
    crawling script in the tab that will scan the page looking for a-tag urls.
3.  The content script will send a message back to the generator with a
    list of urls found on the page.
    the generator will add all new urls to the queue and close the tab
4.  After the initial url has been processed new tabs will open on a
    set interval to account for possible
    errors and non-response until all urls in the processing queue have been checked
5.  After everything has been cheked the generator will close the window and provide
    the results to the end user

**Parameters**

-   `config` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** configuration options
    -   `config.url` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** the website/app path we want to crawl
        \-- all sitemap entries will be such that they include this base url
    -   `config.requestDomain` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Chrome url match pattern for above url
    -   `config.contenttypePatterns` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** http response content
        types we want to include in the sitemap
    -   `config.excludeExtension` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** file extensions which should
        be automatically excluded, example: `['.png','.zip']`
    -   `config.successCodes` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)>** http response status codes which
        should be regarded as successful
    -   `config.maxTabCount` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** max number of tabs allowed to be open any
        given time
    -   `config.callback` **[function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)** _(optional)_ function to call when sitemap
        generation has completed

#### generatorApi

-   **See: [onMessage event](https://developer.chrome.com/apps/runtime#event-onMessage).**

Listen to messages from the browser tabs

**Parameters**

-   `request`  message parameters
    -   `request.terminate`  stops generator
    -   `request.status`  gets current processing status
    -   `request.urls`  receive list of urls from crawler
    -   `request.noindex`  tells generator not to index some url, see
-   `sender` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**  message sender
-   `sendResponse` **[function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)?** callback function

#### start

Initiates crawling of some website

#### status

Get stats about ongoing processing status

#### noindex

Exclude discovered url from sitemap

**Parameters**

-   `url` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** the url that should not be included in the sitemap

#### urlMessage

When url message is received, process urls,
then close tab that sent the message

**Parameters**

-   `urls`  
-   `sender`  

### GeneratorUtils

#### listAdd

move url to a specific processing queue

**Parameters**

-   `url`  
-   `list`  

#### download

Download file

**Parameters**

-   `filename` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** output filename
-   `text` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** base64 file content

#### makeSitemap

this function creates the sitemap and downloads it,
then opens or activates downloads tab

**Parameters**

-   `url`  
-   `successUrls`  

#### loadContentScript

Load content script in some tab

**Parameters**

-   `tabId` **id** 
-   `errorCallback` **[function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)** 

## User Interface

The UI pages are extension pages allowing user to control the sitemap generation process and interaction with the sitemap generator.


### Setup

This module is used to configure runtime params for sitemap generation

### Process

This module is used to communicate with the generator while crawling is ongoing.

#### checkStatus

Request information about current processing status from the background

## Crawler

### getRobotsMeta

Look for 'robots' meta tag in the page header and if found return its contents

### getBaseUrl

request the app path that is being crawled
so we can narrow down the matches in the front end

**Parameters**

-   `callback`  

### findLinks

Looks for links on the page, then send a message with findings to background page
