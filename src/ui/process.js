/**
 * @namespace
 * @description This module is used to communicate with the generator while crawling is ongoing.
 */
export default class Process {

    constructor() {

        // initially check status every 1 second
        for (let i = 0; i < 10; i++) {
            setTimeout(Process.checkStatus, i * 1000);
        }

        // after first 10x increase the interval
        setTimeout(function () {
            setInterval(Process.checkStatus, 10000);
        }, 10 * 1000);

        // bind event handlers
        let closeButton = document.getElementById("close");

        closeButton.onclick = (e) => Process.onCloseButtonClick;
    }

    /** 
     * @description When user clicks button to terminate send message to background page
     * to terminate all processing. Closing the rendering window will ultimately have the same effect.
     * @param {Object} e - click event
     */
    static onCloseButtonClick(e) {
        window.chrome.runtime.sendMessage({ terminate: true });
        e.target.innerText = "Terminating....";
    }

    /**
     * @description Request information about current processing status from the background
     * then update the ui to reflect current status.
     */
    static checkStatus() {
        window.chrome.runtime.sendMessage({ status: true }, function (response) {
            for (let k in response) {
                let elem = document.getElementById(k);

                if (elem) elem.innerText = response[k];
            }
        });
    }
}

(() => new Process())();
