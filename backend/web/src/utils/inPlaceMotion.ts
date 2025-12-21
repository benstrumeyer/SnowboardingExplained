/**
 * Remove global translation from skeleton vertices to show in-place motion
 * This centers the skeleton around its pelvis (first joint)
 */
export function removeGlobalTranslation(vertices: number[][]): number[][] {
  if (vertices.length === 0) {
    return vertices;
  }

  // Use pelvis (first vertex) as reference point
  const [pelvisX, pelvisY, pelvisZ] = vertices[0];

  // Translate all vertices so pelvis is at origin
  return vertices.map(([x, y, z]) => [
    x - pelvisX,
    y - pelvisY,
    z - pelvisZ,
  ]);
}
