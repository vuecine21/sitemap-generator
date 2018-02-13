/**
 * @param {number} width - width of the new window (px)
 * @param {number} height - height of the new window (px)
 * @param {String} url - url to open
 * @param {String} type - "normal" or "popup"; defaults to "popup"
 * @param {boolean} focused - if window should have focus, default true
 * @returns {Promise}
 * @description Opens centered window in the middle of user's monitor viewport.
 * If user has multiple monitors this method launches window in the first/leftmost monitor.
 * This method requires `system.display` permission in `manifest.json`
 */
function centeredWindow(width, height, url, type, focused) {

    return new Promise(function (resolve, reject) {

        /**
         * @ignore
         * computes 1D center given preferred size and max width
         * */
        function center(max, size) {
            return parseInt(Math.max(0, Math.round(0.5 * (max - size))));
        }

        /**
         * @ignore
         * requests the users desktop monitor size
         * */
        function getBounds() {
            return new Promise(function (resolve) {
                chrome.system.display.getInfo(function (info) {
                    resolve(info && info[0] ?
                        info[0].workArea : {width: 0, height: 0});
                });
            });
        }

        getBounds().then(function (area) {
            chrome.windows.create({
                url: url,
                width: width,
                height: height,
                focused: focused === undefined ? true : focused,
                type: type || "popup",
                left: center(area.width, width),
                top: center(area.height, height)
            }, resolve);
        });
    });
}