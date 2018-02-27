import CenteredPopup from './centeredPopup.js';

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
        this.clientSideJs = 'content.js';
        this.url = config.url;
        this.requestDomain = config.requestDomain;
        this.onCompleteCallback = config.callback;
        this.contenttypePatterns = config.contenttypePatterns || [];
        this.excludeExtension = config.excludeExtension || [];
        this.successCodes = config.successCodes || [];
        this.maxTabCount = Math.max(1, config.maxTabCount);
        this.terminating = false;
        this.targetRenderer = null;
        this.progressInterval = null;
        this.lists = {
            processQueue: [],
            completedUrls: [],
            errorHeaders: [],
            successUrls: []
        };
    }

    /**
     * @description Initiates crawling of some website
     */
    start() {
        let launchPage = window.chrome.extension.getURL('processing.html');

        CenteredPopup.open(800, 800, launchPage, 'normal', true)
            .then((window) => {
                this.targetRenderer = window.id;
                // 1. register webRequest listener where we listen to successful http request events;
                this.addListeners();
                // 2. add the first url to processing queue
                this.listAdd(this.url, this.lists.processQueue);
                // 3. navigate to first url
                this.navigateToNext();
                // 4. start interval that progressively works through the queue
                this.progressInterval = setInterval(this.navigateToNext, 500);
            });
    }
    /**
     * @description Terminates sitemap generator before it completes naturally
     */
    terminate() {
        if (!this.terminating) {
            this.onComplete();
        }
    }
    /**
     * @description Get stats about ongoing processing status
     */
    status() {
        return {
            url: this.url,
            queue: this.lists.processQueue.length,
            completed: this.lists.completedUrls.length,
            success: this.lists.successUrls.length,
            error: this.lists.errorHeaders.length
        };
    }
    /**
     * @description Tell generator not to include specific url in the sitemap
     * @param {String} url - the url that should not be included in the sitemap
     */
    noindex(url) {
        url = encodeURI(url);
        this.listAdd(url, this.lists.completedUrls);

        let successIndex = this.lists.successUrls.indexOf(url);

        if (successIndex >= 0) {
            this.lists.successUrls.splice(successIndex);
        }
    }
    /**
     * @description Listen to messages sent from content script back to the generator instance
     */
    urlMessage(urls, sender) {

        this.processDiscoveredUrls(urls);

        if (sender && sender.tab) {
            window.chrome.tabs.remove(sender.tab.id);
        }
    }

    // ////////////////////////

    /**
     * @description Download file
     * @param {String} filename
     * @param {String} text
     */
    static download(filename, text) {
        let element = document.createElement('a'),
            downloadsPage = 'chrome://downloads';

        element.setAttribute('href',
            'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();

        window.chrome.tabs.query({ url: downloadsPage + '/*' },
            function (result) {
                if (result && result.length) {
                    window.chrome.tabs.reload(result[0].id, null, function () {
                        window.chrome.tabs.update(result[0].id, { active: true });
                    });
                } else {
                    window.chrome.tabs.create(
                        { url: downloadsPage, active: true });
                }
            });
    }

    /**
     * @description this function creates the sitemap and downloads it,
     * then opens or activates downloads tab
     */
    makeSitemap() {

        // let windowCloseError = window.chrome.runtime.lastError; // ignore

        if (!this.lists.successUrls.length) {
            return;
        }

        // for (var list in lists)
        //     console.log(list + '\r\n' + lists[list].join('\r\n'));

        let now = new Date(),
            lastmod = now.getFullYear() + '-' +
                (now.getMonth() + 1) + '-' + now.getDate();

        let entries = this.lists.successUrls.sort()
            .map(function (u) {
                return '<url><loc>' + encodeURI(u) + '</loc></url>';
            }),
            sitemap = [
                '<?xml version=\'1.0\' encoding=\'UTF-8\'?>',
                '<urlset xmlns=\'http://www.sitemaps.org/schemas/sitemap/0.9\'>\r\n',
                entries.join('\r\n'), '</urlset>'].join(''),
            filename = this.url.replace(/[\/:.]/g, '_');

        Generator.download(filename + '_sitemap_' + lastmod + '.xml', sitemap);
    }

    /**
     * @description execute everytime when processing is done,
     * independed of why processing ended
     */
    onComplete() {

        if (this.terminating) return;

        this.terminating = true;
        clearInterval(this.progressInterval);

        (function closeRenderer() {
            window.chrome.tabs.query({
                windowId: this.targetRenderer,
                url: this.requestDomain
            }, function (result) {
                if (result.length > 0) {
                    for (let i = 0; i < result.length; i++) {
                        window.chrome.tabs.remove(result[i].id);
                    }
                    setTimeout(closeRenderer, 250);
                    return;
                }
                setTimeout(function () {
                    this.removeListeners();
                    if (this.onCompleteCallback) {
                        this.onCompleteCallback();
                    }
                    window.chrome.windows.remove(
                        this.targetRenderer, this.makeSitemap);
                }, 1000);
            });
        }());
    }

    /**
     * @description move url to a specific processing queue
     */
    listAdd(url, list) {
        if (list.indexOf(url) < 0) list.push(url);
    };

    /**
     * @description add listeners to track request outcome
     *
     * - onHeadersReceived is used to detect correct content type and status code
     *   -> when these are incorrect we can terminate the request immediately
     *
     * - onBeforeRedirect is used to detect redirection headers
     *
     * - onCompleted when tab is ready for client side crawling
     *
     * - onErrorOccurred when there is a problem with tab and we can close
     */
    addListeners() {
        window.chrome.webRequest.onHeadersReceived.addListener(this.onHeadersReceivedHandler,
            { urls: [this.requestDomain], types: ['main_frame'] }, ['blocking', 'responseHeaders']);
        window.chrome.webRequest.onBeforeRedirect.addListener(this.onBeforeRedirect,
            { urls: [this.requestDomain], types: ['main_frame'] }, ['responseHeaders']);
        window.chrome.webRequest.onCompleted.addListener(this.onTabLoadListener,
            { urls: [this.requestDomain], types: ['main_frame'] }, ['responseHeaders']);
        window.chrome.webRequest.onErrorOccurred.addListener(this.onTabErrorHandler,
            { urls: [this.requestDomain], types: ['main_frame'] });
    }

    /**
     * @description when processing is done remove all event listeners
     */
    removeListeners() {
        window.chrome.webRequest.onHeadersReceived.removeListener(this.onHeadersReceivedHandler,
            { urls: [this.requestDomain], types: ['main_frame'] }, ['blocking', 'responseHeaders']);
        window.chrome.webRequest.onBeforeRedirect.removeListener(this.onBeforeRedirect,
            { urls: [this.requestDomain], types: ['main_frame'] }, ['responseHeaders']);
        window.chrome.webRequest.onCompleted.removeListener(this.onTabLoadListener,
            { urls: [this.requestDomain], types: ['main_frame'] }, ['responseHeaders']);
        window.chrome.webRequest.onErrorOccurred.removeListener(this.onTabErrorHandler,
            { urls: [this.requestDomain], types: ['main_frame'] });
    }

    /**
     * @description take first queued url and create new tab for that url
     */
    navigateToNext() {
        if (this.terminating) {
            return false;
        }

        return window.chrome.tabs.query({
            windowId: this.targetRenderer,
            url: this.requestDomain
        }, function (tabs) {

            let openTabsCount = (tabs || []).length;
            // console.log(openTabsCount, lists.processQueue.length);

            if (openTabsCount === 0 &&
                this.lists.processQueue.length === 0 &&
                this.lists.completedUrls.length >= 1) {
                return this.onComplete();
            }

            if (openTabsCount > this.maxTabCount ||
                this.lists.processQueue.length === 0) {
                return false;
            }

            let nextUrl = this.lists.processQueue.shift();

            // double check that we are not trying to open previously checked urls
            if (this.lists.completedUrls.indexOf(nextUrl) >= 0) {
                return this.navigateToNext();
            }

            this.listAdd(nextUrl, this.lists.completedUrls);

            return window.chrome.tabs.create({
                url: nextUrl,
                windowId: this.targetRenderer,
                active: false
            }, () => {
                if (window.chrome.runtime.lastError) {
                    this.terminate();
                }
            });
        });
    }

    /**
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
                validType = (this.contenttypePatterns
                    .indexOf(headers[i].value.split(';')[0]
                        .trim().toLowerCase()) > -1);
                break;
            }
        }

        if (!validType || this.terminating) {
            window.chrome.tabs.remove(tabId);
            return { cancel: true };
        }
        return details;
    }

    /**
     * @description whenever request causes redirect, put the
     * new url in queue and terminate current request
     */
    onBeforeRedirect(details) {
        this.processDiscoveredUrls([details.redirectUrl]);
        window.chrome.tabs.remove(details.tabId);
        return { cancel: true };
    }

    /**
     * @description Listen to incoming webrequest headers
     * @param {Object} details - provided by chrome
     * @see {@link https://developer.chrome.com/extensions/webRequest#event-onCompleted | OnComplete}
     */
    onTabLoadListener(details) {

        if (!details.responseHeaders) {
            return details;
        }

        let headers = details.responseHeaders,
            tabId = details.tabId;

        for (let i = 0; i < headers.length; ++i) {
            if (headers[i].name.toLowerCase() === 'status') {
                if (this.successCodes.indexOf(parseInt(headers[i].value, 0)) < 0) {
                    this.listAdd(details.url, this.lists.errorHeaders);
                    return this.onTabErrorHandler(details);
                }
                break;
            }
        }

        this.listAdd(details.url, this.lists.successUrls);
        return window.chrome.tabs.executeScript(tabId, {
            file: this.clientSideJs,
            runAt: 'document_end'
        }, () => {
            if (window.chrome.runtime.lastError) {
                this.terminate();
            }
        });
    }

    /**
     * @description if tab errors, close it and load next one
     */
    onTabErrorHandler(details) {
        window.chrome.tabs.remove(details.tabId, () => this.navigateToNext);
    }

    /**
     * @description when urls are discovered through some means, this function determines
     * how they should be handled
     * @param {Array<String>} urls - the urls to process
     */
    processDiscoveredUrls(urls) {
        let that = this;

        (urls || []).map((u) => {

            // make sure all urls are encoded
            u = encodeURI(u);

            // if there is successful entry for hashbang path
            // automatically record save result for the hashbang path
            if (u.indexOf('#!') > 0) {
                let page = u.substr(0, u.indexOf('#!'));

                if (that.lists.successUrls.indexOf(page) > -1) {
                    that.listAdd(u, that.lists.completedUrls);
                    that.listAdd(u, that.lists.successUrls);
                }
                if (that.lists.errorHeaders.indexOf(page) > -1) {
                    that.listAdd(u, that.lists.completedUrls);
                    that.listAdd(u, that.lists.errorHeaders);
                }
            } else if (u.indexOf('#') > 0) {
                u = u.substr(0, u.indexOf('#'));
            }
            return u;

        }).filter(function (u) {

            // filter for everything that is clearly not html or text
            let badFileExtension = false,
                test = u.replace(that.url, '');

            if (test.indexOf('/') > -1) {
                let parts = test.split('/'),
                    last = parts[parts.length - 1];

                if (last.length) {
                    badFileExtension = that.excludeExtension.filter(function (f) {
                        return (last.indexOf(f) > 0);
                    }).length > 0;
                }
            }

            // filter down to new urls in target domain
            return u.indexOf(that.url) === 0 &&
                (that.lists.completedUrls.indexOf(u) < 0) &&
                (that.lists.processQueue.indexOf(u) < 0) &&
                !badFileExtension;

        }).map(function (u) {
            // if url makes it this far add it to queue
            that.listAdd(u, that.lists.processQueue);
        });
    }
}
