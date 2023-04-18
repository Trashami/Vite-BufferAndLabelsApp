export function waitForElement(id, callback) {
    var theWaitingIsTheHardestPart = setInterval(function () {
        if (document.getElementById(id)) {
            clearInterval(theWaitingIsTheHardestPart);
            callback();
        }
    }, 100);
}