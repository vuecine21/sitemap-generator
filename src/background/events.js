/**
 *  @namespace  backgroundEvents
 *  @description Listens to relevant events in the browser and responds accordingly
 */
(function RegisterEventListeners(sitemapGenerator, centeredWindow) {

    var generator = null;
    var introUrl = "https://sneeakco.github.io/sitemap-generator/intro";
    var setupPage = chrome.extension.getURL("setup.html");

    chrome.browserAction.onClicked.addListener(configureGenerator);
    chrome.runtime.onInstalled.addListener(onInstalledEvent);
    chrome.runtime.onMessage.addListener(onMessageHandler);

    //////////////////////////

    /**
     * @memberof backgroundEvents
     * @description Listen to generator termination request
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
    }

    /**
     * @memberof backgroundEvents
     * @description This handler runs when user first installs the extension.
     * It should launch a demo or some other way to explain how the extension works.
     * @param {*} details - chrome provided parameter; indicates if this is new install or update
     */
    function onInstalledEvent(details) {
        if (details.reason === "install") {
            chrome.tabs.create({url: introUrl});
        }
    }

    /**
     * @memberof backgroundEvents
     * @description launch the setup page where user can configure their
     * session options
     */
    function configureGenerator(tab) {
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
     * @description When some launch event occurs, this function will
     * - determine the url to crawl (i.e. optional parameter or active tab)
     * - make sure the extension has permission to access that domain
     * - kick off a crawling sessions
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
                },
                function (granted) {
                    if (!granted)
                        return alert("You did not authorize access to domain: " + config.url);
                    return sender.tab ?
                        chrome.tabs.remove(sender.tab.id, startSession) :
                        startSession();
                }
            );
        });
    }

}(sitemapGenerator, centeredWindow));