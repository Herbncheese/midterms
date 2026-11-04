import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const KALSHI_BASE = 'https://api.elections.kalshi.com/trade-api/v2/events/';
const CIVIC_BASE = 'https://civicapi.org/api/v2';
const CA_SOS_BASE = 'https://api.sos.ca.gov/returns';
const POLY_BASE = 'https://gamma-api.polymarket.com/events';

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

// States with U.S. Senate elections in 2026 (33 Class II + FL & OH special elections)
const SENATE_2026_STATES = new Set([
  'AL', 'AK', 'AR', 'CO', 'DE', 'FL', 'GA', 'ID', 'IL', 'IA', 'KS', 'KY', 'LA',
  'ME', 'MA', 'MI', 'MN', 'MS', 'MT', 'NE', 'NH', 'NJ', 'NM', 'NC', 'OH', 'OK',
  'OR', 'RI', 'SC', 'SD', 'TN', 'TX', 'VA', 'WV', 'WY',
]);

// States with Governor elections in 2026 (36 states)
const GOVERNOR_2026_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'FL', 'GA', 'HI', 'ID', 'IL', 'IA',
  'KS', 'ME', 'MD', 'MA', 'MI', 'MN', 'NE', 'NV', 'NH', 'NM', 'NY', 'OH', 'OK',
  'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'VT', 'WI', 'WY',
]);

const HOUSE_DISTRICTS_COUNT = {
  AL: 7, AK: 1, AZ: 9, AR: 4, CA: 52, CO: 8, CT: 5, DE: 1, DC: 1, FL: 28,
  GA: 14, HI: 2, ID: 2, IL: 17, IN: 9, IA: 4, KS: 4, KY: 6, LA: 6, ME: 2,
  MD: 8, MA: 9, MI: 13, MN: 8, MS: 4, MO: 8, MT: 2, NE: 3, NV: 4, NH: 2,
  NJ: 12, NM: 3, NY: 26, NC: 14, ND: 1, OH: 15, OK: 5, OR: 6, PA: 17, RI: 2,
  SC: 7, SD: 1, TN: 9, TX: 38, UT: 4, VT: 1, VA: 11, WA: 10, WV: 2, WI: 8, WY: 1,
};

const SOS_DOMAINS = {
  AL: 'sos.alabama.gov', AK: 'elections.alaska.gov', AZ: 'azsos.gov', AR: 'sos.arkansas.gov',
  CA: 'electionresults.sos.ca.gov', CO: 'sos.state.co.us', CT: 'portal.ct.gov/sots',
  DE: 'elections.delaware.gov', FL: 'results.elections.myflorida.com', GA: 'results.sos.ga.gov',
  HI: 'elections.hawaii.gov', ID: 'sos.idaho.gov', IL: 'elections.il.gov',
  IN: 'enr.indianavoters.in.gov', IA: 'sos.iowa.gov', KS: 'sos.ks.gov', KY: 'elect.ky.gov',
  LA: 'voterportal.sos.la.gov', ME: 'maine.gov/sos', MD: 'elections.maryland.gov',
  MA: 'electionstats.state.ma.us', MI: 'mielections.us', MN: 'electionresults.sos.mn.gov',
  MS: 'sos.ms.gov', MO: 'sos.mo.gov', MT: 'electionresults.mt.gov',
  NE: 'electionresults.nebraska.gov', NV: 'silverstateelection.nv.gov', NH: 'sos.nh.gov',
  NJ: 'nj.gov/state/elections', NM: 'electionresults.sos.nm.gov', NY: 'elections.ny.gov',
  NC: 'er.ncsbe.gov', ND: 'results.sos.nd.gov', OH: 'liveresults.ohiosos.gov',
  OK: 'results.okelections.gov', OR: 'results.oregonvotes.gov', PA: 'electionreturns.pa.gov',
  RI: 'elections.ri.gov', SC: 'scvotes.gov', SD: 'electionresults.sd.gov',
  TN: 'elections.tn.gov', TX: 'results.texas-election.com', UT: 'electionresults.utah.gov',
  VT: 'electionarchive.vermont.gov', VA: 'results.elections.virginia.gov',
  WA: 'results.vote.wa.gov', WV: 'sos.wv.gov', WI: 'elections.wi.gov', WY: 'sos.wyo.gov',
  DC: 'electionresults.dcboe.org',
};

const KALSHI_STATE_TICKERS = {
  AK: { senate: 'SENATEAK-26' },
  AL: { senate: 'SENATEAL-26', gov: 'GOVPARTYAL-26' },
  AR: { senate: 'SENATEAR-26', gov: 'GOVPARTYAR-26' },
  AZ: { gov: 'GOVPARTYAZ-26' },
  CA: { gov: 'GOVPARTYCA-26' },
  CO: { senate: 'SENATECO-26', gov: 'GOVPARTYCO-26' },
  CT: { gov: 'GOVPARTYCT-26' },
  DE: { senate: 'SENATEDE-26' },
  FL: { gov: 'GOVPARTYFL-26' },
  GA: { senate: 'SENATEGA-26', gov: 'GOVPARTYGA-26' },
  HI: { gov: 'GOVPARTYHI-26' },
  IA: { senate: 'SENATEIA-26', gov: 'GOVPARTYIA-26' },
  ID: { senate: 'SENATEID-26', gov: 'GOVPARTYID-26' },
  IL: { senate: 'SENATEIL-26', gov: 'GOVPARTYIL-26' },
  KS: { senate: 'SENATEKS-26' },
  LA: { senate: 'SENATELA-26' },
  MA: { senate: 'SENATEMA-26', gov: 'GOVPARTYMA-26' },
  MD: { gov: 'GOVPARTYMD-26' },
  ME: { senate: 'SENATEME-26', gov: 'GOVPARTYME-26' },
  MI: { senate: 'SENATEMI-26', gov: 'GOVPARTYMI-26' },
  MN: { senate: 'SENATEMN-26', gov: 'GOVPARTYMN-26' },
  MS: { senate: 'SENATEMS-26' },
  MT: { senate: 'SENATEMT-26' },
  NC: { senate: 'SENATENC-26' },
  ND: { gov: 'GOVPARTYND-26' },
  NE: { senate: 'SENATENE-26', gov: 'GOVPARTYNE-26' },
  NH: { senate: 'SENATENH-26' },
  NJ: { senate: 'SENATENJ-26' },
  NM: { senate: 'SENATENM-26', gov: 'GOVPARTYNM-26' },
  NV: { gov: 'GOVPARTYNV-26' },
  NY: { gov: 'GOVPARTYNY-26' },
  OH: { gov: 'GOVPARTYOH-26' },
  OK: { senate: 'SENATEOK-26', gov: 'GOVPARTYOK-26' },
  OR: { senate: 'SENATEOR-26', gov: 'GOVPARTYOR-26' },
  PA: { gov: 'GOVPARTYPA-26' },
  RI: { senate: 'SENATERI-26', gov: 'GOVPARTYRI-26' },
  SC: { senate: 'SENATESC-26', gov: 'GOVPARTYSC-26' },
  SD: { senate: 'SENATESD-26', gov: 'GOVPARTYSD-26' },
  TN: { senate: 'SENATETN-26', gov: 'GOVPARTYTN-26' },
  TX: { senate: 'SENATETX-26', gov: 'GOVPARTYTX-26' },
  VA: { senate: 'SENATEVA-26' },
  VT: { gov: 'GOVPARTYVT-26' },
  WI: { gov: 'GOVPARTYWI-26' },
  WV: { senate: 'SENATEWV-26' },
  WY: { senate: 'SENATEWY-26', gov: 'GOVPARTYWY-26' },
};

const NATIONAL_KALSHI_TICKERS = {
  house: 'CONTROLH-2026',
  senate: 'CONTROLS-2026',
  ca_gov: 'GOVPARTYCA-26',
};

const CA_SOS_ENDPOINTS = [
  { key: 'gov', path: '/governor', label: 'Governor (Statewide)' },
  { key: 'lt_gov', path: '/lieutenant-governor', label: 'Lieutenant Governor' },
  { key: 'sos', path: '/secretary-of-state', label: 'Secretary of State' },
  { key: 'ag', path: '/attorney-general', label: 'Attorney General' },
  { key: 'ca13', path: '/us-rep/district/13', label: 'U.S. House District 13' },
  { key: 'ca20', path: '/us-rep/district/20', label: 'U.S. House District 20' },
  { key: 'ca22', path: '/us-rep/district/22', label: 'U.S. House District 22' },
  { key: 'ca27', path: '/us-rep/district/27', label: 'U.S. House District 27' },
  { key: 'ca45', path: '/us-rep/district/45', label: 'U.S. House District 45' },
];

const liveCache = {
  fetched_utc: null,
  civic: {
    senate: null,
    governor: null,
    house: null,
    lastSuccessUtc: null,
    status: 'initializing',
    byStateSearch: {},
  },
  caSos: {
    fetched_utc: null,
    races: {},
  },
  kalshi: {
    fetched_utc: null,
    national: {},
    byState: {},
  },
};

function normalizeParty(partyStr) {
  if (!partyStr) return 'Other';
  const p = String(partyStr).trim().toLowerCase();
  if (p === 'dem' || p === 'd' || p.startsWith('democrat')) return 'Dem';
  if (p === 'rep' || p === 'r' || p === 'gop' || p.startsWith('republican')) return 'Rep';
  if (p === 'ind' || p === 'i' || p.startsWith('independent') || p === 'npp') return 'Ind';
  return String(partyStr).trim();
}

async function fetchJsonWithTimeout(url, timeoutMs = 8000) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'midterms-2026-live-tracker/1.0',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

async function updateKalshiMarkets() {
  const out = {
    fetched_utc: new Date().toISOString(),
    kalshi: {},
  };

  for (const [key, ticker] of Object.entries(NATIONAL_KALSHI_TICKERS)) {
    try {
      const e = await fetchJsonWithTimeout(`${KALSHI_BASE}${ticker}?with_nested_markets=true`, 10000);
      const ms = e?.event?.markets || e?.markets || [];
      out.kalshi[key] = {
        ticker,
        markets: ms.map((m) => ({
          name: m.yes_sub_title,
          last: m.last_price_dollars,
          bid: m.yes_bid_dollars,
          ask: m.yes_ask_dollars,
          status: m.status,
          result: m.result,
        })),
      };
    } catch (ex) {
      out.kalshi[key] = { ticker, error: String(ex.message || ex) };
    }
  }

  liveCache.kalshi.fetched_utc = out.fetched_utc;
  liveCache.kalshi.national = out.kalshi;

  try {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(path.join(dataDir, 'markets.json'), JSON.stringify(out, null, 1));
  } catch (err) {
    console.warn('Could not write data/markets.json:', err);
  }
}

async function updateCaSosFeeds() {
  const fetched_utc = new Date().toISOString();
  const races = {};

  await Promise.all(
    CA_SOS_ENDPOINTS.map(async (ep) => {
      const url = `${CA_SOS_BASE}${ep.path}`;
      try {
        const data = await fetchJsonWithTimeout(url, 8000);
        const rawCandidates = Array.isArray(data?.candidates) ? data.candidates : [];
        const candidates = rawCandidates.map((c) => {
          const votes = Number(String(c.Votes || '0').replace(/,/g, '')) || 0;
          const percent = c.Percent != null ? parseFloat(String(c.Percent)) : 0;
          return {
            name: c.Name,
            party: normalizeParty(c.Party),
            rawParty: c.Party,
            votes,
            votesFormatted: c.Votes || '0',
            percent,
            winner: false,
          };
        });
        const totalVotes = candidates.reduce((acc, c) => acc + c.votes, 0);
        const reportingStr = data?.Reporting || '0% reporting';
        const pctMatch = reportingStr.match(/([\d.]+)%/);
        const reportingPct = pctMatch ? parseFloat(pctMatch[1]) : 0;

        races[ep.key] = {
          id: `ca-sos-${ep.key}`,
          title: data?.raceTitle || ep.label,
          office: ep.label,
          chamber: ep.key.startsWith('ca') ? 'house' : ep.key === 'gov' ? 'governor' : 'statewide',
          state: 'CA',
          reportingPct,
          reportingText: reportingStr,
          reportingTime: data?.ReportingTime || null,
          fetchedUtc: fetched_utc,
          totalVotes,
          source: 'CA Secretary of State API',
          sourceUrl: url,
          officialPortal: 'https://electionresults.sos.ca.gov',
          candidates,
        };
      } catch (err) {
        if (!liveCache.caSos.races[ep.key]) {
          races[ep.key] = {
            id: `ca-sos-${ep.key}`,
            title: ep.label,
            office: ep.label,
            chamber: ep.key.startsWith('ca') ? 'house' : ep.key === 'gov' ? 'governor' : 'statewide',
            state: 'CA',
            reportingPct: null,
            reportingText: 'Not yet reported',
            fetchedUtc: fetched_utc,
            totalVotes: 0,
            source: 'CA Secretary of State API',
            sourceUrl: url,
            error: String(err.message || err),
            candidates: [],
          };
        } else {
          races[ep.key] = liveCache.caSos.races[ep.key];
        }
      }
    })
  );

  liveCache.caSos = { fetched_utc, races };
}

async function updateCivicApiNational() {
  const endpoints = [
    { key: 'senate', id: '87528', label: 'U.S. Senate' },
    { key: 'governor', id: '87535', label: 'Governor' },
    { key: 'house', id: '87524', label: 'U.S. House' },
  ];

  let anySuccess = false;
  for (const ep of endpoints) {
    const url = `${CIVIC_BASE}/race/${ep.id}`;
    try {
      const data = await fetchJsonWithTimeout(url, 12000);
      if (data && typeof data === 'object') {
        liveCache.civic[ep.key] = {
          ...data,
          _fetchedUtc: new Date().toISOString(),
          _sourceUrl: url,
        };
        anySuccess = true;
      }
    } catch (err) {
      if (!liveCache.civic[ep.key]) {
        liveCache.civic[ep.key] = {
          _error: String(err.message || err),
          _fetchedUtc: new Date().toISOString(),
          _sourceUrl: url,
        };
      } else {
        liveCache.civic[ep.key]._lastError = String(err.message || err);
      }
    }
  }

  if (anySuccess) {
    liveCache.civic.lastSuccessUtc = new Date().toISOString();
    liveCache.civic.status = 'online';
  } else if (!liveCache.civic.lastSuccessUtc) {
    liveCache.civic.status = 'degraded (upstream HTTP 500/502)';
  }
}

async function getKalshiForState(stateCode) {
  const st = stateCode.toUpperCase();
  const cached = liveCache.kalshi.byState[st];
  if (cached && Date.now() - new Date(cached.fetched_utc).getTime() < 120000) {
    return cached;
  }

  const tickers = KALSHI_STATE_TICKERS[st] || {};
  const events = [];
  const fetched_utc = new Date().toISOString();

  await Promise.all(
    Object.entries(tickers).map(async ([raceType, ticker]) => {
      const url = `${KALSHI_BASE}${ticker}?with_nested_markets=true`;
      try {
        const data = await fetchJsonWithTimeout(url, 7000);
        const ms = data?.event?.markets || data?.markets || [];
        events.push({
          raceType: raceType === 'senate' ? `${st} U.S. Senate` : `${st} Governor`,
          chamber: raceType === 'senate' ? 'senate' : 'governor',
          ticker,
          source: 'Kalshi Trade API v2',
          sourceUrl: url,
          fetchedUtc: fetched_utc,
          markets: ms.map((m) => ({
            name: m.yes_sub_title || m.title,
            last: m.last_price_dollars,
            bid: m.yes_bid_dollars,
            ask: m.yes_ask_dollars,
            status: m.status,
            result: m.result,
          })),
        });
      } catch (err) {
        events.push({
          raceType: raceType === 'senate' ? `${st} U.S. Senate` : `${st} Governor`,
          chamber: raceType === 'senate' ? 'senate' : 'governor',
          ticker,
          source: 'Kalshi Trade API v2',
          sourceUrl: url,
          fetchedUtc: fetched_utc,
          error: String(err.message || err),
          markets: [],
        });
      }
    })
  );

  const result = { fetched_utc, events };
  liveCache.kalshi.byState[st] = result;
  return result;
}

async function getCivicForState(stateCode) {
  const st = stateCode.toUpperCase();
  const races = [];
  const searchUrl = `${CIVIC_BASE}/race/search?province=${st}&startDate=2026-11-03&endDate=2026-11-03&limit=50`;

  for (const [key, officeLabel, raceId] of [
    ['senate', `${STATE_NAMES[st] || st} U.S. Senate`, '87528'],
    ['governor', `${STATE_NAMES[st] || st} Governor`, '87535'],
    ['house', `${STATE_NAMES[st] || st} U.S. House`, '87524'],
  ]) {
    const feed = liveCache.civic[key];
    if (!feed || !feed.region_results) continue;
    const isTestData = Boolean(feed.test_data);

    for (const [regKey, regVal] of Object.entries(feed.region_results)) {
      const normKey = regKey.toUpperCase();
      if (normKey === st || normKey.startsWith(`${st}-`) || normKey.startsWith(`${st}_`)) {
        const cands = Array.isArray(regVal?.candidates)
          ? regVal.candidates.map((c) => ({
              name: c.name,
              party: normalizeParty(c.party),
              rawParty: c.party,
              votes: isTestData ? 0 : Number(c.votes || 0),
              percent: isTestData ? 0 : Number(c.percent || 0),
              winner: isTestData ? false : Boolean(c.winner),
              seats: Number(c.seats || 0),
            }))
          : [];
        races.push({
          id: `civic-${raceId}-${regKey}`,
          electionId: regVal?.election_id || raceId,
          title: regVal?.name && normKey !== st ? `${officeLabel} (${regVal.name})` : officeLabel,
          office: officeLabel,
          chamber: key,
          state: st,
          reportingPct: isTestData ? 0 : Number(regVal?.percent_reporting ?? feed.percent_reporting ?? 0),
          reportingText: isTestData
            ? '0% reporting (civicAPI test_data filtered)'
            : `${Number(regVal?.percent_reporting ?? 0).toFixed(1)}% reporting`,
          fetchedUtc: feed._fetchedUtc || new Date().toISOString(),
          totalVotes: cands.reduce((s, c) => s + c.votes, 0),
          source: 'civicAPI v2',
          sourceUrl: `https://civicapi.org/api/v2/race/${regVal?.election_id || raceId}`,
          testDataFiltered: isTestData,
          candidates: cands,
        });
      }
    }
  }

  const cachedSearch = liveCache.civic.byStateSearch[st];
  const nowMs = Date.now();
  if (!cachedSearch || nowMs - new Date(cachedSearch.fetched_utc).getTime() > 180000) {
    try {
      const searchData = await fetchJsonWithTimeout(searchUrl, 4500);
      const foundRaces = Array.isArray(searchData?.races) ? searchData.races : [];
      liveCache.civic.byStateSearch[st] = {
        fetched_utc: new Date().toISOString(),
        status: 'ok',
        sourceUrl: searchUrl,
        races: foundRaces,
      };
    } catch (err) {
      liveCache.civic.byStateSearch[st] = {
        fetched_utc: new Date().toISOString(),
        status: `unavailable (${err.message || 'timeout'})`,
        sourceUrl: searchUrl,
        races: cachedSearch?.races || [],
      };
    }
  }

  const stateSearchEntry = liveCache.civic.byStateSearch[st];
  if (stateSearchEntry && Array.isArray(stateSearchEntry.races)) {
    for (const r of stateSearchEntry.races) {
      const isTestData = Boolean(r.test_data);
      const raceUrl = `${CIVIC_BASE}/race/${r.id}`;
      if (races.some((existing) => String(existing.electionId) === String(r.id))) continue;
      const cands = Array.isArray(r.candidates)
        ? r.candidates.map((c) => ({
            name: c.name,
            party: normalizeParty(c.party),
            rawParty: c.party,
            votes: isTestData ? 0 : Number(c.votes || 0),
            percent: isTestData ? 0 : Number(c.percent || 0),
            winner: isTestData ? false : Boolean(c.winner),
          }))
        : [];
      races.push({
        id: `civic-search-${r.id}`,
        electionId: r.id,
        title: r.election_name || `${st} Statewide Race`,
        office: r.election_type || 'Statewide',
        chamber: 'statewide',
        state: st,
        reportingPct: isTestData ? 0 : Number(r.percent_reporting || 0),
        reportingText: isTestData
          ? '0% reporting (civicAPI test_data filtered)'
          : `${Number(r.percent_reporting || 0).toFixed(1)}% reporting`,
        fetchedUtc: stateSearchEntry.fetched_utc,
        totalVotes: cands.reduce((s, c) => s + c.votes, 0),
        source: 'civicAPI v2',
        sourceUrl: raceUrl,
        testDataFiltered: isTestData,
        candidates: cands,
      });
    }
  }

  return {
    races,
    searchUrl,
    searchStatus: stateSearchEntry?.status || liveCache.civic.status,
    nationalStatus: liveCache.civic.status,
  };
}

function computeStateLeader(races) {
  for (const r of races) {
    if (!r.candidates || r.candidates.length === 0) continue;
    const winner = r.candidates.find((c) => c.winner);
    if (winner) return { party: winner.party, called: true, race: r.title, candidate: winner.name };
    const totalVotes = r.candidates.reduce((acc, c) => acc + (Number(c.votes) || 0), 0);
    if (totalVotes > 0) {
      const sorted = [...r.candidates].sort((a, b) => (Number(b.votes) || 0) - (Number(a.votes) || 0));
      return { party: sorted[0].party, called: false, race: r.title, candidate: sorted[0].name };
    }
  }
  return null;
}

function buildStateSummaryMap() {
  const map = {};
  for (const [code, name] of Object.entries(STATE_NAMES)) {
    const stateRaces = [];
    if (code === 'CA') {
      for (const r of Object.values(liveCache.caSos.races || {})) {
        stateRaces.push(r);
      }
    }
    for (const [key, label, raceId] of [
      ['governor', 'Governor', '87535'],
      ['senate', 'U.S. Senate', '87528'],
    ]) {
      const feed = liveCache.civic[key];
      const reg = feed?.region_results?.[code.toLowerCase()];
      if (reg && !feed.test_data) {
        const cands = (reg.candidates || []).map((c) => ({
          name: c.name,
          party: normalizeParty(c.party),
          votes: Number(c.votes || 0),
          percent: Number(c.percent || 0),
          winner: Boolean(c.winner),
        }));
        stateRaces.push({
          id: `civic-${raceId}-${code}`,
          title: `${name} ${label}`,
          chamber: key,
          reportingPct: Number(reg.percent_reporting || 0),
          reportingText: `${Number(reg.percent_reporting || 0).toFixed(1)}% reporting`,
          source: 'civicAPI v2',
          sourceUrl: `https://civicapi.org/api/v2/race/${reg.election_id || raceId}`,
          candidates: cands,
        });
      }
    }

    const leader = computeStateLeader(stateRaces);
    map[code] = {
      code,
      name,
      sosDomain: SOS_DOMAINS[code],
      sosUrl: `https://${SOS_DOMAINS[code]}`,
      hasSenate2026: SENATE_2026_STATES.has(code),
      hasGovernor2026: GOVERNOR_2026_STATES.has(code),
      houseDistricts: HOUSE_DISTRICTS_COUNT[code] || 1,
      hasKalshiMarkets: Boolean(KALSHI_STATE_TICKERS[code]),
      kalshiTickers: KALSHI_STATE_TICKERS[code] || {},
      hasOpenJsonFeed: code === 'CA',
      raceCount: stateRaces.length,
      leaderParty: leader?.party || null,
      leaderCalled: Boolean(leader?.called),
      leaderInfo: leader,
    };
  }
  return map;
}

app.get('/api/elections/overview', (_req, res) => {
  const states = buildStateSummaryMap();
  res.json({
    fetched_utc: new Date().toISOString(),
    civicStatus: {
      status: liveCache.civic.status,
      lastSuccessUtc: liveCache.civic.lastSuccessUtc,
      endpoints: [
        `${CIVIC_BASE}/race/87528`,
        `${CIVIC_BASE}/race/87535`,
        `${CIVIC_BASE}/race/87524`,
      ],
    },
    caSos: liveCache.caSos,
    kalshiNational: liveCache.kalshi.national,
    states,
  });
});

app.get('/api/elections/state/:code', async (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  if (!STATE_NAMES[code]) {
    return res.status(404).json({ error: `Unknown state code: ${code}` });
  }

  try {
    const [kalshiState, civicState] = await Promise.all([
      getKalshiForState(code),
      getCivicForState(code),
    ]);

    const races = [];
    const sources = [];
    const sosDomain = SOS_DOMAINS[code];
    const sosUrl = `https://${sosDomain}`;

    if (code === 'CA') {
      if (!liveCache.caSos.fetched_utc) {
        await updateCaSosFeeds();
      }
      for (const r of Object.values(liveCache.caSos.races)) {
        races.push(r);
      }
      sources.push({
        name: 'California Secretary of State Open JSON API',
        shortLabel: 'CA SOS JSON API',
        type: 'Official State SOS JSON Feed',
        url: 'https://api.sos.ca.gov/returns/governor',
        portalUrl: sosUrl,
        status: 'Live (200 OK)',
        detail: 'Direct browser & server JSON returns for Governor, Lt. Governor, SOS, AG, and U.S. House districts (api.sos.ca.gov).',
      });
    } else {
      sources.push({
        name: `${STATE_NAMES[code]} Secretary of State Election Results`,
        shortLabel: `${code} SOS Portal (${sosDomain})`,
        type: 'Official State Election Portal',
        url: sosUrl,
        portalUrl: sosUrl,
        status: 'Official Portal',
        detail: `Official state canvas and precinct reporting portal (${sosDomain}).`,
      });
    }

    for (const r of civicState.races) {
      races.push(r);
    }
    sources.push({
      name: `civicAPI v2 (${STATE_NAMES[code]} Feeds)`,
      shortLabel: `civicAPI v2 (${code})`,
      type: 'Free Public Election API',
      url: civicState.searchUrl,
      portalUrl: 'https://civicapi.org/api-documentation',
      status:
        civicState.races.length > 0
          ? `Live (${civicState.races.length} race feed(s))`
          : `Polled (${civicState.searchStatus})`,
      detail: `Queries ${civicState.searchUrl} plus national Senate (87528), Governor (87535), and House (87524) region_results for ${code}. Attribution: civicapi.org.`,
    });

    const kalshiTickers = KALSHI_STATE_TICKERS[code] || {};
    const tickerList = Object.values(kalshiTickers);
    if (tickerList.length > 0) {
      sources.push({
        name: `Kalshi Elections Trade API (${code})`,
        shortLabel: `Kalshi (${tickerList.join(', ')})`,
        type: 'Prediction Market Feed',
        url: `${KALSHI_BASE}${tickerList[0]}?with_nested_markets=true`,
        portalUrl: 'https://kalshi.com/markets',
        status: `Live (${tickerList.join(', ')})`,
        detail: `Server-proxied Kalshi market odds for ${STATE_NAMES[code]} (${tickerList.join(', ')}).`,
      });
    } else {
      sources.push({
        name: `Kalshi Elections Trade API (${code})`,
        shortLabel: 'Kalshi National Control',
        type: 'Prediction Market Feed',
        url: `${KALSHI_BASE}CONTROLH-2026`,
        portalUrl: 'https://kalshi.com/markets',
        status: 'National Control Markets',
        detail: `No standalone ${code} statewide Senate/Governor ticker active on Kalshi; national House/Senate control tickers tracked.`,
      });
    }

    const stateSlug = STATE_NAMES[code].toLowerCase().replace(/\s+/g, '-');
    const polyUrl = `${POLY_BASE}?slug=${stateSlug}-governor-election-2026`;
    sources.push({
      name: `Polymarket Gamma API (${STATE_NAMES[code]})`,
      shortLabel: `Polymarket (${code})`,
      type: 'Prediction Market Feed',
      url: polyUrl,
      portalUrl: 'https://polymarket.com/elections',
      status: 'Live Public JSON',
      detail: `Queries gamma-api.polymarket.com for ${STATE_NAMES[code]} 2026 statewide and congressional markets.`,
    });

    const leader = computeStateLeader(races);

    res.json({
      code,
      name: STATE_NAMES[code],
      fetched_utc: new Date().toISOString(),
      sosDomain,
      sosUrl,
      hasSenate2026: SENATE_2026_STATES.has(code),
      hasGovernor2026: GOVERNOR_2026_STATES.has(code),
      houseDistricts: HOUSE_DISTRICTS_COUNT[code] || 1,
      leader,
      races,
      markets: kalshiState.events,
      sources,
      civicMeta: {
        searchUrl: civicState.searchUrl,
        status: civicState.searchStatus,
      },
    });
  } catch (err) {
    res.status(500).json({
      code,
      name: STATE_NAMES[code],
      error: String(err.message || err),
    });
  }
});

async function refreshAllBackground() {
  await Promise.allSettled([
    updateKalshiMarkets(),
    updateCaSosFeeds(),
    updateCivicApiNational(),
  ]);
  liveCache.fetched_utc = new Date().toISOString();
}

refreshAllBackground();
setInterval(refreshAllBackground, 90 * 1000);

app.use(express.static(__dirname));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
