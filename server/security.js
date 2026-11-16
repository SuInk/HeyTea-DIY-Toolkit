// Fixed upstream budgets: do not forward credentials through redirects.
const upstreamOptions = Object.freeze({
  timeout: 15000,
  maxRedirects: 0,
  maxContentLength: 1024 * 1024,
  maxBodyLength: 256 * 1024,
});
function imageMetadata(file) {
  const b = file?.buffer;
  if (!Buffer.isBuffer(b) || !b.length || b.length > 200 * 1024) return null;
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    return { filename: 'cup.png', mime: 'image/png' };
  }
  if (b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255) {
    return { filename: 'cup.jpg', mime: 'image/jpeg' };
  }
  return null;
}
module.exports = { imageMetadata, upstreamOptions };
