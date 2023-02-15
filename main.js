import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import WebMap from '@arcgis/core/WebMap';
import MapView from '@arcgis/core/views/MapView';
import Search from "@arcgis/core/widgets/Search";
import PopupTemplate from "@arcgis/core/PopupTemplate";
import CustomContent from "@arcgis/core/popup/content/CustomContent";
import Graphic from "@arcgis/core/Graphic";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import Color from "@arcgis/core/Color";
import * as geometryEngineAsync from "@arcgis/core/geometry/geometryEngineAsync";
import Print from "@arcgis/core/widgets/Print";
import BasemapGallery from "@arcgis/core/widgets/BasemapGallery";
import LayerList from "@arcgis/core/widgets/LayerList";
import Legend from "@arcgis/core/widgets/Legend";
import Bookmarks from "@arcgis/core/widgets/Bookmarks";
import Sketch from "@arcgis/core/widgets/Sketch";
import Expand from "@arcgis/core/widgets/Expand";
import { setAssetPath } from '@esri/calcite-components/dist/components';
import "@esri/calcite-components/dist/components/calcite-button";
import "@esri/calcite-components/dist/components/calcite-icon";
import "@esri/calcite-components/dist/components/calcite-shell";
import "@esri/calcite-components/dist/components/calcite-shell-panel";
import "@esri/calcite-components/dist/components/calcite-panel";
import "@esri/calcite-components/dist/components/calcite-loader";
import "@esri/calcite-components/dist/components/calcite-action";
import "@esri/calcite-components/dist/components/calcite-action-bar";
import "@esri/calcite-components/dist/components/calcite-label";
import "@esri/calcite-components/dist/calcite/calcite.css";
import interact from 'interactjs';
import { initialize, checkCurrentStatus, signIn, signOut, fetchUser } from '/src/components/oauth.js';
import { generateExcelFile } from '/src/components/generateExcelFile.js';
import symbol from '/src/components/symbology.js';
import './style.css';

setAssetPath(location.href);

const APP_ID = import.meta.env.VITE_APP_ID;
const PORTAL_URL = import.meta.env.VITE_PORTAL_URL;
const WEBMAP_ID = import.meta.env.VITE_WEBMAP_ID;
const PARCEL_URL = import.meta.env.VITE_PARCEL_LAYER;

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
//let projectSite;
let printURL = "https://ihost.tularecounty.ca.gov/ihost/rest/services/RMA/RMATemplatesApp/GPServer/Export%20Web%20Map";
let agent;


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

const customText = new CustomContent({
    creator: (event) => {
        const div = document.createElement("div");
        div.id = "popupSelections";
        div.innerHTML = (
            "<div style='border: 2px solid black; padding: 5px'><div style='text-align: center; background-color: green; padding: 5px; margin: 0; border: 4px solid black; '><img src='./public/County_Seal_200x200.png' 'height'='50' /><br /></div><div style='text-align: center;'><div style='text-align: left;'><div style='text-align: center;'><br />First <i>select</i> a buffer distance, then <i>click</i> <b><svg xmlns='http://www.w3.org/2000/svg' height='16' width='16'><path d='M15.721 4.007a.965.965 0 0 0-.03-1.385l-1.413-1.414a.965.965 0 0 0-1.385-.03L2.841 11.23l-1.756 4.097a.371.371 0 0 0 .488.487L5.67 14.06l8.607-8.609zM2.624 14.276l.554-1.294.74.74zm2.338-.924L3.55 11.937l8.007-8.008 1.414 1.415zm8.716-8.716l-1.414-1.414 1.09-1.09a.306.306 0 0 1 .433 0l.981.98a.306.306 0 0 1 0 .434z'></path></svg> Buffer</b> below.</div><br /></div></div><div style='justify-content: center; display: flex;'>Enter Buffer Value: &nbsp;<input id=bufferDistanceInput type='text' value='300' style='text-align:center; width:75px'>&nbsp;&nbsp;&nbsp;</input><div><label for='unitOfMeasurement'>Units:&nbsp;<select name='units' id='bufferDistanceUnits'><option value='feet'>Feet</option><option value='yards'>Yards</option><option value='miles' >Miles</option><option value='meters' >Meters</option></select></label></div></div></div>"
        );
        return div;
    }
})

const template = new PopupTemplate({
    title: "Selected Parcel: {parcelid}",
    content: [customText],
    actions: [bufferParcel, duplicateParcel, resetParcel]
});

const parcelsLayer = new FeatureLayer({
    url: PARCEL_URL,
    outFields: ["*"],
    popupTemplate: template,
    //definitionExpression: "m2_careof IS NOT NULL"
});

const bufferLayer = new GraphicsLayer();
const selectSite = new GraphicsLayer();
const intersectedParcels = new GraphicsLayer();
const drawOnGraphicsLayer = new GraphicsLayer({
    title: "Markup",
});

async function loadMap() {
    try {

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
                    buttonEnabled: true,
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

        view.map.add(bufferLayer);
        view.map.add(intersectedParcels);
        view.map.add(parcelsLayer);
        view.map.add(selectSite);
        view.map.add(drawOnGraphicsLayer);

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
            try {
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
            } catch (error) {
                console.error(" Error on creating a buffer: " + error);
            }
        });


        view.popup.on('trigger-action', (event) => {
            try {
                if (event.action.id === "userIconToDuplicate") {
                    var thisParcel = view.popup.selectedFeature.attributes.apn;
                    var thisOwner = view.popup.selectedFeature.attributes.m1_owner;
                    var thisCareOf = view.popup.selectedFeature.attributes.m2_careof;
                    var thisAddress = view.popup.selectedFeature.attributes.m3_street;
                    var thisCity = view.popup.selectedFeature.attributes.m4_city;
                    navigator.clipboard.writeText(thisParcel + '\n' + thisOwner + '\n' + thisCareOf + '\n' + thisAddress + '\n' + thisCity);
                }
            } catch (error) {
                console.error("Error on copying selected data to clipboard: " + error);
            }
        });


        view.popup.on('trigger-action', (event) => {
            try {
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
            } catch (error) {
                console.error("Error on reset: " + error);
            }
        });


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

        const sketch = new Sketch({
            view,
            layer: drawOnGraphicsLayer,
        });

        const expandSketch = new Expand({
            view,
            content: sketch
        });

        view.ui.add(expandSketch, "top-right");

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
                    cte[2].ParcelID = thisParcel.attributes.apn;
                    cte[4].Owner = thisParcel.attributes.m1_owner;
                    //cte[2].Supervisor = need to create an intersect to the supervisorial layer. 
                    cte[5].Address = thisParcel.attributes.m3_street;
                    cte[6].CSZ = thisParcel.attributes.m_add_2;
                    cte[8].Agent = agent;
                    // fix title from a drop down 

                } catch (err) {
                    console.log("Error on selecting a parcel: " + err);

                }
            })
        });

        document.querySelector("calcite-loader").active = false;

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
                selectSite.add(selectedParcel)
                bufferLayer.title = "Buffered Parcel";
                selectSite.title = "Selected Parcel";
                await view.goTo({
                    target: bufferedParcel.extent,
                })
                removeHighlights();
                clearHighlightData()
                buildHighlights();
            } catch (error) {
                console.error("Error on buffering a parcel: " + error);
            }
        }


        async function buildHighlights(selectedResults) {
            try {
                const query = parcelsLayer.createQuery();
                query.geometry = bufferedParcel;
                const results = await parcelsLayer.queryFeatures(query);
                selectedResults = await results.features;
                updatehighlights(selectedResults);
            } catch (error) {
                console.error("Error on building highlights: " + error);
            }
        }


        async function updatehighlights(selectedResults) {
            try {
                await view.whenLayerView(parcelsLayer).then(function () {
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
            } catch (error) {
                console.error("Error on updating highlights: " + error);
            }
        }


        async function pushHighlights(layerView) {
            handler.push(layerView.highlight(objectId))
        }

        view.on("click", async function (event) {
            if (event.native.ctrlKey === true) {
                try {
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
                } catch (error) {
                    console.error("Error on adding a parcel: " + error);
                }
            }
        })


        view.on("click", async function (event) {
            if (event.native.altKey === true) {
                try {
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
                } catch (error) {
                    console.error("Error on removing a parcel: " + error);
                }
            }
        })


        async function clearHighlightData() {
            highlightData.length = 0;
            objectId.length = 0;
        }

        async function removeHighlights() {
            await handler.forEach(x => x.remove());
            handler.length = 0;
        }

        const popupTargetSelectionString = ".esri-component.esri-popup";
        // const currentPosition = ""
        let position = { x: 0, y: 0 };
        const setupInteractJs = () => {
            if (interact.isSet(popupTargetSelectionString)) {
                interact(popupTargetSelectionString).unset();
            }

            position = { x: 0, y: 0 };
            interact(popupTargetSelectionString).draggable({
                listeners: {
                    move(event) {
                        // currentPosition = popup.GetPosition();
                        const elements = document.querySelectorAll(".esri-popup__pointer");
                        elements[0].style.display = "none";
                        position.x += event.dx;
                        position.y += event.dy;
                        if (position.x) {
                            //view.popup.dockEnabled = false;
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
        })
    } catch (error) {
        console.error("Error loading application: " + error)
    }
}


async function loadApp() {
    try {
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
            console.log(oauthInfo._oAuthCred.userId)
            agent = oauthInfo._oAuthCred.userId
        }
    } catch (error) {
        console.error("Error authorizing user on the Portal: " + error);
    }
}

loadApp()