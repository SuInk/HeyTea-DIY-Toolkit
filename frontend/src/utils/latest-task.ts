/** Tokens prevent an older async result from committing over newer editor state.
 * Work on an offscreen canvas; copy pixels and Blob together only if isCurrent().
 */
export function createLatestTask() {
  let revision = 0;
  return {
    begin() {
      const mine = ++revision;
      return { isCurrent: () => mine === revision };
    },
    invalidate() {
      revision += 1;
    },
  };
}
