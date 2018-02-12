/**
 *  @namespace  backgroundEvents
 *  @description Listens to relevant events in the browser and responds accordingly
 */
(function RegisterEventListeners(sitemapGenerator) {

    var generator = null;
    var introUrl = "https://sneeakco.github.io/spa-sitemap/intro";

    chrome.browserAction.onClicked.addListener(launchGenerator);
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
     * @description When some launch event occurs, this function will
     * - determine the url to crawl (i.e. optional parameter or active tab)
     * - make sure the extension has permission to access that domain
     * - kick off a crawling sessions
     */
    function launchGenerator(tab) {

        if (generator) return;

        var appPath = tab.url;

        // if this is a page url we need to pop last element from url
        if (tab.url.indexOf("/") > 0) {
            var parts = tab.url.split("/");
            var last = parts[parts.length - 1];
            if (!last.length || last.indexOf(".") > 0 || last.indexOf("#") > 0 || last.indexOf("?") > 0)
                parts.pop();
            appPath = parts.join("/");
        }

        chrome.permissions.request({
            permissions: ['tabs'],
            origins: [(appPath + "/*")]
        }, function (granted) {
            if (granted) {
                generator = new sitemapGenerator({
                    url: appPath,
                    requestDomain: (appPath + "/*"),
                    contenttype_patterns: ["text/html", "text/plain"],
                    exclude_extension: [".png", ".json", ".jpg", ".jpeg", ".js", ".css",
                        ".zip", ".mp3", ".mp4", ".ogg", ".avi", ".wav", ".webm", ".gif", ".ico"],
                    success_codes: [200, 201, 202, 203, 304],
                    maxTabCount: 25,
                    callback: function () {
                        generator = null;
                    }
                });
                generator.start();
            } else {
                alert("You did not authorize access to domain: " + tab.url);
            }
        });
    }

}(sitemapGenerator));