/**
 * @description This module is used to configure runtime params for sitemap generation
 * @namespace
 */
(function setup() {

    var siteUrlInput = document.getElementsByName("url")[0];
    var siteUrlInputError = document.getElementById("url-error");

    /**
     * @private
     * @memberof setup
     * @description Get some value from querystring
     * @param {*} name key 
     * @param {*} url url to parse (defaults to current)
     */
    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    /**    
     * @event
     * @private
     * @memberof setup
     * @description Handle start button click -> this will check user inputs 
     * and if successful, send message to background page to initiate crawling.
     * @param {Object} e - click event
     */
    function onStartButtonClick(e) {

        /** @ignore */
        function validateUrlInput(url) {
            if (!url || url.trim().length < 1)
                return "Url value is required";

            if (url.indexOf("http://") !== 0 && url.indexOf("https://") !== 0)
                return "Url must start with http:// or https://";

        }

        siteUrlInputError.innerText = "";
        siteUrlInput.classList.remove("is-invalid");
        var url = (siteUrlInput.value || '').trim();
        var invalidReason = validateUrlInput(url);
        if (invalidReason) {
            siteUrlInputError.innerText = invalidReason;
            siteUrlInput.className += " is-invalid";
            return;
        }

        var requestDomain = (url + "/*").replace("//*", "/*"),
            config = {
                url: url,
                requestDomain: requestDomain,
                contenttype_patterns: ["text/html", "text/plain"],
                exclude_extension: [".png", ".json", ".jpg", ".jpeg", ".js", ".css",
                    ".zip", ".mp3", ".mp4", ".ogg", ".avi", ".wav", ".webm", ".gif", ".ico"],
                success_codes: [200, 201, 202, 203, 304],
                maxTabCount: 25
            };

        chrome.runtime.sendMessage({ start: config });
        e.target.innerText = "Starting....";
        startButton.onclick = false;
    }

    /**
     * @ignore 
     */
    (function init() {

        // the initial url will be active tab url if available
        var siteUrl = getParameterByName("u");
        siteUrlInput.value = (siteUrl.indexOf("http") === 0) ? siteUrl : "";

        // bind event handlers
        var startButton = document.getElementById("start");
        startButton.onclick = onStartButtonClick;

    }());

}());