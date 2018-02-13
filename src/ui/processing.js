/**
 * @description This module is used to configure runtime params for sitemap generation
 * @namespace
 */
(function processing() {

    /**
     * @private
     * @memberof processing
     * @description Request information about current processing status from the background
     * then update the ui to reflect current status.
     */
    function checkStatus() {
        chrome.runtime.sendMessage({ status: true }, function (response) {
            for (var k in response) {
                var elem = document.getElementById(k);
                if (elem) elem.innerText = response[k];
            }
        });
    }

    /**
     * @private
     * @memberof processing
     * @description When user clicks button to terminate send message to background page
     * to terminate all processing. Closing the rendering window will ultimately have the same effect.
     */
    function onCloseButtonClick(e) {
        chrome.runtime.sendMessage({ terminate: true });
        e.target.innerText = "Terminating....";
    }

    /**
     * @ignore 
     */
    (function init() {

        // initially check status every 1 second
        for (var i = 0; i < 10; i++) {
            setTimeout(checkStatus, i * 1000);
        }

        // after first 10s increase the interval
        setTimeout(function () {
            setInterval(checkStatus, 10000);
        }, 10 * 1000);

        // bind event handlers
        var closeButton = document.getElementById("close");
        closeButton.onclick = onCloseButtonClick;

    }());

}());