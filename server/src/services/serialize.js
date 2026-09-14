// Serialize mutations in this single-process demo so event creation cannot race a context change.
let tail = Promise.resolve();
export function serialize(work) {
  const result = tail.then(work);
  tail = result.catch(() => {});
  return result;
}
