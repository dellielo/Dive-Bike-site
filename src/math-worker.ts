import { kdTree } from "kd-tree-javascript";

const ctx: Worker = (self as unknown) as Worker;

onmessage = function (event) {
  const message = event.data;
  const func = message.func;
  if (func === "loadUserPolylines") {
    loadUserPolylines(message.polylines);
    ctx.postMessage({ func });
  } else if (func === "classifySegmentsCoverage") {
    const coverage = classifySegmentsCoverage(message.trackPoints);
    const computedDistance = segmentDistance(message.trackPoints);
    const coveredDistance = coverage.coveredSegments.reduce(
      (acc, segment) => acc + segmentDistance(segment),
      0
    );
    ctx.postMessage({
      func,
      id: message.id,
      result: {
        ...coverage,
        computedDistance,
        coveredDistance,
      },
    });
  }
};

type Point = [number, number];

type Segment = Point[];

interface SegmentsCoverage {
  coveredSegments: Segment[];
  uncoveredSegments: Segment[];
}

interface KdTreePoint {
  x: number;
  y: number;
}

// Equirectangular approximation taken from
// http://www.movable-type.co.uk/scripts/latlong.html
function distanceTo([lat1, lon1]: Point, [lat2, lon2]: Point): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const lambda1 = (lon1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const lambda2 = (lon2 * Math.PI) / 180;

  const x = (lambda2 - lambda1) * Math.cos((phi1 + phi2) / 2);
  const y = phi2 - phi1;
  return Math.sqrt(x * x + y * y) * R;
}

const TOLERANCE = 130;
let userPoints: kdTree<KdTreePoint>;
function loadUserPolylines(polylines: Point[][]): void {
  const points: Point[] = polylines.flatMap((p) =>
    addIntermediaryPoints(p, TOLERANCE)
  );
  userPoints = new kdTree(points.map(toKdTreePoint), kdTreeDistance, [
    "x",
    "y",
  ]);
}

function addIntermediaryPoints(points: Point[], maxDistance: number): Point[] {
  return points.reduce((acc: Point[], point: Point) => {
    if (acc.length === 0) {
      return [point];
    }

    const prevPoint = acc[acc.length - 1];
    const dist = distanceTo(prevPoint, point);
    if (dist < maxDistance) {
      return acc.concat([point]);
    }
    const pointsToAdd = Math.floor(dist / maxDistance);
    const deltaX = (point[0] - prevPoint[0]) / (pointsToAdd + 1);
    const deltaY = (point[1] - prevPoint[1]) / (pointsToAdd + 1);
    const newPoints: Point[] = [[prevPoint[0] + deltaX, prevPoint[1] + deltaY]];
    for (let i = 1; i < pointsToAdd; i++) {
      const lastPoint = newPoints[newPoints.length - 1];
      newPoints.push([lastPoint[0] + deltaX, lastPoint[1] + deltaY]);
    }
    newPoints.push(point);
    return acc.concat(newPoints);
  }, []);
}

function classifySegmentsCoverage(trackPoints: Point[]): SegmentsCoverage {
  interface Acc {
    onTrack: boolean;
    coveredSegments: Segment[];
    uncoveredSegments: Segment[];
  }
  const { coveredSegments, uncoveredSegments } = trackPoints.reduce(
    (acc: Acc | null, point: Point) => {
      const pointOnTrack =
        userPoints.nearest(toKdTreePoint(point), 1, TOLERANCE).length !== 0;
      if (acc === null) {
        return {
          onTrack: pointOnTrack,
          coveredSegments: pointOnTrack ? [[point]] : [],
          uncoveredSegments: pointOnTrack ? [] : [[point]],
        };
      }
      const { onTrack, coveredSegments, uncoveredSegments } = acc;
      if (pointOnTrack) {
        if (!onTrack) {
          uncoveredSegments[uncoveredSegments.length - 1].push(point);
          coveredSegments.push([]);
        }
        coveredSegments[coveredSegments.length - 1].push(point);
      } else {
        if (onTrack) {
          const lastCoveredSegment =
            coveredSegments[coveredSegments.length - 1];
          // If less than 2 points in last covered segment, we don't have
          // a coverage (just a crossing) so discard it
          if (lastCoveredSegment.length < 2) {
            coveredSegments.pop();
            if (uncoveredSegments.length === 0) {
              uncoveredSegments.push([]);
            }
          } else {
            uncoveredSegments.push([
              lastCoveredSegment[lastCoveredSegment.length - 1],
            ]);
          }
        }
        uncoveredSegments[uncoveredSegments.length - 1].push(point);
      }
      return {
        onTrack: pointOnTrack,
        coveredSegments,
        uncoveredSegments,
      };
    },
    null
  ) as Acc;
  return { coveredSegments, uncoveredSegments };
}

function segmentDistance(segmentPoints: Point[]): number {
  return segmentPoints.reduce((acc, point, i, points) => {
    if (i === 0) {
      return 0;
    }
    return acc + distanceTo(point, points[i - 1]);
  }, 0);
}

function toKdTreePoint(point: Point): KdTreePoint {
  return { x: point[0], y: point[1] };
}

function fromKdTreePoint(point: KdTreePoint): Point {
  return [point.x, point.y];
}

function kdTreeDistance(point1: KdTreePoint, point2: KdTreePoint): number {
  return distanceTo(fromKdTreePoint(point1), fromKdTreePoint(point2));
}
