import CenteredPopup from './centeredPopup.js';
import Generator from './generator.js';

let generator = null;

/**
 * @namespace
 */
export default class backgroundApi {

    constructor() {
        window.chrome.runtime.onMessage.addListener(backgroundApi.backgroundApi);
        window.chrome.browserAction.onClicked.addListener(backgroundApi.newSession);
    }

    /**
    * @description use this api to pass messages within the extension.
    * @see {@link https://developer.chrome.com/apps/runtime#event-onMessage|onMessage event}.
    * @param request - message parameters
    * @param request.start - starts generator
    * @param request.terminate - stops generator
    * @param request.status - gets current processing status
    * @param request.urls - receive list of urls from crawler
    * @param request.noindex - tells generator not to index some url, see
    * @param {Object }sender -
    * @see {@link https://developer.chrome.com/extensions/runtime#type-MessageSender|MessageSender}
    * @param {function} sendResponse - when sender expects a response, this value should be the callback function
    */
    static backgroundApi(request, sender, sendResponse) {
        if (request.start) {
            return backgroundApi.launchGenerator(request.start, sender);
        } else if (request.terminate) {
            if (generator) generator.terminate();
        } else if (request.noindex) {
            if (generator) generator.noindex(request.noindex);
        } else if (request.urls) {
            if (generator) generator.urlMessage(request.urls, sender);
        } else if (request.status) {
            return sendResponse((generator || {}).status());
        }
        return false;
    }

    /**
     * @description When user clicks extension icon, launch the session configuration page.
     * Also read the url of the active tab and provide that as the default url to crawl on the setup page.
     * @param {Object} tab - current active tab,
     * @see {@link https://developer.chrome.com/extensions/browserAction#event-onClicked|onClicked}
     */
    static newSession(tab) {
        let appPath = tab.url,
            setupPage = window.chrome.extension.getURL('setup.html');

        if (generator) {
            return;
        }

        if (tab.url.indexOf('/') > 0) {
            let parts = tab.url.split('/'),
                last = parts[parts.length - 1];

            if (!last.length || last.indexOf('.') > 0 ||
                last.indexOf('#') > 0 || last.indexOf('?') > 0) {
                parts.pop();
            }
            appPath = parts.join('/');
        }

        CenteredPopup.open(600, 600, setupPage + '?u=' + appPath, 'popup');
    }

    /**
     * @description When craawl session ends, clear the variable
     */
    static onCrawlComplete() {
        generator = null;
    }

    /**
     * @description This function gets called when user is ready to start new crawling session.
     * At this point in time the extension will make sure the extension has been granted all necessary
     * permissions, then start the generator.
     * @param {Object} config - configration details @see {@link sitemapGenerator}
     * @param {Object} sender - details on which window/tab send the
     * message, @see {@link https://developer.chrome.com/extensions/runtime#type-MessageSender|MessageSender}
     */
    static launchGenerator(config, sender) {
        if (generator) {
            return;
        }

        window.chrome.tabs.remove(sender.tab.id, function () {
            window.chrome.permissions.request({
                permissions: ['tabs'],
                origins: [config.requestDomain]
            }, function (granted) {
                if (granted) {
                    config.callback = backgroundApi.onCrawlComplete;
                    generator = new Generator(config);
                    generator.start();
                } else {
                    alert(window.chrome.i18n.getMessage('permissionNotGranted'));
                }
            });
        });
    }

}
