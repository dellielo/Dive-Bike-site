import strava from "./strava";
import "./types";

const STRAVA_ROUTE_URL = "https://www.strava.com/routes/";

function showChallengesDetails(challenges: Challenge[]): void {
  document.getElementById("challenges-detail")!.style.display = "block";
  const distance =
    challenges.reduce((acc, challenge) => acc + challenge.distance, 0) / 1000;
  document.getElementById("challenges-distance")!.textContent = String(
    Math.round(distance)
  );
  const computedDistance = challenges.reduce(
    (acc, challenge) => acc + challenge.computedDistance,
    0
  );
  const coveredDistance = challenges.reduce(
    (acc, challenge) => acc + challenge.coveredDistance,
    0
  );
  const shouldDisplayCoverage =
    distance > 0 &&
    !Number.isNaN(computedDistance) &&
    computedDistance > 0 &&
    !Number.isNaN(coveredDistance);
  if (shouldDisplayCoverage) {
    document.getElementById("challenges-covered")!.textContent = String(
      Math.round((coveredDistance / computedDistance) * 100)
    );
  }
  const coverageDisplay = shouldDisplayCoverage ? "inline" : "none";
  document
    .querySelectorAll("#challenges-detail .strava-coverage")
    .forEach((node) => ((node as HTMLElement).style.display = coverageDisplay));
}

function showGPXDetails(gpx: L.GPX): void{
  document.getElementById("gpx-distance")!.textContent = String(
    Math.round(gpx.get_distance()/ 1000)
  );
}

function showChallengeDetails(challenge: Challenge | null): void {
  if (!challenge) {
    document.getElementById("challenge-detail")!.style.display = "none";
    return;
  }
  document.getElementById("challenge-detail")!.style.display = "block";
  document.getElementById("challenge-title")!.textContent = challenge.name;
  document.getElementById("challenge-distance")!.textContent = String(
    Math.round(challenge.distance / 1000)
  );
  document.getElementById("challenge-elevation")!.textContent = String(
    Math.round(challenge.elevation)
  );
  document
    .getElementById("challenge-blogpost")!
    .setAttribute("href", challenge.cc_link);
  document
    .getElementById("challenge-strava-link")!
    .setAttribute("href", STRAVA_ROUTE_URL + challenge.strava_route_id);
  document
    .getElementById("challenge-gpx")!
    .setAttribute("href", `gpx/${challenge.id}.gpx`);
  if (
    !Number.isNaN(challenge.coveredDistance) &&
    !Number.isNaN(challenge.computedDistance) &&
    challenge.computedDistance > 0
  ) {
    document.getElementById("challenge-covered")!.textContent = String(
      Math.round((challenge.coveredDistance / challenge.computedDistance) * 100)
    );
  }
}

function stravaButtonsManager(): void {
  document.getElementById("strava-auth")!.onclick = strava.askStravaAccess;
  document.getElementById("strava-unauth")!.onclick = () => {
    strava.disconnectStrava();
    refreshStravaDisplays();
  };
}
stravaButtonsManager();

function refreshStravaDisplays(): void {
  const hasStravaAccess = strava.hasStravaAccess();
  const authButton = document.getElementById("strava-auth") as HTMLElement;
  const unauthButton = document.getElementById("strava-unauth") as HTMLElement;
  if (hasStravaAccess) {
    authButton.style.display = "none";
    unauthButton.style.display = "block";
  } else {
    authButton.style.display = "block";
    unauthButton.style.display = "none";
  }
  const stravaCoverageDisplay = hasStravaAccess ? "initial" : "none";
  document
    .querySelectorAll(".strava-coverage")
    .forEach(
      (node) => ((node as HTMLElement).style.display = stravaCoverageDisplay)
    );
}
refreshStravaDisplays();

const yearFilters: { [name: string]: string } = {
  year17: "2017",
  year18: "2018",
  year19: "2019",
  year20: "2020",
};

const yearFilterElements: HTMLInputElement[] = Array.from(
  document.querySelectorAll("#year-filter input[type='checkbox']")
);

function onFilterChanged(callback: () => void): void {
  yearFilterElements.forEach((e) => (e.onchange = callback));
}

function matchFilter(challenge: Challenge): boolean {
  const challengeDate = challenge.id.substring(0, 4);
  return yearFilterElements
    .filter((element) => element.checked)
    .map((element) => yearFilters[element.id])
    .includes(challengeDate);
}

const userTracesElement = document.getElementById(
  "user-traces"
) as HTMLInputElement;

function userTracesEnabled(): boolean {
  return userTracesElement.checked;
}

function onShowUserTracesChanged(callback: () => void): void {
  userTracesElement.onchange = callback;
}

export default {
  onFilterChanged,
  onShowUserTracesChanged,
  matchFilter,
  showChallengesDetails,
  showChallengeDetails,
  showGPXDetails,
  userTracesEnabled,
};
