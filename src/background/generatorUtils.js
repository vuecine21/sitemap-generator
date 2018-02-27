const downloadsPage = 'chrome://downloads';

/**
 * @namespace
 */
export default class GeneratorUtils {

    /**
     * @description add or remove listeners to track request outcome
     *
     * - onHeadersReceived is used to detect correct content type and status code
     *   -> when these are incorrect we can terminate the request immediately
     *
     * - onBeforeRedirect is used to detect redirection headers
     *
     * - onCompleted when tab is ready for client side crawling
     *
     * - onErrorOccurred when there is a problem with tab and we can close
     * @param {String} action - `addListener` or `removeListener`
     * @param {Object} handlers - event handlers dictionary
     * @param {String} requestDomain - chrome url pattern for matching requests
      */
    static listeners(action, requestDomain, handlers) {
        window.chrome.runtime.onMessage[action](handlers.onMessage);

        window.chrome.webRequest.onHeadersReceived[action](handlers.onHeadersReceivedHandler,
            { urls: [requestDomain], types: ['main_frame'] }, ['blocking', 'responseHeaders']);

        window.chrome.webRequest.onBeforeRedirect[action](handlers.onBeforeRedirect,
            { urls: [requestDomain], types: ['main_frame'] }, ['responseHeaders']);

        window.chrome.webRequest.onCompleted[action](handlers.onTabLoadListener,
            { urls: [requestDomain], types: ['main_frame'] }, ['responseHeaders']);

        window.chrome.webRequest.onErrorOccurred[action](handlers.onTabErrorHandler,
            { urls: [requestDomain], types: ['main_frame'] });
    }

    /**
     * @description move url to a specific processing queue
     */
    static listAdd(url, list) {
        if (list.indexOf(url) < 0) list.push(url);
    };

    /**
     * @description Download file
     * @param {String} filename - output filename
     * @param {String} text - base64 file content
     */
    static download(filename, text) {
        let element = document.createElement('a');

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
    static makeSitemap(successUrls) {

        if (!successUrls || !successUrls.length) {
            return;
        }

        // for (var list in lists)
        //     console.log(list + '\r\n' + lists[list].join('\r\n'));

        let entries = successUrls.sort().map((u) => {
            return '<url><loc>{u}</loc></url>'
                .replace('{u}', encodeURI(u));
        });

        let sitemap = [
            '<?xml version=\'1.0\' encoding=\'UTF-8\'?>',
            '<urlset xmlns=\'http://www.sitemaps.org/schemas/sitemap/0.9\'>',
            '\r\n',
            entries.join('\r\n'),
            '</urlset>']
            .join('');

        let lastmod = Date.now(),
            fnameUrl = this.url.replace(/[\/:.]/g, '_'),
            filename = fnameUrl + '_sitemap_' + lastmod + '.xml';

        GeneratorUtils.download(filename, sitemap);
    }

    /**
     * @description Load content script in some tab
     * @param {id} tabId
     * @param {function} errorCallback
     */
    static loadContentScript(tabId, errorCallback) {
        return window.chrome.tabs.executeScript(tabId, {
            file: 'content.js',
            runAt: 'document_end'
        }, () => {
            return (!window.chrome.runtime.lastError ||
                errorCallback());
        });
    }

}
