
let hasFired = false;

/**
 * @namespace
 */
export default class Crawler {

    constructor() {

        // try prevent window.close() because it will terminate everything
        // Then again if you do this on your website, you should get dinged
        Crawler.appendCodeFragment('window.onbeforeunload = null');

        // get robots meta
        let robots = Crawler.getRobotsMeta();

        // remove this url from sitemap if noindex is set
        if (robots.indexOf('noindex') >= 0) {
            window.chrome.runtime.sendMessage({ noindex: window.location.href });
        }

        // don't follow links on this page if no follow is set
        if (robots.indexOf('nofollow') >= 0) {
            return window.chrome.runtime.sendMessage({ urls: [] });
        }

        // wait for onload
        window.onload = Crawler.findLinks;

        // but ensure the function will ultimately run
        setTimeout(Crawler.findLinks, 500);
    }

    /**
     * @description Append some js code fragment in current document DOM
     * @param {String} jsCodeFragment - the code you want to execute in the document context
     */
    static appendCodeFragment(jsCodeFragment) {
        (function _appendToDom(domElem, elem, type, content, src, href, rel) {
            let e = document.createElement(elem);

            e.type = type;
            if (content) e.textContent = content;
            if (src) e.src = src;
            if (href) e.href = href;
            if (rel) e.rel = rel;
            document.getElementsByTagName(domElem)[0].append(e);
        }('body', 'script', 'text/javascript', jsCodeFragment));
    }

    /**
     * @description Look for 'robots' meta tag in the page header and if found return its contents
     */
    static getRobotsMeta() {
        let metas = document.getElementsByTagName('meta');

        for (let i = 0; i < metas.length; i++) {
            if ((metas[i].getAttribute('name') || '').toLowerCase() === 'robots') {
                return (metas[i].getAttribute('content') || '').toLowerCase();
            }
        }
        return '';
    }

    /**
     * @description Looks for links on the page, then send a message with findings to background page
     */
    static findLinks() {

        if (hasFired) {
            return;
        }

        hasFired = true;

        let result = {}, links = document.querySelectorAll('a[href]');

        for (let n = 0; n < links.length; n++) {
            let href = links[n].getAttribute('href');

            if (href.indexOf('http') < 0) {
                href = (function absolutePath(href) {
                    let link = document.createElement('a');

                    link.href = href;
                    return (link.protocol + '//' + link.host + link.pathname + link.search + link.hash);
                }());
            }
            result[href] = 1;
        }

        let uniqueUrls = Object.keys(result);

        window.chrome.runtime.sendMessage({ urls: uniqueUrls });
    }
}

(() => new Crawler())();
