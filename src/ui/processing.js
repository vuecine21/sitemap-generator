var closeButton = document.getElementById("close");

closeButton.onclick = function (e) {
    chrome.runtime.sendMessage({terminate: true});
    e.target.innerText = "Terminating....";
};

function checkStatus() {
    chrome.runtime.sendMessage({status: true}, function (response) {
        for (var k in response) {
            var elem = document.getElementById(k);
            if (elem) elem.innerText = response[k];
        }
    });
}

for (var i = 0; i < 10; i++) {
    setTimeout(checkStatus, i * 1000);
}

setTimeout(function () {
    setInterval(checkStatus, 10000);
}, 10 * 1000);