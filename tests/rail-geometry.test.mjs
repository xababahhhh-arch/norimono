import test from 'node:test';
import assert from 'node:assert/strict';
import { railLevels, tracks, port, routePath, validateLevel } from '../games/play/shared/rail-geometry.js';

for (const [i, level] of railLevels.entries()) {
  test(`level ${i + 1}: every route seam and branch connects`, () => {
    assert.equal(validateLevel(level), true);
    for (let j = 1; j < level.route.length; j++) {
      const previous = level.route[j - 1], next = level.route[j];
      assert.deepEqual(port(previous, tracks[previous[2]].to), port(next, tracks[next[2]].from));
    }
    const path = routePath(level.route);
    assert.equal((path.match(/M/g) || []).length, 1, 'train route must not jump to a new subpath');
    assert.equal((path.match(/[LQ]/g) || []).length, level.route.length);
    assert.equal((path.match(/Q/g) || []).length, level.route.filter(cell => ['curve', 'up'].includes(cell[2])).length);
  });
}
test('a reversed curve cannot pass as a completed route', () => {
  const level = structuredClone(railLevels[1]);
  level.route[1][2] = 'up';
  assert.equal(validateLevel(level), false);
});
test('a separated tile cannot pass as a completed route', () => {
  const level = structuredClone(railLevels[0]);
  level.route[2][0] += 1;
  assert.equal(validateLevel(level), false);
});
test('a floating branch is rejected', () => {
  const level = structuredClone(railLevels[2]);
  level.siding = [];
  assert.equal(validateLevel(level), false);
});
test('an unterminated siding is rejected', () => {
  const level = structuredClone(railLevels[2]);
  level.buffers = [];
  assert.equal(validateLevel(level), false);
});
