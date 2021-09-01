interface Challenge {
  id: string;
  name: string;
  distance: number;
  elevation: number;
  cc_link: string;
  strava_route_id: string;
  summary_polyline: string;
  computedDistance: number;
  coveredDistance: number;
}

type Point = [number, number];

type Polyline = Point[];

interface Coverage {
  uncoveredSegments?: Polyline[];
  coveredSegments?: Polyline[];
}

interface ClassifySegmentsCoverageRequest {
  func: "classifySegmentsCoverage";
  id: number;
  trackPoints: Point[];
}

interface ClassifySegmentsCoverageResult {
  func: "classifySegmentsCoverage";
  id: number;
  result: {
    uncoveredSegments: Polyline[];
    coveredSegments: Polyline[];
    computedDistance: number;
    coveredDistance: number;
  };
}
