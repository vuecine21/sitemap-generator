/**
 * @description This module crawls some website and generates a sitemap for it. The process works as follows:
 *
 * 1. on start the generator will create a rendering window and
 * open a tab for the start url; then wait for http headers response.
 * 2. If received headers indicate success, generator will load a crawling script in the tab
 * that will scan the page looking for a-tag urls.
 * 3. The content script will send a message back to the generator with a list of urls found on the page.
 * the generator will add all new urls to the queue and close the tab
 * 4. After the initial url has been processed new tabs will open on a set interval to account for possible
 * errors and non-response until all urls in the processing queue have been checked
 * 5. After everything has been cheked the generator will close the window and provide
 * the results to the end user
 *
 * @namespace
 * @param {Object} config - configuration options
 * @param {string} config.url - the website/app path we want to crawl -- all sitemap entries will be such that they include this base url
 * @param {String} config.requestDomain - Chrome url match pattern for above url @see {@link https://developer.chrome.com/apps/match_patterns|Match Patterns} 
 * @param {Array<string>} config.contenttype_patterns - http response content types we want to include in the sitemap
 * @param {Array<string>} config.exclude_extension - file extensions which should be automatically excluded, example: `['.png','.zip']`
 * @param {Array<number>} config.success_codes - http response status codes which should be regarded as successful
 * @param {number} config.maxTabCount - max number of tabs allowed to be open any given time
 * @param {function} config.callback - *(optional)* function to call when sitemap generation has completed
 */
var sitemapGenerator = function (config) {

    var clientSideJs = "content.js",
        launchPage = chrome.extension.getURL("processing.html"),
        contenttype_patterns = config.contenttype_patterns || [],
        exclude_extension = config.exclude_extension || [],
        success_codes = config.success_codes || [],
        maxTabCount = Math.max(1, config.maxTabCount),
        terminating = false,
        targetRenderer = null,
        progressInterval = null,
        lists = {
            processQueue: [],
            completedUrls: [],
            errorHeaders: [],
            successUrls: []
        };

    //////////////////////////

    /**
     * @public
     * @memberof sitemapGenerator
     * @description Initiates crawling of some website
     */
    function start() {

        terminating = false;

        // 1. register webRequest listener where we listen tosuccessful navigation events; 
        addListeners();

        // 2. create the invisible element where we render each url 
        // --> could create frames queue to have multiple frames, to get this going faster?
        listAdd(config.url, lists.processQueue);

        // 3. Create rendering window then navigate to launch url
        return centeredWindow(800, 700, launchPage, "normal")
            .then(function (window) {
                targetRenderer = window.id;
                navigateToNext();
            });

    }

    /**
     * @public
     * @memberof sitemapGenerator
     * @description Terminates sitemap generator before it completes naturally
     */
    function terminate() {
        if (terminating) return;
        onComplete();
    }

    /**
     * @public
     * @memberof sitemapGenerator
     * @description Get stats about ongoing processing status
     */
    function status() {
        return {
            url: config.url,
            queue: lists.processQueue.length,
            completed: lists.completedUrls.length,
            success: lists.successUrls.length,
            error: lists.errorHeaders.length
        };
    }

    /**
     * @public
     * @memberof sitemapGenerator
     * @description Tell generator not to include specific url in the sitemap
     * @param {String} url - the url that should not be included in the sitemap
     */
    function noindex(url) {
        url = encodeURI(url);
        listAdd(url, lists.completedUrls);
        var successIndex = lists.successUrls.indexOf(url);
        if (successIndex > -1) lists.successUrls.splice(successIndex);
    }

    //////////////////////////

    /**
     * @private
     * @memberof sitemapGenerator
     * @description this function creates the sitemap and downloads it, then opens or activates downloads tab
     */
    function makeSitemap() {

        var windowCloseError = chrome.runtime.lastError; // ignore
        if (!lists.successUrls.length) return;

        function download(filename, text) {
            var element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' +
                encodeURIComponent(text));
            element.setAttribute('download', filename);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();

            var downloads_page = "chrome://downloads";
            chrome.tabs.query({ url: downloads_page + "/*" }, function (result) {
                if (result && result.length)
                    chrome.tabs.reload(result[0].id, null, function () {
                        chrome.tabs.update(result[0].id, { active: true });
                    });
                else chrome.tabs.create({ url: downloads_page, active: true });
            });

        }

        // for (var list in lists)
        //     console.log(list + "\r\n" + lists[list].join("\r\n"));

        var now = new Date();
        var lastmod = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();

        var sitemap = lists.successUrls.sort().map(function (u) {
            return "<url><loc>" + encodeURI(u) + "</loc></url>";
        });

        sitemap = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\r\n',
            sitemap.join("\r\n"), '</urlset>'
        ].join("");

        download((config.url.replace(/[\/:.]/g, '_')) +
            "_sitemap_" + lastmod + ".xml", sitemap);
    }

    /**
     * @private
     * @memberof sitemapGenerator
     * @description execute everytime when processing is done, independed of why processing ended
     */
    function onComplete() {
        if (terminating) return;

        terminating = true;
        clearInterval(progressInterval);

        (function closeRenderer() {
            chrome.tabs.query({ windowId: targetRenderer, url: config.requestDomain }, function (result) {
                if (result.length > 0) {
                    for (var i = 0; i < result.length; i++)
                        chrome.tabs.remove(result[i].id);
                    return setTimeout(closeRenderer, 250);
                } else {
                    setTimeout(function () {
                        removeListeners();
                        if (config.callback) config.callback();
                        chrome.windows.remove(targetRenderer, makeSitemap);
                    }, 1000);
                }
            });
        }());
    }

    /**
     * @private
     * @memberof sitemapGenerator
     * @description when urls are discovered through some means, this function determines
     * how they should be handled
     * @param {Array<String>} urls - the urls to process
     */
    function processDiscoveredUrls(urls) {
        (urls || []).map(function (u) {

            // make sure all urls are encoded
            u = encodeURI(u);

            // if there is successful entry for hashbang path
            // automatically record save result for the hashbang path
            if (u.indexOf("#!") > 0) {
                var page = u.substr(0, u.indexOf("#!"));
                if (lists.successUrls.indexOf(page) > -1) {
                    listAdd(u, lists.completedUrls);
                    listAdd(u, lists.successUrls);
                }
                if (lists.errorHeaders.indexOf(page) > -1) {
                    listAdd(u, lists.completedUrls);
                    listAdd(u, lists.errorHeaders);
                }
            }

            // else strip anything following hash
            else if (u.indexOf("#") > 0) {
                u = u.substr(0, u.indexOf("#"));
            }

            return u;

        }).filter(function (u) {

            // filter for everything that is clearly not html or text
            var badFileExtension = false;
            var test = u.replace(config.url, "");

            if (test.indexOf("/") > -1) {
                var parts = test.split("/");
                var last = parts[parts.length - 1];
                if (last.length) {
                    badFileExtension = exclude_extension.filter(function (f) {
                        return (last.indexOf(f) > 0);
                    }).length > 0;
                }
            }

            // filter down to new urls in target domain
            return u.indexOf(config.url) === 0 &&
                (lists.completedUrls.indexOf(u) < 0) &&
                (lists.processQueue.indexOf(u) < 0) &&
                !badFileExtension;

        }).map(function (u) {

            // if url makes it this far add it to queue
            listAdd(u, lists.processQueue);

        });
    }

    /**
     * @private
     * @memberof sitemapGenerator
     * @description listen to messages sent from content script back to the generator instance
     */
    function receiveUrlFromContent(request, sender) {

        processDiscoveredUrls(request.urls);

        chrome.tabs.remove(sender.tab.id, function () {
            var pass = (chrome.runtime.lastError);
        });

        if (lists.completedUrls.length === 1) {
            progressInterval = setInterval(navigateToNext, 500);
            navigateToNext();
        } else if (lists.processQueue.length < 1)
            return onComplete();
    }

    /** 
     * @private
     * @memberof sitemapGenerator 
     * @description listen to headers to determine type and cancel and
     * close tab immediately if the detected content type is not on the
     * list of target types
     */
    function onHeadersReceivedHandler(details) {
        if (!details.responseHeaders) return;
        var headers = details.responseHeaders,
            tabId = details.tabId,
            valid_type = false;

        for (var i = 0; i < headers.length; ++i) {
            if (headers[i].name.toLowerCase() === "content-type") {
                valid_type = (contenttype_patterns
                    .indexOf(headers[i].value.split(";")[0]
                        .trim().toLowerCase()) > -1);
                break;
            }
        }
        if (!valid_type || terminating) {
            chrome.tabs.remove(tabId);
            return { cancel: true };
        }
    }

    /** 
     * @private
     * @memberof sitemapGenerator 
     * @description whenever request causes redirect, handle the redirect url
     * and terminate current request
     */
    function onBeforeRedirect(details) {

        if (details.redirectUrl)
            processDiscoveredUrls([details.redirectUrl]);

        // if very first url is redirect
        if (lists.completedUrls.length === 1) {
            progressInterval = setInterval(navigateToNext, 500);
            navigateToNext();
        } else if (lists.processQueue.length < 1)
            return onComplete();

        console.log("terminating redirecting tab....", details.url);
        chrome.tabs.remove(details.tabId);
        return { cancel: true };
    }

    /**
     * @private
     * @memberof sitemapGenerator
     * @description Listen to incoming webrequest headers
     */
    function onTabLoadListener(details) {

        if (!details.responseHeaders) return;

        var headers = details.responseHeaders,
            tabId = details.tabId;

        for (var i = 0; i < headers.length; ++i) {
            if (headers[i].name.toLowerCase() === "status") {
                if (success_codes.indexOf(parseInt(headers[i].value, 0)) < 0) {
                    listAdd(details.url, lists.errorHeaders);
                    return onTabErrorHandler(details);
                }
                else break;
            }
        }

        listAdd(details.url, lists.successUrls);
        chrome.tabs.executeScript(tabId, {
            file: clientSideJs,
            runAt: 'document_end'
        }, function () {
            if (chrome.runtime.lastError)
                terminate("Terminating because rendering window was closed");
        });
    }

    /**
     * @private
     * @memberof sitemapGenerator
     * @description if tab errors, cloe it and load next one
     */
    function onTabErrorHandler(details) {
        chrome.tabs.remove(details.tabId, function () {
            var pass = chrome.runtime.lastError;
            navigateToNext();
        });
    }

    /**
     * @private
     * @memberof sitemapGenerator 
     * @description add listeners to track response headers and to receive messages
     * from the opened tabs
     */
    function addListeners() {
        chrome.webRequest.onHeadersReceived.addListener(onHeadersReceivedHandler,
            { urls: [config.requestDomain], types: ['main_frame'] }, ['blocking', 'responseHeaders']);
        chrome.webRequest.onBeforeRedirect.addListener(onBeforeRedirect,
            { urls: [config.requestDomain], types: ['main_frame'] }, ['responseHeaders']);
        chrome.webRequest.onCompleted.addListener(onTabLoadListener,
            { urls: [config.requestDomain], types: ['main_frame'] }, ['responseHeaders']);
        chrome.webRequest.onErrorOccurred.addListener(onTabErrorHandler,
            { urls: [config.requestDomain], types: ['main_frame'] });
        chrome.runtime.onMessage.addListener(receiveUrlFromContent);
    }

    /**
     * @private
     * @memberof sitemapGenerator 
     * @description when processing is done remove all event listeners
     */
    function removeListeners() {
        chrome.webRequest.onHeadersReceived.removeListener(onHeadersReceivedHandler,
            { urls: [config.requestDomain], types: ['main_frame'] }, ['blocking', 'responseHeaders']);
        chrome.webRequest.onBeforeRedirect.removeListener(onBeforeRedirect,
            { urls: [config.requestDomain], types: ['main_frame'] }, ['responseHeaders']);
        chrome.webRequest.onCompleted.removeListener(onTabLoadListener,
            { urls: [config.requestDomain], types: ['main_frame'] }, ['responseHeaders']);
        chrome.webRequest.onErrorOccurred.removeListener(onTabErrorHandler,
            { urls: [config.requestDomain], types: ['main_frame'] });
        chrome.runtime.onMessage.removeListener(receiveUrlFromContent);
    }

    /**
     * @private
     * @memberof sitemapGenerator 
     * @description move url to a specific processing queue
     */
    function listAdd(url, list) {
        if (list.indexOf(url) < 0) list.push(url);
    }

    /**
     * @private
     * @memberof sitemapGenerator 
     * @description take first queued url and create new tab for that url
     */
    function navigateToNext() {
        if (lists.processQueue.length < 1 || terminating)
            return false;

        var nextUrl = lists.processQueue.shift();

        // skip if some url has been added to queue multiple times
        if (lists.completedUrls.indexOf(nextUrl) > -1)
            return navigateToNext();

        chrome.tabs.query({ windowId: targetRenderer }, function (result) {

            // if max tabs already open, put the url back in the queue and exit
            if (result.length > maxTabCount)
                return listAdd(nextUrl, lists.processQueue);
            else
                listAdd(nextUrl, lists.completedUrls);

            chrome.tabs.create({
                url: nextUrl,
                windowId: targetRenderer,
                active: false
            }, function () {
                if (chrome.runtime.lastError)
                    terminate("Terminating because rendering window was closed");
            });
        });
    }

    //////////////////////////

    return {
        start: start,
        noindex: noindex,
        terminate: terminate,
        status: status
    };

};