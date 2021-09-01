import strava from "./strava";
import panel from "./panel";
import "leaflet";
import "leaflet/dist/leaflet.css";
import "polyline-encoded";
import { FeatureGroup, LeafletKeyboardEvent } from "leaflet";

const map = L.map("map");

const DEFAULT_PATH_OPTIONS = {
  renderer: L.canvas({
    padding: 0.5,
    tolerance: 10,
  }),
};
const USER_TRACE_STYLE = {
  color: "#3388ff",
  weight: 2,
  opacity: 0.75,
  ...DEFAULT_PATH_OPTIONS,
};
const UNFOCUSED_SEGMENT_STYLE = {
  weight: 2,
  opacity: 0.5,
  ...DEFAULT_PATH_OPTIONS,
};
const FOCUSED_SEGMENT_STYLE = {
  weight: 4,
  opacity: 1,
  ...DEFAULT_PATH_OPTIONS,
};
const COVERED_SEGMENT_STYLE = {
  color: "#3388ff",
  ...UNFOCUSED_SEGMENT_STYLE,
};
const UNCOVERED_SEGMENT_STYLE = {
  color: "#ee6352",
  ...UNFOCUSED_SEGMENT_STYLE,
};

const DEFAULT_BOUNDS = L.latLngBounds([
  [49.898, 3.96],
  [46.982, -0.705],
]);

map.fitBounds(DEFAULT_BOUNDS);

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

const finishIcon = L.icon({
  iconUrl: "icons/finish.svg",
  iconSize: [15, 15],
});

interface State {
  challenges: Challenge[];
  challengesLayers: { [index: string]: L.FeatureGroup };
  userTracesLayer: L.FeatureGroup | null;
  focusedChallenge: Challenge | null;
}

const state: State = {
  challenges: [],
  challengesLayers: {},
  userTracesLayer: null,
  focusedChallenge: null,
};

withLoading(loadChallenges());

async function loadChallenges(): Promise<void> {
  state.challenges = (await import("./cc-list.json")) as Challenge[];
  state.challenges.forEach(
    (challenge) =>
      (state.challengesLayers[challenge.id] = buildChallengeLayer(challenge))
  );
  render();
  return loadUserPolylines();
}

async function loadUserPolylines(): Promise<void> {
  if (!strava.hasStravaAccess()) {
    return;
  }
  const userPolylines = await strava.getRidesPolylines();
  state.userTracesLayer = buildUserTracesLayer(userPolylines);
  render();
  return loadChallengesCoverage(userPolylines);
}

async function loadChallengesCoverage(
  userPolylines: Polyline[]
): Promise<void> {
  const mathWorker = await getMathWorker(userPolylines);
  await Promise.all(
    state.challenges.map((challenge) =>
      loadChallengeCoverage(challenge, mathWorker)
    )
  );
}

function loadChallengeCoverage(
  challenge: Challenge,
  mathWorker: Worker
): Promise<void> {
  return new Promise((resolve) => {
    const trackPoints = L.PolylineUtil.decode(challenge.summary_polyline);
    const id = Math.random();
    function eventHandler({ data }: { data: ClassifySegmentsCoverageResult }) {
      if (data.id === id) {
        mathWorker.removeEventListener("message", eventHandler);
        if (state.challengesLayers[challenge.id]) {
          state.challengesLayers[challenge.id].remove();
        }
        const { result } = data;
        challenge.coveredDistance = result.coveredDistance;
        challenge.computedDistance = result.computedDistance;
        state.challengesLayers[challenge.id] = buildChallengeLayer(
          challenge,
          result
        );
        render();
        resolve();
      }
    }
    mathWorker.addEventListener("message", eventHandler);
    mathWorker.postMessage({
      func: "classifySegmentsCoverage",
      id,
      trackPoints,
    });
  });
}

function render(): void {
  Object.values(state.challengesLayers).forEach((layer) => layer.remove());
  const displayedChallenges = state.challenges.filter(panel.matchFilter);
  displayedChallenges.forEach(renderChallenge);
  panel.showChallengesDetails(displayedChallenges);
  panel.showChallengeDetails(state.focusedChallenge);
  if (state.userTracesLayer) {
    state.userTracesLayer.remove();
    if (panel.userTracesEnabled()) {
      state.userTracesLayer.addTo(map);
    }
  }
}

function renderChallenge(challenge: Challenge): void {
  const layer = state.challengesLayers[challenge.id];
  if (layer) {
    const style =
      challenge == state.focusedChallenge
        ? FOCUSED_SEGMENT_STYLE
        : UNFOCUSED_SEGMENT_STYLE;
    layer.setStyle(style);
    layer.addTo(map);
  }
}

function buildChallengeLayer(
  challenge: Challenge,
  coverage: Coverage = {}
): FeatureGroup<unknown> {
  const trackPoints = L.PolylineUtil.decode(challenge.summary_polyline);
  const uncoveredSegments = coverage.uncoveredSegments || [trackPoints];
  const coveredSegments = coverage.coveredSegments || [];
  const uncoveredLayers: L.Layer[] = uncoveredSegments.map((segment) =>
    L.polyline(segment, UNCOVERED_SEGMENT_STYLE)
  );
  const coveredLayers: L.Layer[] = coveredSegments.map((segment) =>
    L.polyline(segment, COVERED_SEGMENT_STYLE)
  );

  const clickHandler = (event: unknown) => {
    L.DomEvent.stopPropagation(event as LeafletKeyboardEvent);
    focusChallenge(challenge);
  };

  const finishMarker: L.Layer = L.marker(trackPoints[trackPoints.length - 1], {
    icon: finishIcon,
  });
  const layers: L.Layer[] = uncoveredLayers
    .concat(coveredLayers)
    .concat([finishMarker]);
  const featureGroup = L.featureGroup(layers);
  featureGroup.on("click", clickHandler);
  return featureGroup;
}

function getMathWorker(userPolylines: Polyline[]): Promise<Worker> {
  return new Promise((resolve) => {
    const mathWorker = new Worker("math-worker.ts");
    function initEventHandler() {
      mathWorker.removeEventListener("message", initEventHandler);
      resolve(mathWorker);
    }
    mathWorker.addEventListener("message", initEventHandler);
    mathWorker.postMessage({
      func: "loadUserPolylines",
      polylines: userPolylines,
    });
  });
}

function buildUserTracesLayer(
  userPolylines: Polyline[]
): FeatureGroup<unknown> {
  return L.featureGroup(
    userPolylines.map((p) => L.polyline(p, USER_TRACE_STYLE))
  );
}

function focusChallenge(challenge: Challenge | null): void {
  state.focusedChallenge = challenge;
  render();
}
map.on("click", () => focusChallenge(null));

panel.onFilterChanged(render);
panel.onShowUserTracesChanged(render);

function withLoading(promise: Promise<unknown>): Promise<unknown> {
  const loadingElt = document.getElementById("loading")!;
  loadingElt.style.display = "block";
  return promise.finally(() => (loadingElt.style.display = "none"));
}
