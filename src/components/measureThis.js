import * as geometryEngineAsync from "@arcgis/core/geometry/geometryEngineAsync";

export async function measureThis(view) {
    const geom = view.popup.selectedFeature.geometry;
    const initDistance = await geometryEngineAsync.geodesicLength(geom, "miles");
    const distance = parseFloat(Math.round(initDistance * 100) / 100).toFixed(2);
    view.popup.content =
        view.popup.selectedFeature.attributes.hydname +
        "<div style='background-color:DarkGray;color:white'>" +
        distance +
        " miles.</div>";
}