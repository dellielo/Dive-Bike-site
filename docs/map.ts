// L.Icon.Default.imagePath = '.';
// // OR
// // delete L.Icon.Default.prototype._getIconUrl;

// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
//   iconUrl: require('leaflet/dist/images/marker-icon.png'),
//   shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
// });


import "leaflet";
// import "leaflet/dist/leaflet.css";
import "leaflet-gpx";
import "polyline-encoded";
import { FeatureGroup, LeafletKeyboardEvent } from "leaflet";
// import * as L from 'leaflet';
// import * as Lgpx from 'leaflet-gpx';

const map = L.map("map") //.setView([45.505, -0.09], 13);



// const DEFAULT_PATH_OPTIONS = {
//   renderer: L.canvas({
//     padding: 0.5,
//     tolerance: 10,
//   }),
// };
// const USER_TRACE_STYLE = {
//   color: "#3388ff",
//   weight: 2,
//   opacity: 0.75,
//   ...DEFAULT_PATH_OPTIONS,
// };
// const UNFOCUSED_SEGMENT_STYLE = {
//   weight: 2,
//   opacity: 0.5,
//   ...DEFAULT_PATH_OPTIONS,
// };
// const FOCUSED_SEGMENT_STYLE = {
//   weight: 4,
//   opacity: 1,
//   ...DEFAULT_PATH_OPTIONS,
// };
// const COVERED_SEGMENT_STYLE = {
//   color: "#3388ff",
//   ...UNFOCUSED_SEGMENT_STYLE,
// };
// const UNCOVERED_SEGMENT_STYLE = {
//   color: "#ee6352",
//   ...UNFOCUSED_SEGMENT_STYLE,
// };

// // const DEFAULT_BOUNDS = L.latLngBounds([
// //   [49.898, 3.96],
// //   [46.982, -0.705],
// // ]);

// // map.fitBounds(DEFAULT_BOUNDS);


// const TILES_PATTERN = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
// const ATTRIBUTION = "© <a href='https://www.openstreetmap.org'>OpenStreetMap</a> contributors";
const TILES_PATTERN =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";
const ATTRIBUTION =
  "© <a href='https://www.openstreetmap.org'>OpenStreetMap</a> contributors, © <a href='https://carto.com/attribution'>CARTO</a>";
const tileLayer = L.tileLayer(TILES_PATTERN, {
  maxZoom: 18,
  attribution: ATTRIBUTION,
});
tileLayer.addTo(map);

// const finishIcon = L.icon({
//   iconUrl: "icons/finish.svg",
//   iconSize: [15, 15],
// });

var gpx_url = 'gpx/projet.gpx'; // URL to your GPX file or the GPX itself
var gpx  = new L.GPX(gpx_url, {
  async: true,
  marker_options: {
    startIconUrl: 'icons/pin-icon-start.png',
    endIconUrl: 'icons/pin-icon-end.png',
    shadowUrl: 'icons/pin-shadow.png',
    iconSize: [22, 30],
    shadowSize: [25, 25],
    iconAnchor: [11, 30],
    shadowAnchor: [11, 31],
  },
  polyline_options: {
    color: '#017c81ff',
    opacity: 0.5,
    weight: 5,
    lineCap: 'round'
  }
}).on('loaded', function(e) {
  map.fitBounds(e.target.getBounds());
}).addTo(map);



// function focusChallenge(challenge: Challenge | null): void {
//     // state.focusedChallenge = challenge;
//     // render();
//   }
//   map.on("click", () => focusChallenge(null));
  
 
  
//   function withLoading(promise: Promise<unknown>): Promise<unknown> {
//     const loadingElt = document.getElementById("map")!;
//     loadingElt.style.display = "block";
//     return promise.finally(() => (loadingElt.style.display = "none"));
//   }