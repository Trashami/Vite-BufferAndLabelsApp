import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import Color from "@arcgis/core/Color";

const line = new SimpleLineSymbol();
line.color = new Color([0, 0, 0, .75]);
line.width = 1.75;

const symbol = new SimpleFillSymbol();
symbol.color = new Color([0, 0, 0, .25]);
symbol.outline.color = line.color;
symbol.outline.width = line.width;

const projectSite = new SimpleFillSymbol();
projectSite.color = new Color([5, 120, 50, .2]);
projectSite.outline.color = line.color;

const highlightSymbol = new SimpleFillSymbol();
highlightSymbol.color = new Color([0, 0, 0, .2]);

export default {
    symbol,
    projectSite,
    highlightSymbol
};
