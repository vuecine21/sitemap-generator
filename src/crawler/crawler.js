/**
 * @description this module gets loaded in a tab and it looks for links on the page
 * @namespace
 */
(function crawler() {

    hasFired = false;

    /**
     * @function
     * @description Append fragment of js code into document head
     * @param {String} jsCodeFragment - the code you want to execute in the document context
     */
    function appendCodeFragment(jsCodeFragment) {
        _appendToDom("body", "script", "text/javascript", jsCodeFragment);
    }

    /**
     * @ignore
     * @description This method appends script or link to document head
     */
    function _appendToDom(domElem, elem, type, content, src, href, rel) {
        var e = document.createElement(elem);
        e.type = type;
        if (content) e.textContent = content;
        if (src) e.src = src;
        if (href) e.href = href;
        if (rel) e.rel = rel;
        document.getElementsByTagName(domElem)[0].append(e);
    }

    function findLinks() {

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
        chrome.runtime.sendMessage({urls: uniqueUrls});
    }

    function crawlPage() {
        if (hasFired) return;
        hasFired = true;
        findLinks();
    }

// try prevent window close
    appendCodeFragment("window.onbeforeunload = null");

    function getRobotsMeta() {
        var metas = document.getElementsByTagName('meta');

        for (var i = 0; i < metas.length; i++) {
            if ((metas[i].getAttribute("name") || '').toLowerCase() === "robots") {
                return (metas[i].getAttribute("content") || '').toLowerCase();
            }
        }
        return '';
    }

    var robots = getRobotsMeta();

// remove this url from sitemap
    if (robots.indexOf("noindex") > -1)
        chrome.runtime.sendMessage({noindex: window.location.href});

// don't follow links on this page
    if (robots.indexOf("nofollow") > -1)
        chrome.runtime.sendMessage({urls: []});

    else {
        // whichever occurs first will initiate action;
        window.onload = crawlPage;
        setTimeout(findLinks, 500);
    }


}());