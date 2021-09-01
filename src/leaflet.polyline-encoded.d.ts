declare namespace L {
  namespace PolylineUtil {
    type Point = [number, number];
    export function decode(data: string): Point[];
  }
}
