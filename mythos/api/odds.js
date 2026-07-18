import { list, put, del } from '@vercel/blob';

// Each vote is its own blob whose pathname encodes the three percentages:
//   votes/<s1>-<s2>-<s3>-<random suffix>
// so concurrent submissions never contend, and the tally is just a listing.
// No IPs, cookies, or identifiers are stored — only the three numbers.
const PREFIX = 'votes/';
const PATH_RE = /^votes\/(\d{1,3})-(\d{1,3})-(\d{1,3})-/;

function valid(odds) {
  return (
    Array.isArray(odds) &&
    odds.length === 3 &&
    odds.every((v) => Number.isInteger(v) && v >= 0 && v <= 100) &&
    odds[0] + odds[1] + odds[2] === 100
  );
}

async function tally() {
  let cursor;
  let count = 0;
  const sums = [0, 0, 0];
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    for (const b of page.blobs) {
      const m = PATH_RE.exec(b.pathname);
      if (!m) continue;
      const v = [+m[1], +m[2], +m[3]];
      if (v[0] + v[1] + v[2] !== 100) continue;
      count++;
      sums[0] += v[0];
      sums[1] += v[1];
      sums[2] += v[2];
    }
    cursor = page.cursor;
  } while (cursor);
  return {
    count,
    avg: count ? sums.map((s) => Math.round((10 * s) / count) / 10) : null,
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
      return res.json(await tally());
    }
    if (req.method === 'POST') {
      const { odds, prev } = req.body || {};
      if (!valid(odds)) {
        return res
          .status(400)
          .json({ error: 'odds must be three integers 0-100 summing to 100' });
      }
      // Re-vote: the client sends its previous numbers. Deleting any one blob
      // holding the same value keeps the aggregate identical to replacing
      // the caller's own earlier vote.
      if (valid(prev)) {
        const old = await list({
          prefix: `${PREFIX}${prev[0]}-${prev[1]}-${prev[2]}-`,
          limit: 1,
        });
        if (old.blobs.length) await del(old.blobs[0].url);
      }
      await put(`${PREFIX}${odds[0]}-${odds[1]}-${odds[2]}`, '1', {
        access: 'private',
        addRandomSuffix: true,
        contentType: 'text/plain',
      });
      res.setHeader('Cache-Control', 'no-store');
      return res.json(await tally());
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'storage unavailable' });
  }
}
