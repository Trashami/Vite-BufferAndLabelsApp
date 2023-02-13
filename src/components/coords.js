// function to show coordinates
export function showCoordinates(pt, view) {
    var coordsWidget = document.getElementById("coordinates-container");
    var mp = view.toMap(pt);
    //the map is in web mercator but display coordinates in geographic (lat, long)
    coordsWidget.innerHTML = "Lat: " + mp.latitude.toFixed(3) + " " + "Long: " + mp.longitude.toFixed(3);
}