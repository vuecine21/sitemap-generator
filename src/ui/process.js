/**
 * @namespace
 * @description This module is used to communicate with the generator while crawling is ongoing.
 */
export default class Process {

    constructor() {

        // bind event handlers
        document.getElementById('close').onclick = (e) => {
            window.chrome.runtime.sendMessage({terminate: true});
            e.target.innerText = 'Terminating....';
        };

        // initially check status every 1 second
        for (let i = 0; i < 10; i++) {
            setTimeout(Process.checkStatus, i * 1000);
        }

        // after first 10x increase the interval
        setTimeout(function () {
            setInterval(Process.checkStatus, 10000);
        }, 10 * 1000);
    }

    /**
     * @description Request information about current processing status from the background
     * then update the UI to reflect current status.
     */
    static checkStatus() {
        window.chrome.runtime.sendMessage({status: true}, function (response) {
            for (let k in response) {
                if (response.hasOwnProperty(k)) {
                    let elem = document.getElementById(k);

                    if (elem) elem.innerText = response[k];
                }
            }
        });
    }
}

(() => new Process())();
