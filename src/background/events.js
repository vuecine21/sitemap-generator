/**
 *  @namespace  backgroundEvents
 *  @description Listens to relevant events in the browser and responds accordingly
 */
(function RegisterEventListeners(sitemapGenerator, centeredWindow) {

    var generator = null;
    var introUrl = "https://sneeakco.github.io/sitemap-generator/intro";
    var setupPage = chrome.extension.getURL("setup.html");

    chrome.browserAction.onClicked.addListener(newSession);
    chrome.runtime.onInstalled.addListener(onInstalledEvent);
    chrome.runtime.onMessage.addListener(onMessageHandler);

    //////////////////////////

    /**
     * @function
     * @memberof backgroundEvents
     * @description Listen to messages sent from ui pages to background. This is meant to
     * provide ways for end user to interact with the generator.
     * @param request - message parameters
     * @param request.start - starts generator
     * @param request.terminate - stops generator
     * @param request.status - gets current processing status
     * @param request.urlMessage - receive list of urls from crawler
     * @param request.noindex - tells generator not to index some url, see example below
     * @param sender - details on which window/tab send the message,
     * @see {@link https://developer.chrome.com/extensions/runtime#type-MessageSender|MessageSender}
     * @param sendResponse - when sender expects a response, this value should be the callback function, see example below.
     *
     * @example chrome.runtime.sendMessage({ start: config });
     *
     * @example chrome.runtime.sendMessage({ terminate: true });
     *
     * @example chrome.runtime.sendMessage({ noindex: "https://www.google.com" });
     *
     * @example chrome.runtime.sendMessage({ status: true }, function callback(response) {});
     *
     */
    function onMessageHandler(request, sender, sendResponse) {
        if (request.terminate) {
            if (generator) generator.terminate();
        }
        if (request.noindex) {
            if (generator) generator.noindex(request.noindex);
        }
        if (request.status) {
            return sendResponse((generator) ? generator.status() : {});
        }
        if (request.start) {
            return launchGenerator(request.start, sender);
        }
        if (request.urls) {
            if (generator) generator.urlMessage(request.urls, sender);
        }

    }

    /**
     * @memberof backgroundEvents
     * @description This handler runs when user first installs the extension.
     * This method launches a welcome page with instructions how to to use the extension.
     * @param {Object} details - chrome provides this parameter, @see {@link https://developer.chrome.com/apps/runtime#event-onInstalled|OnIstalled}
     */
    function onInstalledEvent(details) {
        if (details.reason === "install") {
            chrome.tabs.create({url: introUrl});
        }
    }

    /**
     * @memberof backgroundEvents
     * @description When user clicks extension icon, launch the session configuration page.
     * Also read the url of the active tab and provide that as the default url to crawl on the setup page.
     *
     * @param tab - current active tab, @see {@link https://developer.chrome.com/extensions/browserAction#event-onClicked|onClicked}
     */
    function newSession(tab) {
        if (generator) return;

        var appPath = tab.url;
        if (tab.url.indexOf("/") > 0) {
            var parts = tab.url.split("/");
            var last = parts[parts.length - 1];
            if (!last.length || last.indexOf(".") > 0 || last.indexOf("#") > 0 || last.indexOf("?") > 0)
                parts.pop();
            appPath = parts.join("/");
        }
        return centeredWindow(600, 600, setupPage + "?u=" + appPath, "popup");
    }

    /**
     * @memberof backgroundEvents
     * @description This function gets called when user is ready to start new crawling session.
     * At this point in time the extension will make sure the extension has been granted all necessary
     * permissions, then start the generator.
     * @param {Object} config - configration details @see {@link sitemapGenerator}
     * @param sender - details on which window/tab send the message, @see {@link https://developer.chrome.com/extensions/runtime#type-MessageSender|MessageSender}
     */
    function launchGenerator(config, sender) {
        if (generator) return;

        function startSession() {
            config.callback = function () {
                generator = null;
            };
            generator = new sitemapGenerator(config);
            generator.start();
        }

        // close the configuration tab
        chrome.tabs.remove(sender.tab.id, function () {

            // request access to target domain then start session if permission granted
            // else notify user
            chrome.permissions.request({
                    permissions: ['tabs'],
                    origins: [config.requestDomain]
                }, function (granted) {
                    return (granted) ? startSession() :
                        alert(chrome.i18n.getMessage("permissionNotGranted"));
                }
            );
        });
    }

}(sitemapGenerator, centeredWindow));