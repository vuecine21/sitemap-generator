import CenteredPopup from './centeredPopup.js';
import GeneratorUtils from './generatorUtils.js';

let url,
    requestDomain,
    onCompleteCallback,
    contenttypePatterns,
    excludeExtension,
    successCodes,
    maxTabCount,
    terminating,
    targetRenderer,
    progressInterval,
    lists;

/**
 * @namespace
 * @description This module crawls some website and generates a sitemap
 * for it. The process works as follows:
 *
 * 1. on start the generator will create a rendering window and
 * open a tab for the start url; then wait for http headers response.
 * 2. If received headers indicate success, generator will load a
 * crawling script in the tab that will scan the page looking for a-tag urls.
 * 3. The content script will send a message back to the generator with a
 * list of urls found on the page.
 * the generator will add all new urls to the queue and close the tab
 * 4. After the initial url has been processed new tabs will open on a
 * set interval to account for possible
 * errors and non-response until all urls in the processing queue have been checked
 * 5. After everything has been cheked the generator will close the window and provide
 * the results to the end user
 *
 * @param {Object} config - configuration options
 * @param {string} config.url - the website/app path we want to crawl
 * -- all sitemap entries will be such that they include this base url
 * @param {String} config.requestDomain - Chrome url match pattern for above url
 * @see {@link https://developer.chrome.com/apps/match_patterns|Match Patterns}
 * @param {Array<string>} config.contenttypePatterns - http response content
 * types we want to include in the sitemap
 * @param {Array<string>} config.excludeExtension - file extensions which should
 * be automatically excluded, example: `['.png','.zip']`
 * @param {Array<number>} config.successCodes - http response status codes which
 * should be regarded as successful
 * @param {number} config.maxTabCount - max number of tabs allowed to be open any
 * given time
 * @param {function} config.callback - *(optional)* function to call when sitemap
 * generation has completed
 */
export default class Generator {

    constructor(config) {
        url = config.url;
        requestDomain = config.requestDomain;
        onCompleteCallback = config.callback;
        contenttypePatterns = config.contenttypePatterns || [];
        excludeExtension = config.excludeExtension || [];
        successCodes = config.successCodes || [];
        maxTabCount = Math.max(1, config.maxTabCount);
        terminating = false;
        progressInterval = null;
        lists = {
            processQueue: [],
            completedUrls: [],
            errorHeaders: [],
            successUrls: []
        };
    }

    /**
     * @description Listen to messages from the browser tabs
     * @see {@link https://developer.chrome.com/apps/runtime#event-onMessage|onMessage event}.
     * @param request - message parameters
     * @param request.terminate - stops generator
     * @param request.status - gets current processing status
     * @param request.urls - receive list of urls from crawler
     * @param request.noindex - tells generator not to index some url, see
     * @param {Object} sender -  message sender
     * @param {function?} sendResponse - callback function
     */
    generatorApi(request, sender, sendResponse) {
        if (request.terminate) {
            return this.onComplete();
        }
        if (request.noindex) {
            return this.noindex(request.noindex);
        }
        if (request.urls) {
            return this.urlMessage(request.urls, sender);
        }
        if (request.status) {
            return sendResponse(this.status());
        }
        return false;
    }

    /**
     * @description Initiates crawling of some website
     */
    start() {
        const launchPage = window.chrome.extension.getURL('process.html');

        CenteredPopup.open(800, 800, launchPage, 'normal', true)
            .then((window) => {
                targetRenderer = window.id;
                // 1. add the first url to processing queue
                GeneratorUtils.listAdd(url, lists.processQueue);
                // 2. register webRequest listener where we listen to successful http request events;
                this.listeners(true);
                // 3. navigate to first url
                this.navigateToNext();
                // 4. start interval that progressively works through the queue
                progressInterval = setInterval(this.navigateToNext, 500);
            });
    }

    /**
     * @description Get stats about ongoing processing status
     */
    status() {
        return {
            url: url,
            queue: lists.processQueue.length,
            completed: lists.completedUrls.length,
            success: lists.successUrls.length,
            error: lists.errorHeaders.length
        };
    }

    /**
     * @description Exclude discovered url from sitemap
     * @param {String} url - the url that should not be included in the sitemap
     */
    noindex(url) {
        url = encodeURI(url);
        GeneratorUtils.listAdd(url, lists.completedUrls);

        let successIndex = lists.successUrls.indexOf(url);

        if (successIndex >= 0) {
            lists.successUrls.splice(successIndex);
        }
    }

    /**
     * @description When url message is received, process urls,
     * then close tab that sent the message
     */
    urlMessage(urls, sender) {

        GeneratorUtils.processDiscoveredUrls(urls, lists);
        return !sender || !sender.tab ||
            window.chrome.tabs.remove(sender.tab.id);
    }

    // /////////////////////

    /**
     * @ignore
     * @description execute everytime when processing is done,
     * independed of why processing ended
     */
    onComplete() {

        if (terminating) {
            return;
        }

        terminating = true;
        clearInterval(progressInterval);
        let removeListeners = () => this.listeners(false);

        (function closeRenderer() {
            window.chrome.tabs.query({
                windowId: targetRenderer,
                url: requestDomain
            }, function (result) {
                if (result.length > 0) {
                    for (let i = 0; i < result.length; i++) {
                        window.chrome.tabs.remove(result[i].id);
                    }
                    setTimeout(closeRenderer, 250);
                    return;
                }
                setTimeout(() => {
                    removeListeners();
                    if (onCompleteCallback) {
                        onCompleteCallback();
                    }
                    window.chrome.windows.remove(targetRenderer,
                        () => GeneratorUtils.makeSitemap(lists.successUrls));
                }, 1000);
            });
        }());
    }

    /**
     * @ignore
     * @description take first queued url and create new tab for that url
     */
    navigateToNext() {

        if (terminating) {
            return false;
        }
        let that = this;

        return window.chrome.tabs.query({
            windowId: targetRenderer,
            url: requestDomain
        }, function (tabs) {

            let openTabsCount = (tabs || []).length;
            // console.log(openTabsCount, lists.processQueue.length);

            if (openTabsCount === 0 &&
                lists.processQueue.length === 0 &&
                lists.completedUrls.length >= 1) {
                return that.onComplete();
            }

            if (openTabsCount > maxTabCount ||
                lists.processQueue.length === 0) {
                return false;
            }

            let nextUrl = lists.processQueue.shift();

            // double check that we are not trying to open previously checked urls
            if (lists.completedUrls.indexOf(nextUrl) >= 0) {
                return that.navigateToNext();
            }

            GeneratorUtils.listAdd(nextUrl, lists.completedUrls);
            return window.chrome.tabs.create({
                url: nextUrl,
                windowId: targetRenderer,
                active: false
            }, () => {
                return (!window.chrome.runtime.lastError) ||
                    that.terminate();
            });
        });
    }

    /**
     * @ignore
     * @description when urls are discovered through some means, this function determines
     * how they should be handled
     * @param {Array<String>} urls - the urls to process
     */
    processDiscoveredUrls(urls) {

        (urls || []).map((u) => {

            // make sure all urls are encoded
            u = encodeURI(u);

            // if there is successful entry for hashbang path
            // automatically record save result for the hashbang path
            if (u.indexOf('#!') > 0) {
                let page = u.substr(0, u.indexOf('#!'));

                if (lists.successUrls.indexOf(page) > -1) {
                    GeneratorUtils.listAdd(u, lists.completedUrls);
                    GeneratorUtils.listAdd(u, lists.successUrls);
                }
                if (lists.errorHeaders.indexOf(page) > -1) {
                    GeneratorUtils.listAdd(u, lists.completedUrls);
                    GeneratorUtils.listAdd(u, lists.errorHeaders);
                }
            } else if (u.indexOf('#') > 0) {
                u = u.substr(0, u.indexOf('#'));
            }
            return u;

        }).filter(function (u) {

            // filter for everything that is clearly not html or text
            let badFileExtension = false,
                test = u.replace(url, '');

            if (test.indexOf('/') > -1) {
                let parts = test.split('/'),
                    last = parts[parts.length - 1];

                if (last.length) {
                    badFileExtension = excludeExtension.filter(function (f) {
                        return (last.indexOf(f) > 0);
                    }).length > 0;
                }
            }

            // filter down to new urls in target domain
            return u.indexOf(url) === 0 &&
                (lists.completedUrls.indexOf(u) < 0) &&
                (lists.processQueue.indexOf(u) < 0) &&
                !badFileExtension;

        }).map(function (u) {
            // if url makes it this far add it to queue
            GeneratorUtils.listAdd(u, lists.processQueue);
        });
    }

    /**
     * @ignore
     * @description Add or remove runtime event handlers
     * @param {boolean} add - true to add, false to remove
     */
    listeners(add) {
        GeneratorUtils.listeners((add ? 'add' : 'remove') + 'Listener',
            requestDomain, {
                onMessage: this.generatorApi,
                onHeadersReceivedHandler: this.onHeadersReceivedHandler,
                onBeforeRedirect: this.onBeforeRedirect,
                onTabLoadListener: this.onTabLoadListener,
                onTabErrorHandler: this.onTabErrorHandler
            });
    }

    /**
     * @ignore
     * @description listen to headers to determine type and cancel
     * and close tab immediately if the detected content type is not
     * on the list of target types
     * @param {Object} details - provided by Chrome
     * @see {@link https://developer.chrome.com/extensions/webRequest#event-onHeadersReceived | onHeadersReceived}
     */
    onHeadersReceivedHandler(details) {
        if (!details.responseHeaders) {
            return details;
        }

        let headers = details.responseHeaders,
            tabId = details.tabId,
            validType = false;

        for (let i = 0; i < headers.length; ++i) {
            if (headers[i].name.toLowerCase() === 'content-type') {
                validType = (contenttypePatterns
                    .indexOf(headers[i].value.split(';')[0]
                        .trim().toLowerCase()) > -1);
                break;
            }
        }

        if (!validType || terminating) {
            window.chrome.tabs.remove(tabId);
            return { cancel: true };
        }
        return details;
    }

    /**
     * @ignore
     * @description Listen to incoming webrequest headers
     * @param {Object} details - provided by chrome
     * @see {@link https://developer.chrome.com/extensions/webRequest#event-onCompleted | OnComplete}
     */
    onTabLoadListener(details) {

        if (!details.responseHeaders) {
            return;
        }

        let headers = details.responseHeaders;

        for (let i = 0; i < headers.length; ++i) {
            if (headers[i].name.toLowerCase() === 'status') {
                if (successCodes.indexOf(parseInt(headers[i].value, 0)) < 0) {
                    GeneratorUtils.listAdd(details.url, lists.errorHeaders);
                    this.onTabErrorHandler(details);
                    return;
                }
                break;
            }
        }
        GeneratorUtils.listAdd(details.url, lists.successUrls);
        GeneratorUtils.loadContentScript(details.tabId, () => this.terminate);
    }

    /**
     * @ignore
     * @description whenever request causes redirect, put the
     * new url in queue and terminate current request
     */
    onBeforeRedirect(details) {
        this.processDiscoveredUrls([details.redirectUrl]);
        window.chrome.tabs.remove(details.tabId);
        return { cancel: true };
    }

    /**
     * @ignore
     * @description if tab errors, close it and load next one
     */
    onTabErrorHandler(details) {
        window.chrome.tabs.remove(details.tabId, () => this.navigateToNext);
    }

}
