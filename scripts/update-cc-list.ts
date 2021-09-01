const fs = require("fs");
const https = require("https");

interface StravaAuth {
  strava_access_token: string;
}

function readStravaAuth(): Promise<StravaAuth> {
  return new Promise((resolve, reject) => {
    fs.readFile(
      "./scripts/strava-auth.json",
      "utf8",
      (err: any, data: string) => {
        if (err) {
          reject(
            "Could not read strava-auth.json file.\n" +
              "Make sure to create one by taking strava-auth.example.json as " +
              `example.\n${err}`
          );
        } else {
          resolve(JSON.parse(data));
        }
      }
    );
  });
}

async function fetchStrava(url: string): Promise<unknown> {
  const { strava_access_token } = await readStravaAuth();
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        Authorization: `Bearer ${strava_access_token}`,
      },
    };
    https
      .get(url, options, (res: any) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(`Error calling strava. Status code: ${res.statusCode}`);
          return;
        }
        res.setEncoding("utf8");
        let rawData = "";
        res.on("data", (chunk: string) => {
          rawData += chunk;
        });
        res.on("end", () => resolve(JSON.parse(rawData)));
      })
      .on("error", (err: any) => reject(`Error calling strava: ${err}`));
  });
}

interface RouteMap {
  summary_polyline: string;
}

interface Route {
  map: RouteMap;
  distance: number;
  elevation_gain: number;
}

const BASE_URL = "https://www.strava.com/api/v3";

function getRoute(route_id: string): Promise<Route> {
  return fetchStrava(`${BASE_URL}/routes/${route_id}`) as Promise<Route>;
}

interface Challenge {
  id: string;
  name: string;
  distance: number;
  elevation: number;
  cc_link: string;
  strava_route_id: string;
  summary_polyline: string;
}

function readCCList(): Promise<Challenge[]> {
  return new Promise((resolve, reject) => {
    fs.readFile("./src/cc-list.json", "utf8", (err: any, data: string) => {
      if (err) {
        reject(`Could not read cc-list.json file.\n${err}`);
      } else {
        resolve(JSON.parse(data));
      }
    });
  });
}

function writeCCList(challenges: Challenge[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(challenges, null, 2) + "\n";
    fs.writeFile("./src/cc-list.json", data, "utf8", (err: any) => {
      if (err === null) {
        resolve();
      } else {
        reject(`Could not save cc-list.json file.\n${err}`);
      }
    });
  });
}

async function main() {
  const challenges = await readCCList();
  Promise.all(
    challenges.map((challenge) => {
      return getRoute(challenge.strava_route_id).then((route) =>
        Object.assign(challenge, {
          distance: route.distance,
          elevation: route.elevation_gain,
          summary_polyline: route.map.summary_polyline,
        })
      );
    })
  )
    .then(() => writeCCList(challenges))
    .then(() => console.log("cc-list.json updated!"))
    .catch((err) => console.error(err));
}

main();
