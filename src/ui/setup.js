function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

var siteUrl = getParameterByName("u");
var siteUrlInput = document.getElementsByName("url")[0];
siteUrlInput.value = (siteUrl.indexOf("http") === 0) ? siteUrl : "";

var startButton = document.getElementById("start");

startButton.onclick = function (e) {
    var url = siteUrlInput.value,
        config = {
            url: url,
            requestDomain: (url + "/*"),
            contenttype_patterns: ["text/html", "text/plain"],
            exclude_extension: [".png", ".json", ".jpg", ".jpeg", ".js", ".css",
                ".zip", ".mp3", ".mp4", ".ogg", ".avi", ".wav", ".webm", ".gif", ".ico"],
            success_codes: [200, 201, 202, 203, 304],
            maxTabCount: 25
        };

    chrome.runtime.sendMessage({start: config});
    e.target.innerText = "Starting....";
    startButton.onclick = false;
};


