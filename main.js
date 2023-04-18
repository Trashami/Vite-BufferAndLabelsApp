import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import WebMap from '@arcgis/core/WebMap';
import MapView from '@arcgis/core/views/MapView';
import Search from "@arcgis/core/widgets/Search";
import PopupTemplate from "@arcgis/core/PopupTemplate";
import CustomContent from "@arcgis/core/popup/content/CustomContent";
import Graphic from "@arcgis/core/Graphic";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import * as geometryEngineAsync from "@arcgis/core/geometry/geometryEngineAsync";
import Print from "@arcgis/core/widgets/Print";
import BasemapGallery from "@arcgis/core/widgets/BasemapGallery";
import LayerList from "@arcgis/core/widgets/LayerList";
import Legend from "@arcgis/core/widgets/Legend";
import Bookmarks from "@arcgis/core/widgets/Bookmarks";
import { setAssetPath } from '@esri/calcite-components/dist/components';
import "@esri/calcite-components";
import "@esri/calcite-components/dist/components/calcite-button";
import "@esri/calcite-components/dist/components/calcite-icon";
import "@esri/calcite-components/dist/components/calcite-shell";
import "@esri/calcite-components/dist/components/calcite-shell-panel";
import "@esri/calcite-components/dist/components/calcite-panel";
import "@esri/calcite-components/dist/components/calcite-loader";
import "@esri/calcite-components/dist/components/calcite-action";
import "@esri/calcite-components/dist/components/calcite-action-bar";
import "@esri/calcite-components/dist/components/calcite-panel";
import "@esri/calcite-components/dist/components/calcite-label";
import "@esri/calcite-components/dist/calcite/calcite.css";
import interact from 'interactjs';
import { initialize, checkCurrentStatus, signIn, signOut, fetchUser } from '/src/components/oauth.js';
import { generateExcelFile } from '/src/components/generateExcelFile.js';
import symbol from '/src/components/symbology.js';
import { layerData } from '/src/components/layerData.js';
import { waitForElement } from '/src/components/waitToLoad.js';
import { debounce } from '/src/components/preventSpam.js';
import './style.css';

setAssetPath(location.href);

const APP_ID = import.meta.env.VITE_APP_ID;
const PORTAL_URL = import.meta.env.VITE_PORTAL_URL;
const WEBMAP_ID = import.meta.env.VITE_WEBMAP_ID;
const PARCEL_URL = import.meta.env.VITE_PARCEL_LAYER;
const printURL = import.meta.env.VITE_PRINT_URL;
const loader = document.createElement('calcite-loader');
loader.active = true;

const btnAuth = document.getElementById('btnAuth');
const createLabelDiv = document.getElementById("labelInput");
const welcomeMessage = document.getElementById('welcomeMessage');
const popupTargetSelectionString = ".esri-component.esri-popup";

let bufferedGraphic;
let selectedParcel;
let bufferedParcel;
let parcelsIntersected;
let highlightData = [];
const handler = [];
let objectId = [];
let layerView;
let bufferDistanceValue;
let bufferDistanceUnits;
let selected;
let thisParcel;
let graphic;
let agent;
let layoutType;
let SupervisorDistrictId;

const bufferParcel = {
    title: "Buffer",
    id: "userIconToCreateBuffer",
    className: "esri-icon-edit"
};

const duplicateParcel = {
    title: "Copy",
    id: "userIconToDuplicate",
    className: "esri-icon-duplicate"
};

const resetParcel = {
    title: "Reset",
    id: "userIconToReset",
    className: "esri-icon-rotate-back"
};

const moreInfos = {
    title: "More Info",
    id: "userIconToQuery",
    className: "esri-icon-notice-round"
};

const customText = new CustomContent({
    creator: (event) => {
        const div = document.createElement("div");
        div.id = "popupSelections";
        div.innerHTML = (
            "<div style='border: 2px solid black; padding: 5px'><div style='text-align: center; background-color: green; padding: 5px; margin: 0; border: 4px solid black; '><img src='./public/County_Seal_200x200.png' height='150px' /><br /></div><div style='text-align: center;'><div style='text-align: left;'><div style='text-align: center;'><br />First <i>select</i> a buffer distance, then <i>click</i> <b><svg xmlns='http://www.w3.org/2000/svg' height='16' width='16'><path d='M15.721 4.007a.965.965 0 0 0-.03-1.385l-1.413-1.414a.965.965 0 0 0-1.385-.03L2.841 11.23l-1.756 4.097a.371.371 0 0 0 .488.487L5.67 14.06l8.607-8.609zM2.624 14.276l.554-1.294.74.74zm2.338-.924L3.55 11.937l8.007-8.008 1.414 1.415zm8.716-8.716l-1.414-1.414 1.09-1.09a.306.306 0 0 1 .433 0l.981.98a.306.306 0 0 1 0 .434z'></path></svg> Buffer</b> below.</div><br /></div></div><div style='justify-content: center; display: flex;'>Enter Buffer Value: &nbsp;<input id=bufferDistanceInput type='text' value='300' style='text-align:center; width:75px'>&nbsp;&nbsp;&nbsp;</input><div><label for='unitOfMeasurement'>Units:&nbsp;<select name='units' id='bufferDistanceUnits'><option value='feet'>Feet</option><option value='yards'>Yards</option><option value='miles' >Miles</option><option value='meters' >Meters</option></select></label></div></div></div>"
        );
        return div;
    }
})

const template = new PopupTemplate({
    title: "Selected Parcel: {parcelid}",
    content: [customText],
    actions: [bufferParcel, resetParcel, moreInfos, duplicateParcel]
});

const parcelsLayer = new FeatureLayer({
    url: PARCEL_URL,
    outFields: ["*"],
    popupTemplate: template,
    title: "Parcels"
});

function createFeatureLayer(url, visible, title) {
    return new FeatureLayer({
        url: url,
        visible: visible,
        title: title,
    });
}

const featureLayers = layerData.map(data => createFeatureLayer(data.url, data.visible, data.title, data.popupTemplate, data.outFields));

const bufferLayer = new GraphicsLayer();
const selectSite = new GraphicsLayer();
const intersectedParcels = new GraphicsLayer();
const drawOnGraphicsLayer = new GraphicsLayer({
    title: "Markup",
});

async function loadMap() {

    const webmapId = new URLSearchParams(window.location.search).get("webmap")
        ?? WEBMAP_ID;

    const webmap = new WebMap({
        portalItem: {
            id: webmapId,
            portal: {
                url: PORTAL_URL
            }
        }
    });

    const view = new MapView({
        map: webmap,
        container: 'app',
        highlightOptions: {
            color: [0, 0, 0,],
            fillOpacity: .1
        },
        padding: {
            left: 49
        },
        popup: {

            dockEnabled: true,
            //visible: false,
            dockOptions: {
                position: "bottom-right",
                buttonEnabled: false,
                breakpoint: false
            }
        },
        constraints: {
            rotationEnabled: false
        },
        spatialReference: {
            wkid: 3857
            }
        //resizeAlign: "left"
    });
    //add parcel layer to the map
    webmap.add(parcelsLayer);
    view.map.add(bufferLayer);
    view.map.add(intersectedParcels);
    featureLayers.forEach(layer => webmap.add(layer));

    const search = new Search({
        view: view,
        popupEnabled: true,
        sources: [{
            layer: parcelsLayer,
            seachFields: ["parcelid"],
            displayField: "parcelid",
            outFields: ["parcelid"],
            exactMatch: false,
            name: "Tulare County Assessor Parcel Number",
            suggestionsEnabled: true
        }],
        allPlaceholder: "APN or Address"
    });

    view.ui.add(search, 'top-right');

    view.popup.on('trigger-action', (event) => {
        view.popup.dockEnabled = true;
        view.popup.dockOptions.position = "bottom-right";
        if (event.action.id === "userIconToCreateBuffer") {
            selectSite.removeAll();
            intersectedParcels.removeAll();
            var bufferValueInput = document.getElementById("bufferDistanceInput");
            var bufferUnitInput = document.getElementById("bufferDistanceUnits");
            bufferDistanceValue = bufferValueInput.value
            bufferDistanceUnits = bufferUnitInput.selectedOptions[0].value
            bufferThisParcel(thisParcel);
        }
    });

    view.popup.on('trigger-action', (event) => {
        if (event.action.id === "userIconToDuplicate") {
            var thisParcel = view.popup.selectedFeature.attributes.apn;
            var thisOwner = view.popup.selectedFeature.attributes.m1_owner;
            var thisCareOf = view.popup.selectedFeature.attributes.m2_careof;
            var thisAddress = view.popup.selectedFeature.attributes.m3_street;
            var thisCity = view.popup.selectedFeature.attributes.m4_city;
            navigator.clipboard.writeText(thisParcel + '\n' + thisOwner + '\n' + thisCareOf + '\n' + thisAddress + '\n' + thisCity);
        }
    });

    view.popup.on('trigger-action', (event) => {
        if (event.action.id === "userIconToReset") {
            bufferLayer.removeAll();
            drawOnGraphicsLayer.removeAll();
            view.popup.close();
            //remove highlights
            view.graphics.removeAll();
            removeHighlights();
            clearHighlightData();
            selectSite.removeAll();
            intersectedParcels.removeAll();
            var downloadLink = document.getElementsByClassName("download-link");
            if (downloadLink.length > 0) {
                downloadLink[0].remove();
            }
        }
    });

    const debouncedHandler = debounce((event) => {
        if (event.action.id === "userIconToQuery") {
            var panel = document.getElementById("attributesList");
            if (panel != null) {
                var tables = panel.querySelectorAll("table");
                tables.forEach(function (table) {
                    table.remove();
                });
            }
            var thisSite = view.popup.selectedFeature;
            if (panel == null) {
                panel = document.createElement("calcite-panel");
                panel.heading = "Attributes of Parcel " + thisSite.attributes.parcelid;
                panel.setAttribute("data-panel-id", "attributesList");
                panel.dismissible = true;
                panel.id = "attributesList";
                panel.classList.add("custom-panel");
                document.body.appendChild(panel)
                panel.addEventListener("calcitePanelDismiss", function () {
                    panel.style.display = "none";
                })
            } else {
                panel.style.display = "flex";
                panel.dismissed = false;
                panel.closed = false;
            }
            var table = document.createElement("table");
            table.id = "attributesTable";
            table.classList.add("table", "table-striped", "table-bordered", "table-hover", "table-sm", "custom-table");

            var row = table.insertRow();
            var cell1 = row.insertCell(0);
            cell1.colSpan = "2";
            cell1.innerHTML = "";
            cell1.classList.add("custom-cell");

            panel.appendChild(table);

            var row = table.insertRow();
            var cell1 = row.insertCell(0);
            var cell2 = row.insertCell(1);
            cell1.innerHTML = "Owner: ";
            cell2.innerHTML = thisSite.attributes.m1_owner;
            panel.appendChild(table);

            var row = table.insertRow();
            var cell1 = row.insertCell(0);
            var cell2 = row.insertCell(1);
            cell1.innerHTML = "Address: ";
            cell2.innerHTML = thisSite.attributes.m3_street;
            panel.appendChild(table);

            var row = table.insertRow();
            var cell1 = row.insertCell(0);
            var cell2 = row.insertCell(1);
            cell1.innerHTML = "City: ";
            cell2.innerHTML = thisSite.attributes.m4_city;
            panel.appendChild(table);


            var generalPlanZone = webmap.layers.items.find(layer => layer.title === "General Plan Land Use");
            var GPquery = generalPlanZone.createQuery();
            GPquery.geometry = thisSite.geometry;
            GPquery.spatialRelationship = "intersects";
            generalPlanZone.queryFeatures(GPquery)
                .then(function (results) {
                    if (results.features.length > 0) {
                        var zoneName = results.features[0].attributes.LU_GP;
                        var planName = results.features[0].attributes.Plan_Name;
                        var category = results.features[0].attributes.Category;
                        var subCat = results.features[0].attributes.SubCat;
                        var row = table.insertRow();
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        cell1.innerHTML = "General Plan Zone: ";
                        cell2.innerHTML = zoneName;
                        var row = table.insertRow();
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        cell1.innerHTML = "General Plan Plan Name: ";
                        cell2.innerHTML = planName;
                        var row = table.insertRow();
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        cell1.innerHTML = "General Plan Category: ";
                        cell2.innerHTML = category;
                        var row = table.insertRow();
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        cell1.innerHTML = "General Plan Subcategory: ";
                        cell2.innerHTML = subCat;
                        panel.appendChild(table);
                    } else {
                        console.log("No intersecting data found General Plan Zone.");
                    }
                })
                .catch(function (error) {
                    console.error("An error occurred during generalPlanZone query execution:", error);
                });

            var urbanAreasBoundaries = webmap.layers.items.find(layer => layer.title === "Urban Area Boundary");
            console.log(webmap.layers.items)
            var UABquery = urbanAreasBoundaries.createQuery();
            UABquery.geometry = thisSite.geometry;
            UABquery.spatialRelationship = "intersects";
            urbanAreasBoundaries.queryFeatures(UABquery)
                .then(function (results) {
                    if (results.features.length > 0) {
                        var zoneName = results.features[0].attributes.NAME;
                        var row = table.insertRow();
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        cell1.innerHTML = "Urban Area Boundaries: ";
                        cell2.innerHTML = zoneName;
                        panel.appendChild(table);
                    } else {
                        console.log("No intersecting data found for Urban Area Boundaries.");
                    }
                })
                .catch(function (error) {
                    console.error("An error occurred during urbanAreasBoundaries query execution:", error);
                });

            var urbanDevelopmentBoundaries = webmap.layers.items.find(layer => layer.title === "Urban Development Boundary");
            var UDBquery = urbanDevelopmentBoundaries.createQuery();
            UDBquery.geometry = thisSite.geometry;
            UDBquery.spatialRelationship = "intersects";
            urbanDevelopmentBoundaries.queryFeatures(UDBquery)
                .then(function (results) {
                    if (results.features.length > 0) {
                        var zoneName = results.features[0].attributes.NAME;
                        var row = table.insertRow();
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        cell1.innerHTML = "Urban Development Boundaries: ";
                        cell2.innerHTML = zoneName;
                        panel.appendChild(table);
                    } else {
                        console.log("No intersecting data found for Urban Development Boundaries.");
                    }
                })
                .catch(function (error) {
                    console.error("An error occurred during urbanDevelopmentBoundaries query execution:", error);
                });

            var hamletDevelopmentBoundaries = webmap.layers.items.find(layer => layer.title === "Hamlet Development Boundary");
            var HDBquery = hamletDevelopmentBoundaries.createQuery();
            HDBquery.geometry = thisSite.geometry;
            HDBquery.spatialRelationship = "intersects";
            hamletDevelopmentBoundaries.queryFeatures(HDBquery)
                .then(function (results) {
                    if (results.features.length > 0) {
                        var zoneName = results.features[0].attributes.NAME;
                        var row = table.insertRow();
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        cell1.innerHTML = "Hamlet Development Boundaries: ";
                        cell2.innerHTML = zoneName;
                        panel.appendChild(table);
                    } else {
                        console.log("No intersecting data found for Hamlet Development Boundaries.");
                    }
                })
                .catch(function (error) {
                    console.error("An error occurred during hamletDevelopmentBoundaries query execution:", error);
                });

            var airportZone = webmap.layers.items.find(layer => layer.title === "Airport Safety Zone");
            var AZquery = airportZone.createQuery();
            AZquery.geometry = thisSite.geometry;
            AZquery.spatialRelationship = "intersects";
            airportZone.queryFeatures(AZquery)
                .then(function (results) {
                    if (results.features.length > 0) {
                        var zoneName = results.features[0].attributes.Layer;
                        var cityName = results.features[0].attributes.RefName;
                        var row = table.insertRow();
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        cell1.innerHTML = "Airport Safety Zone: ";
                        cell2.innerHTML = zoneName;
                        var row = table.insertRow();
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        cell1.innerHTML = "Airport Safety Zone City: ";
                        cell2.innerHTML = cityName;
                        panel.appendChild(table);
                    } else {
                        console.log("No intersecting data found for Airport Zones.");
                    }
                })
                .catch(function (error) {
                    console.error("An error occurred during airportZone query execution:", error);
                });

            var zoningZone = webmap.layers.items.find(layer => layer.title === "Zoning");
            var Zoningquery = zoningZone.createQuery();
            Zoningquery.geometry = thisSite.geometry;
            Zoningquery.spatialRelationship = "intersects";
            zoningZone.queryFeatures(Zoningquery)
                .then(function (results) {
                    if (results.features.length > 0) {
                        var zoneName = results.features[0].attributes.ZONE;
                        var row = table.insertRow();
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        cell1.innerHTML = "Zoning Zone: ";
                        //add cell2.innerHTML as a hyperlink
                        var pre = "<a href='https://tularecounty.ca.gov/rma/search-results/?Keywords=";
                        var ending = "&display=search&newSearch=true&noCache=1' target='_blank'>";
                        cell2.innerHTML = pre + zoneName + ending + zoneName + "</a>";
                        panel.appendChild(table);
                    } else {
                        console.log("No intersecting data found for zoning.");
                    }
                })
                .catch(function (error) {
                    console.error("An error occurred during zoning query execution:", error);
                });

            var floodZoning = webmap.layers.items.find(layer => layer.title === "Flood Zones - 100 Year");
            var floodquery = floodZoning.createQuery();
            floodquery.geometry = thisSite.geometry;
            floodquery.spatialRelationship = "intersects";
            floodZoning.queryFeatures(floodquery)
                .then(function (results) {
                    if (results.features.length > 0) {
                        var zoneName = results.features[0].attributes.FLOODZONE;
                        var row = table.insertRow();
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        cell1.innerHTML = "Flood Zone: ";
                        cell2.innerHTML = zoneName;
                        panel.appendChild(table);
                    } else {
                        console.log("No intersecting data found for Flood Zoning.");
                    }
                })
                .catch(function (error) {
                    console.error("An error occurred during floodZoning query execution:", error);
                });

            var SRAZone = webmap.layers.items.find(layer => layer.title === "State Responsibility Areas");
            var SRAquery = SRAZone.createQuery();
            SRAquery.geometry = thisSite.geometry;
            SRAquery.spatialRelationship = "intersects";
            SRAZone.queryFeatures(SRAquery)
                .then(function (results) {
                    if (results.features.length > 0) {
                        var zoneName = results.features[0].attributes.AGENCY;
                        var row = table.insertRow();
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        cell1.innerHTML = "SRA Zone: ";
                        cell2.innerHTML = zoneName;
                        panel.appendChild(table);
                    } else {
                        console.log("No intersecting data found SRA Zones.");
                    }
                })
                .catch(function (error) {
                    console.error("An error occurred during SRAZone query execution:", error);
                });

            var AGPreserveZone = webmap.layers.items.find(layer => layer.title === "Agricultural Preserve");
            var AGPquery = AGPreserveZone.createQuery();
            AGPquery.geometry = thisSite.geometry;
            AGPquery.spatialRelationship = "intersects";
            AGPreserveZone.queryFeatures(AGPquery)
                .then(function (results) {
                    if (results.features.length > 0) {
                        var contractNumber = results.features[0].attributes.CONTRACT;
                        var preserveNumber = results.features[0].attributes.PRESERVE;
                        var row = table.insertRow();
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        cell1.innerHTML = "Agricultural Preserve Contract: ";
                        cell2.innerHTML = contractNumber;
                        var row = table.insertRow();
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        cell1.innerHTML = "Agricultural Preserve Number: ";
                        cell2.innerHTML = preserveNumber;
                        panel.appendChild(table);
                    } else {
                        console.log("No intersecting data found Ag Preserve Zones.");
                    }
                })
                .catch(function (error) {
                    console.error("An error occurred during AGPreserveZone query execution:", error);
                });

            var irrigationDistrictZone = webmap.layers.items.find(layer => layer.title === "Irrigation District");
            var IDquery = irrigationDistrictZone.createQuery();
            IDquery.geometry = thisSite.geometry;
            IDquery.spatialRelationship = "intersects";
            irrigationDistrictZone.queryFeatures(IDquery)
                .then(function (results) {
                    if (results.features.length > 0) {
                        var zoneName = results.features[0].attributes.IRRIGATION;
                        var row = table.insertRow();
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        cell1.innerHTML = "Irrigation District Zone: ";
                        cell2.innerHTML = zoneName;
                        panel.appendChild(table);
                    } else {
                        console.log("No intersecting data found for Irrigation Districts.");
                    }
                })
                .catch(function (error) {
                    console.error("An error occurred during irrigationDistrictZone query execution:", error);
                });

            var supervisorialDistrict = webmap.layers.items.find(layer => layer.title === "Supervisorial Districts");
            var SPZquery = supervisorialDistrict.createQuery();
            SPZquery.geometry = thisSite.geometry;
            SPZquery.spatialRelationship = "intersects";
            supervisorialDistrict.queryFeatures(SPZquery)
                .then(function (results) {
                    if (results.features.length > 0) {
                        var districtName = results.features[0].attributes.NAME;
                        var row = table.insertRow();
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        cell1.innerHTML = "Supervisor's District Number: ";
                        cell2.innerHTML = districtName;
                        panel.appendChild(table);
                    } else {
                        console.log("No intersecting data found for Supervisorial Districts.");
                    }
                })
                .catch(function (error) {
                    console.error("An error occurred during supervisorialDistricts query execution:", error);
                });

            var soilLayer = webmap.layers.items.find(layer => layer.title === "Soils");
            var soilquery = soilLayer.createQuery();
            soilquery.geometry = thisSite.geometry;
            soilquery.spatialRelationship = "intersects";
            soilLayer.queryFeatures(soilquery)
                .then(async function (results) {
                    if (results.features.length > 0) {
                        var count = results.features.length;
                        for (var i = 0; i < count; i++) {
                            const intersectGeometry = await geometryEngineAsync.intersect(results.features[i].geometry, thisSite.geometry);
                            const intersectArea = await geometryEngineAsync.geodesicArea(intersectGeometry, "square-miles");
                            const soilArea = await geometryEngineAsync.geodesicArea(results.features[i].geometry, "square-miles");
                            const parcelArea = await geometryEngineAsync.geodesicArea(thisSite.geometry, "square-miles");
                            var percent = (intersectArea / parcelArea) * 100;
                            percent = percent.toFixed(2);
                            var soilName = results.features[i].attributes.SOILNAME;
                            var septicTNK = results.features[i].attributes.SPTC_TNK_A;
                            var septicLeaching = results.features[i].attributes.LEACHING;
                            var row = table.insertRow();
                            var cell1 = row.insertCell(0);
                            var cell2 = row.insertCell(1);
                            cell1.innerHTML = "Soil Type " + (i + 1) + " : ";
                            cell2.innerHTML = soilName;
                            var row = table.insertRow();
                            var cell1 = row.insertCell(0);
                            var cell2 = row.insertCell(1);
                            cell1.innerHTML = "Soil Percentage " + (i + 1) + " : ";
                            cell2.innerHTML = percent + "%";
                            var row = table.insertRow();
                            var cell1 = row.insertCell(0);
                            var cell2 = row.insertCell(1);
                            cell1.innerHTML = "Septic Tank " + (i + 1) + " : ";
                            cell2.innerHTML = septicTNK;
                            var row = table.insertRow();
                            var cell1 = row.insertCell(0);
                            var cell2 = row.insertCell(1);
                            cell1.innerHTML = "Septic Leaching " + (i + 1) + " : ";
                            cell2.innerHTML = septicLeaching;
                            panel.appendChild(table);
                        }
                    } else {
                        console.log("No intersecting data found for soil data.");
                    }
                })
                .catch(function (error) {
                    console.error("An error occurred during soilLayer query execution:", error);
                });

            var USDistrict = webmap.layers.items.find(layer => layer.title === "Unified School District");
            var USDistrictquery = USDistrict.createQuery();
            USDistrictquery.geometry = thisSite.geometry;
            USDistrictquery.spatialRelationship = "intersects";
            USDistrict.queryFeatures(USDistrictquery)
                .then(function (results) {
                    if (results.features.length > 0) {
                        var Name = results.features[0].attributes.DISTRCTNAME;
                        var row = table.insertRow();
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        cell1.innerHTML = "Unified School District: ";
                        cell2.innerHTML = Name;
                        panel.appendChild(table);
                    } else {
                        console.log("No intersecting data found for Unified School Districts.");
                    }
                })
                .catch(function (error) {
                    console.error("An error occurred during USDistrict query execution:", error);
                });

            var ESDistrict = webmap.layers.items.find(layer => layer.title === "Elementary School District");
            var ESDistrictquery = ESDistrict.createQuery();
            ESDistrictquery.geometry = thisSite.geometry;
            ESDistrictquery.spatialRelationship = "intersects";
            ESDistrict.queryFeatures(ESDistrictquery)
                .then(function (results) {
                    if (results.features.length > 0) {
                        var Name = results.features[0].attributes.DISTRCTNAME;
                        var row = table.insertRow();
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        cell1.innerHTML = "Elementary School District: ";
                        cell2.innerHTML = Name;
                        panel.appendChild(table);
                    } else {
                        console.log("No intersecting data found for Elementary School Districts.");
                    }
                })
                .catch(function (error) {
                    console.error("An error occurred during ESDistrict query execution:", error);
                });

            var HSDistrict = webmap.layers.items.find(layer => layer.title === "High School District");
            var HSDistrictquery = HSDistrict.createQuery();
            HSDistrictquery.geometry = thisSite.geometry;
            HSDistrictquery.spatialRelationship = "intersects";
            HSDistrict.queryFeatures(HSDistrictquery)
                .then(function (results) {
                    if (results.features.length > 0) {
                        var Name = results.features[0].attributes.DISTRCTNAME;
                        var row = table.insertRow();
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        cell1.innerHTML = "High School District: ";
                        cell2.innerHTML = Name;
                        panel.appendChild(table);
                    } else {
                        console.log("No intersecting data found for High School Districts.");
                    }
                })
                .catch(function (error) {
                    console.error("An error occurred during HSDistrict query execution:", error);
                });
            }
    }, 1500);

    view.popup.on('trigger-action', debouncedHandler);

    btnAuth.addEventListener('click', () => {
        signOut();
    });

    const basemaps = new BasemapGallery({
        view,
        container: "basemaps-container",
    });

    const bookmarks = new Bookmarks({
        view,
        container: "bookmarks-container",
        editingEnabled: true
    });

    const layerList = new LayerList({
        view,
        selectionEnabled: true,
        container: "layers-container"
    });

    const legend = new Legend({
        view,
        container: "legend-container"
    });

    const cte = [
        {
            "Title": ""
        },
        {
            "CaseNum": ""
        },
        {
            "ParcelID": ""
        },
        {
            "Applicant": ""
        },
        {
            "Owner": ""
        },
        {
            "Address": ""
        },
        {
            "CSZ": ""
        },
        {
            "Supervisor": ""
        },
        {
            "Agent": ""
        }
    ];

    const print = new Print({
        view: view,
        container: "print-container",
        printServiceUrl: printURL,
        templateOptions: {
            //title: "",
            format: "PDF",
            layout: "rma_print_template",
            customTextElements: cte,
            scaleEnabled: true,
        }
    });

    var printBtn = document.createElement("button");
    printBtn.innerHTML = "Print Preview";
    printBtn.classList.add("esri-widget", "esri-button", "esri-interactive");
    printBtn.style.marginBottom = "10px";
    document.getElementById("print-container").appendChild(printBtn);

    waitForElement("print-container__layoutContent", function () {
        layoutType = document.querySelector("#print-container__layoutContent > div:nth-child(1) > div:nth-child(1) > label > input");
        layoutType.type = "select";
        layoutType.classList.add("esri-select");
        layoutType.parentElement.innerHTML = '<select id="print-layout-select" class="esri-select" style="width: 100%;"><option value="" selected>Select A Template</option><option value="300 Foot Radius Map">300 Foot Radius Map</option><option value="Ag Preserves">Ag Preserves</option><option value="Ag Preserves(Non-Renewal)">Ag Preserves(Non-Renewal)</option><option value="Contract Amendment">Contract Amendment</option><option value="Existing Zoning">Existing Zoning</option><option value="GAP">GAP</option><option value="General Plan">General Plan</option><option value="Parcel Cut Map">Parcel Cut Map</option><option value="Site Plan Map">Site Plan Map</option><option value="Species of Concern">Species of Concern</option><option value="Vicinity Map">Vicinity Map</option><option value="Waterways">Waterways</option><option value="Wetlands">Wetlands</option><option value="Zoning Ordinance">Zoning Ordinance</option></select>';
        document.getElementById("print-layout-select").addEventListener("change", function () {
            cte[0].Title = this.value;
            var supervisorialDistrict = webmap.layers.items[23]
            var SPZquery = supervisorialDistrict.createQuery();
            SPZquery.geometry = selectedParcel.geometry;
            SPZquery.spatialRelationship = "intersects";
            supervisorialDistrict.queryFeatures(SPZquery).then(function (results) {
                var districtName = results.features[0].attributes.NAME;
                cte[7].Supervisor = districtName;
            })
        })
    });

    const printPreview = document.createElement("div");
    printPreview.classList.add("printPreview");
    printPreview.innerHTML = "<h1>Print Preview</h1>";

    var closeBtn = document.createElement("button");
    closeBtn.innerHTML = " <strong>x</strong> ";
    closeBtn.classList.add("esri-widget", "esri-button", "esri-interactive", "closeBtn");
    printPreview.appendChild(closeBtn);

    printBtn.addEventListener("click", function () {
        printPreview.style.display = "block";
        view.ui.add(printPreview, "manual");
    });

    closeBtn.addEventListener("click", function () {
        printPreview.style.display = "none";
        view.ui.remove(printPreview);
    });


    view.watch("scale", function (scale) {
        print.templateOptions.scale = scale;
    });

    webmap.when(() => {
        const { title } = webmap.portalItem;
        document.querySelector("#header-title").textContent = title;
        let activeWidget;

        const handleActionBarClick = ({ target }) => {
            if (target.tagName !== "CALCITE-ACTION") {
                return;
            }
            if (activeWidget) {
                document.querySelector(`[data-action-id=${activeWidget}]`).active = false;
                document.querySelector(`[data-panel-id=${activeWidget}]`).hidden = true;
            }
            const nextWidget = target.dataset.actionId;
            if (nextWidget !== activeWidget) {
                document.querySelector(`[data-action-id=${nextWidget}]`).active = true;
                document.querySelector(`[data-panel-id=${nextWidget}]`).hidden = false;
                activeWidget = nextWidget;
            } else {
                activeWidget = null;
            }
        };

        document.querySelector("calcite-action-bar").addEventListener("click", handleActionBarClick);
        let actionBarExpanded = false;
        document.addEventListener("calciteActionBarToggle", event => {
            actionBarExpanded = !actionBarExpanded;
            view.padding = {
                left: actionBarExpanded ? 135 : 45
            };
        });
        document.querySelector("calcite-shell").hidden = false;
        document.querySelector("calcite-loader").hidden = true;
    }); 

    view.when(async () => {
        layerView = await view.whenLayerView(parcelsLayer);
        view.on('click', async (event) => {
            //if altKey is pressed dont do anything
            if (event.altKey) {
                return;
            }
            const options = {
                include: parcelsLayer
            };
            const { results } = await view.hitTest(event, options);
            try {
                graphic = results[0];
                if (selected) {
                    selected.remove();
                    //bufferLayer.removeAll()
                }
                //selected = layerView.highlight(graphic);

                thisParcel = graphic.graphic;
                cte[2].ParcelID = thisParcel.attributes.parcelid;
                cte[4].Owner = thisParcel.attributes.m1_owner;
                cte[5].Address = thisParcel.attributes.m3_street;
                cte[6].CSZ = thisParcel.attributes.m_add_2;
                cte[8].Agent = agent;
            } catch (err) {
                console.log("Error on selecting a parcel: " + err);
            }
        })
    });

    loader.active = false
    
    async function bufferThisParcel(thisParcel) {
        try {
            if (bufferedParcel) {
                bufferLayer.removeAll();
            }
            bufferedParcel = await geometryEngineAsync.geodesicBuffer(thisParcel.geometry, bufferDistanceValue, bufferDistanceUnits, true);
            selectedParcel = new Graphic({
                geometry: thisParcel.geometry,
                symbol: symbol.symbol,
            });
            bufferedGraphic = new Graphic({
                geometry: bufferedParcel,
                symbol: symbol.symbol,
            });
            bufferLayer.add(bufferedGraphic);
            selectSite.add(selectedParcel);
            bufferLayer.title = "Buffered Parcel";
            selectSite.title = "Selected Parcel";
            await view.goTo({
                target: bufferedParcel.extent,
            });
            removeHighlights();
            clearHighlightData();
            buildHighlights();
        } catch (error) {
            console.error("An error occurred while buffering the parcel:", error);
        }
    }

    async function buildHighlights(selectedResults) {
        const query = parcelsLayer.createQuery();
        query.geometry = bufferedParcel;
        const results = await parcelsLayer.queryFeatures(query);
        selectedResults = await results.features;
        updatehighlights(selectedResults);
    }

    async function updatehighlights(selectedResults) {
        view.whenLayerView(parcelsLayer).then(await function () {
            for (let i = 0; i < selectedResults.length; i++) {
                var feature = selectedResults[i];
                highlightData.push(selectedResults[i].attributes)
                objectId.push(feature.attributes["objectid"])
                parcelsIntersected = new Graphic({
                    geometry: selectedResults[i].geometry,
                    symbol: symbol.highlightSymbol,
                    attributes: selectedResults[i].attributes
                });
                intersectedParcels.add(parcelsIntersected)
            }
            intersectedParcels.title = "Intersected Parcels";
            handler.length = 0;
        }).then(function () {
            pushHighlights(layerView).then
            generateExcelFile(highlightData);
        })
    }

    async function pushHighlights(layerView) {
        handler.push(layerView.highlight(objectId))
    }

    view.on("click", async function (event) {
        if (event.native.ctrlKey === true) {
            await view.hitTest(event).then(function (response) {
                if (response.results.length > 0) {
                    var feature = response.results.filter(function (result) {
                        return result.graphic.layer === parcelsLayer;
                    })[0].graphic;
                    objectId.push(feature.attributes["objectid"]);
                    parcelsIntersected = new Graphic({
                        geometry: feature.geometry,
                        symbol: symbol.highlightSymbol,
                        attributes: feature.attributes
                    });
                    intersectedParcels.add(parcelsIntersected)
                }
            }).then(function () {
                handler.push(layerView.highlight(objectId));
                generateExcelFile(highlightData);
            })
        }
    })
    
    view.on("click", async function (event) {
        if (event.native.altKey === true) {
            await view.hitTest(event).then(function (response) {
                if (response.results.length > 0) {
                    var feature = response.results.filter(function (result) {
                        return result.graphic.layer === parcelsLayer;
                    })[0].graphic;
                    var oid = feature.attributes['objectid']
                    var index = objectId.indexOf(oid);
                    objectId.splice(index, 1)
                    handler.forEach(x => x.remove());
                    var thisIndex = intersectedParcels.graphics.findIndex(x => x.attributes.objectid === oid)
                    intersectedParcels.remove(intersectedParcels.graphics.items[thisIndex])
                }
            }).then(function () {
                handler.push(layerView.highlight(objectId));
                generateExcelFile(highlightData);
            })
        }
    })

    const div = document.createElement("div");
    div.id = "latlon";
    div.style = "position: inherit; bottom: 5px; left: 140px; width: 130px; height: 15px;";
    view.container.appendChild(div);

    view.on("pointer-move", function (event) {
        const point = view.toMap(event);
        const lat = point.latitude.toFixed(4);
        const lon = point.longitude.toFixed(4);
        const latlon = lat + ", " + lon;
        document.getElementById("latlon").innerHTML = latlon;
    });

    async function clearHighlightData() {
        highlightData.length = 0;
        objectId.length = 0;
    }

    async function removeHighlights() {
        await handler.forEach(x => x.remove());
        handler.length = 0;
    }

    const popupTargetSelectionString = ".esri-component.esri-popup";
    let position = { x: 0, y: 0 };
    const setupInteractJs = () => {
        if (interact.isSet(popupTargetSelectionString)) {
            interact(popupTargetSelectionString).unset();
        }

        position = { x: 0, y: 0 };
        interact(popupTargetSelectionString).draggable({
            listeners: {
                move(event) {
                    const elements = document.querySelectorAll(".esri-popup__pointer");
                    if (elements && elements.length > 0) {
                        elements[0].style.display = "none";
                    }
                    position.x += event.dx;
                    position.y += event.dy;
                    if (position.x) {
                        event.target.style.transform = `translate(${position.x}px, ${position.y}px)`;
                    }
                }
            }
        });
    };

    view.when(() => {
        view.popup.watch("features", (features) => {
            if (features.length === 0) {
                view.popup.dockEnabled = true;
                const elements = document.querySelectorAll(popupTargetSelectionString);
                if (elements && elements.length > 0) {
                    elements[0].style.transform = `translate(0px, 0px)`;
                }
            } else {
                setupInteractJs();
            }
        });
    });
}

async function loadApp() {
    const oauthInfo = initialize(APP_ID, PORTAL_URL);
    let credential = await checkCurrentStatus(oauthInfo);
    if (!credential) {
        credential = await signIn(oauthInfo);
    }
    if (credential) {
        loadMap();
        let user = await fetchUser(PORTAL_URL);
        if (oauthInfo._oAuthCred.userId === 'JTromborg1') {
            oauthInfo._oAuthCred.userId = 'GeoJason';
        } else {
            oauthInfo._oAuthCred.userId
        }
        btnAuth.innerText = `Log Out`;
        welcomeMessage.innerText = `Welcome, ${oauthInfo._oAuthCred.userId}`;
        agent = oauthInfo._oAuthCred.userId
    }
}

loadApp()