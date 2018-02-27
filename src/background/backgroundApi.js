import CenteredPopup from './centeredPopup.js';
import Generator from './generator.js';

let generator = null;

/**
 * @namespace
 */
export default class backgroundApi {

    constructor() {
        window.chrome.runtime.onMessage.addListener(backgroundApi.launchRequest);
        window.chrome.browserAction.onClicked.addListener(backgroundApi.openSetupPage);
    }

    /**
     * @description When user clicks extension icon, launch the session configuration page.
     * Also read the url of the active tab and provide that as the default url to crawl on the setup page.
     * @param {Object} tab - current active tab,
     * @see {@link https://developer.chrome.com/extensions/browserAction#event-onClicked|onClicked}
     */
    static openSetupPage(tab) {
        if (generator) {
            return false;
        }

        let appPath = tab.url.indexOf('http') === 0 ? tab.url : '',
            setupPage = window.chrome.extension.getURL('setup.html');

        appPath = backgroundApi.removePageFromUrl(appPath);
        return CenteredPopup.open(600, 600, setupPage + '?u=' + appPath, 'popup');
    }

    /**
     * @ignore
     * @description if url ends with page e.g. "index.html" we want to remove
     * this and just keep the application path
     * @param {String} appPath - url
     */
    static removePageFromUrl(appPath) {
        if (appPath.indexOf('/') > 0) {
            let parts = appPath.split('/'),
                last = parts[parts.length - 1];

            if (!last.length || last.indexOf('.') > 0 ||
                last.indexOf('#') > 0 || last.indexOf('?') > 0) {
                parts.pop();
            }
            appPath = parts.join('/');
        }
        return appPath;
    }

    /**
     * @description Request to start new generator instance.
     * This function gets called when user is ready to start new crawling session.
     * At this point in time the extension will make sure the extension has been granted all necessary
     * permissions, then start the generator.
     * @see {@link https://developer.chrome.com/apps/runtime#event-onMessage|onMessage event}.
     * @param request.start - configuration options
     * @param {Object} sender -
     * @see {@link https://developer.chrome.com/extensions/runtime#type-MessageSender|MessageSender}
     */
    static launchRequest(request, sender) {
        if (generator || !request.start) {
            return false;
        }

        let config = request.start;

        window.chrome.tabs.remove(sender.tab.id, () => {
            window.chrome.permissions.request({
                permissions: ['tabs'],
                origins: [config.requestDomain]
            }, (granted) => backgroundApi.handleGrantResponse(granted, config));
        });

        return true;
    }

    /**
     * @ignore
     * @description when permission request resolves, take action based on the output
     * @param {boolean} granted
     */
    static handleGrantResponse(granted, config) {
        if (granted) {
            return backgroundApi.onStartGenerator(config);
        }
        window.alert(window.chrome.i18n.getMessage('permissionNotGranted'));
        return false;
    }

    /**
     * @ignore
     * @description When craawl session ends, clear the variable
     */
    static onCrawlComplete() {
        generator = null;
    }

    /**
     * @ignore
     * @description Start new generator instance
     * @param {Object} config - generator configuration
     */
    static onStartGenerator(config) {
        if (!generator) {
            config.callback = backgroundApi.onCrawlComplete;
            generator = new Generator(config);
            generator.start();
            return generator;
        }
        return false;
    }
}
