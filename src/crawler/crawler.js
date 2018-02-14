/**
 * @description The crawler is responsible for finding urls in in the requested documents.
 * 
 * The generator will load the Crawler module in tabs. The crawler module will then look for urls in the particular tab and send its findings to background in a message. After that the background generator will close the tab.
 * @namespace
 */
(function crawler() {

    var hasFired = false;

    /**
     * @function
     * @memberof crawler
     * @description Append some js code fragment in current document DOM
     * @param {String} jsCodeFragment - the code you want to execute in the document context
     */
    function appendCodeFragment(jsCodeFragment) {
        /** @ignore */
        function _appendToDom(domElem, elem, type, content, src, href, rel) {
            var e = document.createElement(elem);
            e.type = type;
            if (content) e.textContent = content;
            if (src) e.src = src;
            if (href) e.href = href;
            if (rel) e.rel = rel;
            document.getElementsByTagName(domElem)[0].append(e);
        }
        _appendToDom("body", "script", "text/javascript", jsCodeFragment);
    }

    /**
     * @function
     * @memberof crawler
     * @description Look for "robots" meta tag in the page header and if found return its contents
     */
    function getRobotsMeta() {
        var metas = document.getElementsByTagName('meta');

        for (var i = 0; i < metas.length; i++) {
            if ((metas[i].getAttribute("name") || '').toLowerCase() === "robots") {
                return (metas[i].getAttribute("content") || '').toLowerCase();
            }
        }
        return '';
    }

    /**
     * @function
     * @memberof crawler
     * @description Looks for links on the page, then send a message with findings to background page
     */
    function findLinks() {

        if (hasFired) return;
        hasFired = true;

        var absolutePath = function (href) {
            var link = document.createElement("a");
            link.href = href;
            return (link.protocol + "//" + link.host + link.pathname + link.search + link.hash);
        };

        var result = {};
        var links = document.querySelectorAll("a[href]");
        for (var n = 0; n < links.length; n++) {
            var href = links[n].getAttribute("href");
            if (href.indexOf("http") < 0) href = absolutePath(href);
            result[href] = 1;
        }

        var uniqueUrls = Object.keys(result);
        chrome.runtime.sendMessage({ urls: uniqueUrls });
    }

    /* ignore */
    (function init() {

        // try prevent window.close() because it will terminate everything
        // Then again if you do this on your website, you should get dinged
        appendCodeFragment("window.onbeforeunload = null");

        // get robots meta
        var robots = getRobotsMeta();

        // remove this url from sitemap if noindex is set
        if (robots.indexOf("noindex") > -1)
            chrome.runtime.sendMessage({ noindex: window.location.href });

        // don't follow links on this page if no follow is set
        if (robots.indexOf("nofollow") > -1)
            return chrome.runtime.sendMessage({ urls: [] });

        // wait for onload
        window.onload = findLinks;

        // but ensure the function will ultimately run
        setTimeout(findLinks, 500);

    }());


}());