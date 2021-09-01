const BASE_URL = "https://www.strava.com/api/v3";
const CALLBACK_URL = window.location.origin;
const CLIENT_ID = "39609";
const SCOPE = "activity:read";
const AUTH_URL = `http://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${CALLBACK_URL}&approval_prompt=auto&scope=${SCOPE}`;
const TOKEN_URL = "https://stravaauth.azurewebsites.net/api/stravaauth";

function hasStravaAccess(): boolean {
  const scope = localStorage.getItem("strava_scope");
  const keys = [
    "strava_access_token",
    "strava_refresh_token",
    "strava_expires_at",
  ];
  return (
    keys.every((k) => localStorage.getItem(k)) &&
    !!scope &&
    scope.includes(SCOPE)
  );
}

function askStravaAccess(): void {
  // FIXME: maybe use an iframe?
  window.location.assign(AUTH_URL);
}

function disconnectStrava(): void {
  localStorage.removeItem("strava_access_token");
  localStorage.removeItem("strava_refresh_token");
  localStorage.removeItem("strava_expires_at");
  localStorage.removeItem("strava_scope");
}

function getAccessToken(): Promise<string> {
  const accessToken = localStorage.getItem("strava_access_token");
  if (accessToken) {
    const expiresAtStr = localStorage.getItem("strava_expires_at");
    const expiresAt = expiresAtStr === null ? null : parseInt(expiresAtStr);
    if (expiresAt && new Date().getTime() / 1000 < expiresAt - 60) {
      return Promise.resolve(accessToken);
    }
    const token = localStorage.getItem("strava_refresh_token");
    if (token) {
      return refreshToken(token);
    }
  }
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("code") && urlParams.get("scope")) {
    // If we have code and scope in the URL that means we are in the
    // middle of auth, so no token available yet and the page will
    // be reloaded when one is ready.
    return Promise.reject(new Error("Authentification à Strava en cours"));
  }
  askStravaAccess();
  return Promise.reject(new Error("This code should never be reached"));
}

function auth(): void {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  const scope = urlParams.get("scope");
  if (code && scope) {
    const request = new Request(
      `${TOKEN_URL}?code=${code}&grant_type=authorization_code`,
      { method: "POST" }
    );
    fetch(request)
      .then((response) => response.json())
      .then((response) => {
        localStorage.setItem("strava_access_token", response.access_token);
        localStorage.setItem("strava_refresh_token", response.refresh_token);
        localStorage.setItem("strava_expires_at", response.expires_at);
        localStorage.setItem("strava_scope", scope);
        // We reload the page to remove the code and scope from the
        // URL so that users don't accidentally share it by copying the URL.
        window.location.replace(CALLBACK_URL);
      });
  }
}
auth();

let pRefreshToken: Promise<string> | null;
function refreshToken(token: string): Promise<string> {
  if (!pRefreshToken) {
    const request = new Request(
      `${TOKEN_URL}?refresh_token=${token}&grant_type=refresh_token`,
      { method: "POST" }
    );
    pRefreshToken = fetch(request)
      .then((response) => response.json())
      .then((response) => {
        localStorage.setItem("strava_access_token", response.access_token);
        localStorage.setItem("strava_refresh_token", response.refresh_token);
        localStorage.setItem("strava_expires_at", response.expires_at);
        return response.access_token;
      })
      .finally(() => (pRefreshToken = null));
  }
  return pRefreshToken;
}

function getHeaders(): Promise<HeadersInit> {
  return getAccessToken().then((token) => ({
    Authorization: `Bearer ${token}`,
  }));
}

function fetchStrava(url: string): Promise<unknown> {
  return getHeaders()
    .then((headers) => fetch(url, { headers }))
    .then((response) => response.json());
}

interface Map {
  summary_polyline: string;
}

interface Route {
  map: Map;
  distance: number;
  elevation_gain: number;
}

interface Activity {
  type: "Ride";
  map: Map;
}

function getRoute(route_id: string): Promise<Route> {
  return fetchStrava(`${BASE_URL}/routes/${route_id}`) as Promise<Route>;
}

function getRoutePolyline(route_id: string): Promise<Polyline> {
  return getRoute(route_id).then((route) =>
    L.PolylineUtil.decode(route.map.summary_polyline)
  );
}

function getRidesPolylines(): Promise<Polyline[]> {
  return getRideActivities().then((activities: Activity[]) =>
    activities.map((activity) =>
      L.PolylineUtil.decode(activity.map.summary_polyline)
    )
  );
}

const PER_PAGE = 200;
async function getRideActivities(page = 1): Promise<Activity[]> {
  const activities = (await fetchStrava(
    `${BASE_URL}/activities?page=${page}&per_page=${PER_PAGE}`
  )) as Activity[];
  if (activities.length === 0) {
    return [];
  }
  const rides = activities.filter(
    (a) => a.type === "Ride" && a.map && a.map.summary_polyline
  );
  const otherActivities = await getRideActivities(page + 1);
  return rides.concat(otherActivities);
}

export default {
  askStravaAccess,
  hasStravaAccess,
  disconnectStrava,
  getRoute,
  getRoutePolyline,
  getRidesPolylines,
};
