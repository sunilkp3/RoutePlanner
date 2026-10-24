// Builds the static guide, line, route and policy pages from the station,
// adjacency and timetable data in script.js, so the pages always agree with
// the route finder. Run: node tools/build-pages.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'script.js'), 'utf8');

// Pull a top-level `const NAME = ...;` or `function name(...) {...}` out of
// script.js by brace matching; the rest of the file needs a browser.
function extract(name) {
  const start = source.search(new RegExp(`^(const ${name} =|function ${name}\\()`, 'm'));
  if (start < 0) throw new Error(`${name} not found in script.js`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`${name} is not closed`);
}

const names = ['STATIONS', 'ADJACENCY', 'BMRC_TIMETABLES', 'getDistanceInKm', 'getLineForSegment', 'getPlatformDetails', 'findShortestPath'];
const { STATIONS, BMRC_TIMETABLES, getDistanceInKm, getPlatformDetails, findShortestPath } =
  new Function(`${names.map(extract).join('\n')}\nreturn { ${names.join(', ')} };`)();

const SITE = 'https://blrmetro.com';
const BUILT = '2026-10-24';
const PUB = 'ca-pub-1784952394485897';
const MAJESTIC = 'Nadaprabhu Kempegowda (Majestic)';
const RV_ROAD = 'Rashtreeya Vidyalaya Road';

const LINES = {
  'Purple Line': { slug: 'purple-line', from: 'Challaghatta', to: 'Whitefield (Kadugodi)', keys: ['toWhitefield', 'toChallaghatta'], cls: 'purple' },
  'Green Line': { slug: 'green-line', from: 'Madavara', to: 'Silk Institute', keys: ['toSilkInstitute', 'toMadavara'], cls: 'green' },
  'Yellow Line': { slug: 'yellow-line', from: RV_ROAD, to: 'Delta electronics Bommasandra', keys: ['toBommasandra', 'toRvRoad'], cls: 'yellow' }
};
const DAYS = [['monday', 'Monday'], ['weekday', 'Tuesday to Friday'], ['saturday', 'Saturday'], ['sunday', 'Sunday']];
// BMRCL distance slabs from the February 2025 fare revision.
const FARE_SLABS = [[2, 10], [4, 20], [6, 30], [8, 40], [10, 50], [15, 60], [20, 70], [25, 80], [Infinity, 90]];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clock = mins => {
  const m = Math.round(mins) % 1440;
  const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0');
  return `${h % 12 || 12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
};
const lineOf = (a, b) => getPlatformDetails(a, b).line;
const fareFor = km => FARE_SLABS.find(([max]) => km <= max)[1];
const pathKm = path => path.slice(1).reduce((km, s, i) => km + getDistanceInKm(STATIONS[path[i]].lat, STATIONS[path[i]].lng, STATIONS[s].lat, STATIONS[s].lng), 0);
const lineStations = line => findShortestPath(LINES[line].from, LINES[line].to);

// Split a station path into legs that each stay on one line.
function legs(path) {
  const out = [];
  for (let i = 0; i < path.length - 1; i++) {
    const line = lineOf(path[i], path[i + 1]);
    const last = out[out.length - 1];
    if (last && last.line === line) last.stations.push(path[i + 1]);
    else out.push({ line, board: getPlatformDetails(path[i], path[i + 1]), stations: [path[i], path[i + 1]] });
  }
  return out;
}

function serviceSummary(line, key, day) {
  const bands = BMRC_TIMETABLES[line][day][key];
  return {
    first: bands[0][0],
    last: bands[bands.length - 1][1],
    best: Math.min(...bands.map(b => b[2])),
    worst: Math.max(...bands.map(b => b[2])),
    bands
  };
}

const NAV = [['index.html', 'Route Finder'], ['guides.html', 'Guides'], ['namma-metro-timings.html', 'Timings'], ['namma-metro-fares-tickets.html', 'Fares & Tickets'], ['about.html', 'About']];

function page({ file, title, description, h1, lede, body, type = 'article', schema = [] }) {
  const url = `${SITE}/${file === 'index.html' ? '' : file}`;
  const crumbs = { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` }, { '@type': 'ListItem', position: 2, name: h1, item: url }] };
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@graph': [crumbs, ...schema] });
  return `<!DOCTYPE html>
<html lang="en-IN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="robots" content="index, follow" />
  <meta name="google-adsense-account" content="${PUB}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="${type}" />
  <meta property="og:site_name" content="Namma Metro Navigator" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${esc(h1)}" />
  <meta property="og:description" content="${esc(description)}" />
  <link rel="icon" href="favicon.png" type="image/png" />
  <link rel="stylesheet" href="content.css" />
  <script type="application/ld+json">${ld}</script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-EG4V1NRZXD"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-EG4V1NRZXD');gtag('config','G-P87TF8NWY2');</script>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUB}" crossorigin="anonymous"></script>
</head>
<body>
<header class="site-header">
  <a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">M</span>Namma Metro Navigator</a>
  <nav aria-label="Main">${NAV.map(([href, label]) => `<a href="${href}"${href === file ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
</header>
<main>
  <article>
    <h1>${esc(h1)}</h1>
    ${lede ? `<p class="lede">${lede}</p>` : ''}
    <p class="updated">Updated ${BUILT} · Independent guide, not an official BMRCL page</p>
${body}
  </article>
</main>
<footer class="site-footer">
  <nav aria-label="Site information"><a href="about.html">About</a><a href="contact.html">Contact</a><a href="privacy.html">Privacy Policy</a><a href="terms.html">Terms &amp; Disclaimer</a><a href="guides.html">All guides</a></nav>
  <p>Timetables, fares and platforms are estimates for planning. For official information visit <a href="https://www.bmrc.co.in/" target="_blank" rel="noopener noreferrer">bmrc.co.in</a>.</p>
  <p>&copy; 2026 Namma Metro Navigator</p>
</footer>
</body>
</html>
`;
}

const lineBadge = line => `<span class="badge ${LINES[line].cls}">${line}</span>`;
const stationList = stations => `<ol class="stops">${stations.map(s => `<li>${esc(s)}${s === MAJESTIC || s === RV_ROAD ? ' <span class="tag">Interchange</span>' : ''}</li>`).join('')}</ol>`;
const faq = items => ({ '@type': 'FAQPage', mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) });
const faqHtml = items => `<section><h2>Frequently asked questions</h2>${items.map(([q, a]) => `<h3>${esc(q)}</h3><p>${a}</p>`).join('')}</section>`;

function timingTable(line) {
  const { keys } = LINES[line];
  const rows = DAYS.flatMap(([day, label]) => keys.map(key => {
    const s = serviceSummary(line, key, day);
    const dir = getDirectionLabel(line, key);
    return `<tr><td>${label}</td><td>${dir}</td><td>${clock(s.first)}</td><td>${clock(s.last)}</td><td>${s.best}–${s.worst} min</td></tr>`;
  }));
  return `<div class="table-wrap"><table><thead><tr><th>Day</th><th>Towards</th><th>First train</th><th>Last train</th><th>Gap between trains</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

function getDirectionLabel(line, key) {
  const { from, to, keys } = LINES[line];
  return key === keys[0] ? to : from;
}

function bandDetails(line) {
  const { keys } = LINES[line];
  return keys.map(key => {
    const s = serviceSummary(line, key, 'weekday');
    return `<details><summary>Tuesday–Friday frequency towards ${esc(getDirectionLabel(line, key))}</summary><ul>${s.bands.map(([a, b, f]) => `<li>${clock(a)} – ${clock(b)}: a train about every ${f} minutes</li>`).join('')}</ul></details>`;
  }).join('');
}

// ---------- Line pages ----------
const LINE_COPY = {
  'Purple Line': {
    intro: `The Purple Line is Namma Metro's east–west spine. It runs from Challaghatta, past Kengeri on the Mysuru Road side, through the city centre at Majestic, Vidhana Soudha, Cubbon Park and MG Road, and out through Indiranagar and K. R. Pura to Whitefield (Kadugodi) in the IT corridor.`,
    who: `It carries the heaviest office crowds in Bengaluru. Commuters to the Whitefield, Hoodi, Kundalahalli and ITPL tech parks use the eastern half, while the western half serves Rajarajeshwari Nagar, Vijayanagar and the Mysuru Road bus terminals. K. R. Pura links to the railway station there, and Krantivira Sangolli Rayanna station sits next to KSR Bengaluru City railway station.`,
    tips: [
      `At Majestic, the Purple and Green Lines stop on different levels. Follow the purple signs, not the crowd.`,
      `Between 8 and 10:30 AM, trains towards Whitefield are very full from Majestic to Baiyappanahalli. If you can, board one station earlier in the opposite direction or travel before 8 AM.`,
      `For the ITPL campus, Pattandur Agrahara and Kadugodi Tree Park are usually closer than the Whitefield (Kadugodi) terminal. Check your exact gate on the route finder.`
    ]
  },
  'Green Line': {
    intro: `The Green Line runs north–south from Madavara, beyond Nagasandra on Tumakuru Road, through Peenya, Yeshwanthpur, Rajajinagar and Majestic, then south through Chickpet, K. R. Market, Lalbagh, Jayanagar and Banashankari to Silk Institute on Kanakapura Road.`,
    who: `It is the line for the Peenya industrial area, Yeshwanthpur railway station, the old-city markets around Chickpet and K. R. Market, and the residential south: Jayanagar, J. P. Nagar and Banashankari. At Rashtreeya Vidyalaya Road (RV Road) it meets the Yellow Line to Electronic City.`,
    tips: [
      `Change at Majestic for the Purple Line, and at RV Road for the Yellow Line. You don't need to exit the paid area at either interchange.`,
      `Yeshwanthpur metro station is a short walk from Yeshwanthpur railway station. Allow ten minutes with luggage.`,
      `On weekends, Chickpet and K. R. Market get very crowded around the markets. Keep your bag in front of you.`
    ]
  },
  'Yellow Line': {
    intro: `The Yellow Line runs south-east from Rashtreeya Vidyalaya Road (RV Road), past Ragigudda, Jayadeva Hospital, BTM Layout and Central Silk Board, down Hosur Road through Bommanahalli, Electronic City and the Hebbagodi industrial belt to Delta Electronics Bommasandra.`,
    who: `It is the metro option for the Electronic City and Hosur Road tech corridor. Before it opened, that trip meant crawling through the Silk Board junction by road. Office commuters from Jayanagar, BTM and the Green Line change trains at RV Road.`,
    tips: [
      `Trains run less often than on the Purple and Green Lines, especially early in the morning and late at night. Check the frequency table before you leave.`,
      `For the Infosys campus, Infosys Foundation Konappana Agrahara station is usually closer than Electronic City station.`,
      `Central Silk Board station lets you skip the junction on foot. Use the marked exits for the Outer Ring Road side.`
    ]
  }
};

const pages = [];

for (const [line, meta] of Object.entries(LINES)) {
  const stations = lineStations(line);
  const km = pathKm(stations);
  const copy = LINE_COPY[line];
  const weekday = meta.keys.map(k => serviceSummary(line, k, 'weekday'));
  const others = Object.keys(LINES).filter(l => l !== line);
  const qa = [
    [`How many stations are on the Namma Metro ${line}?`, `This guide lists ${stations.length} stations on the ${line}, from ${meta.from} to ${meta.to}.`],
    [`What time does the first ${line} train start?`, `On Tuesday to Friday, the first ${line} train leaves the end of the line at about ${clock(Math.min(...weekday.map(s => s.first)))}. Monday and weekend start times are different. The timings table above lists every day.`],
    [`Where can I change from the ${line} to other lines?`, line === 'Yellow Line' ? `The Yellow Line meets the Green Line at Rashtreeya Vidyalaya Road (RV Road).` : line === 'Green Line' ? `Change at Majestic for the Purple Line and at Rashtreeya Vidyalaya Road (RV Road) for the Yellow Line.` : `Change at Majestic (Nadaprabhu Kempegowda station) for the Green Line. You can reach the Yellow Line by taking the Green Line south to RV Road.`]
  ];
  pages.push({
    file: `${meta.slug}.html`,
    title: `Namma Metro ${line}: Stations, Timings & Interchanges | Bengaluru`,
    description: `All ${stations.length} stations on Bengaluru's ${line} from ${meta.from} to ${meta.to}, with first and last train times, frequency, interchanges and travel tips.`,
    h1: `Namma Metro ${line}: stations, timings and tips`,
    lede: copy.intro,
    schema: [faq(qa)],
    body: `
    <div class="stats"><div><strong>${stations.length}</strong><span>stations</span></div><div><strong>~${Math.round(km)} km</strong><span>end to end (straight-line between stations)</span></div><div><strong>${clock(Math.min(...weekday.map(s => s.first)))}</strong><span>first train, Tue–Fri</span></div><div><strong>${Math.min(...weekday.map(s => s.best))} min</strong><span>shortest gap at peak</span></div></div>
    <section><h2>Who uses the ${line}</h2><p>${copy.who}</p></section>
    <section><h2>First and last trains</h2><p>These times are when trains leave the end of the line. Stations in the middle see the first train a little later and the last train a little later too. BMRCL timetable data for this line was last updated ${BMRC_TIMETABLES[line].updated}.</p>${timingTable(line)}${bandDetails(line)}</section>
    <section><h2>All ${line} stations in order</h2><p>Listed from ${esc(meta.from)} to ${esc(meta.to)}. To travel the other way, board the platform marked towards ${esc(meta.from)}.</p>${stationList(stations)}</section>
    <section><h2>Tips for riding the ${line}</h2><ul>${copy.tips.map(t => `<li>${t}</li>`).join('')}</ul></section>
    <section><h2>Other lines</h2><p>${others.map(l => `<a href="${LINES[l].slug}.html">${l}</a>`).join(' · ')} · <a href="namma-metro-timings.html">All timings</a> · <a href="index.html">Plan a route</a></p></section>
    ${faqHtml(qa)}`
  });
}

// ---------- Route pages ----------
const ROUTES = [
  {
    file: 'majestic-to-whitefield-metro.html', from: MAJESTIC, to: 'Whitefield (Kadugodi)', short: ['Majestic', 'Whitefield'],
    notes: [
      `This is a single-train trip on the Purple Line. Board at Majestic on the Purple Line level, on the platform signed towards Whitefield (Kadugodi), and stay on until the last stop.`,
      `Many people take this trip from KSR Bengaluru City railway station or the Kempegowda bus station to the Whitefield tech parks. On the way the train stops at MG Road, Indiranagar, K. R. Pura and the ITPL area. Leave at Pattandur Agrahara or Kadugodi Tree Park if your office is closer to those, rather than riding to the terminal.`,
      `Weekday mornings towards Whitefield are among the most crowded trips on the network. If you travel before 8 AM you are much more likely to get a seat.`
    ]
  },
  {
    file: 'jayanagar-to-electronic-city-metro.html', from: 'Jayanagar', to: 'Electronic City', short: ['Jayanagar', 'Electronic City'],
    notes: [
      `This trip needs one change. Take the Green Line one stop south to Rashtreeya Vidyalaya Road (RV Road), then change to the Yellow Line towards Delta Electronics Bommasandra.`,
      `The Yellow Line passes BTM Layout and Central Silk Board, so you skip the Silk Board junction that makes this trip slow by road. For the Infosys campus, stay on one more stop to Infosys Foundation Konappana Agrahara.`,
      `Yellow Line trains run less often than Green Line trains. If you arrive at RV Road just after a Yellow Line train has left, expect a longer wait than usual, especially early in the morning.`
    ]
  },
  {
    file: 'rv-road-to-bommasandra-metro.html', from: RV_ROAD, to: 'Delta electronics Bommasandra', short: ['RV Road', 'Bommasandra'],
    notes: [
      `This is the full length of the Yellow Line. You board at the start of the line, so every train runs all the way to Bommasandra and you will usually get a seat.`,
      `If you are coming from the Green Line (Jayanagar, Banashankari or Majestic), you change at RV Road without leaving the paid area. Follow the yellow signs to the Yellow Line platform.`,
      `The Hosur Road stations, including Electronic City, Hebbagodi and Bommasandra, serve the large industrial and office campuses. Many of them run shuttles from the station. Check with your employer.`
    ]
  },
  {
    file: 'indiranagar-to-majestic-metro.html', from: 'Indiranagar', to: MAJESTIC, short: ['Indiranagar', 'Majestic'],
    notes: [
      `This is a direct Purple Line trip west. At Indiranagar, board the platform signed towards Challaghatta and leave at Majestic (Nadaprabhu Kempegowda station).`,
      `At Majestic you can change to the Green Line for Yeshwanthpur, Rajajinagar, Chickpet or the south of the city. You can also walk to KSR Bengaluru City railway station and the Kempegowda bus station.`,
      `On the way the train stops at MG Road, Cubbon Park and Vidhana Soudha. That makes this the quickest way from Indiranagar into the central business district.`
    ]
  },
  {
    file: 'kengeri-to-mg-road-metro.html', from: 'Kengeri', to: 'MG Road', short: ['Kengeri', 'MG Road'],
    notes: [
      `This is a direct Purple Line trip east, so you don't change trains. At Kengeri, board the platform signed towards Whitefield (Kadugodi) and leave at MG Road.`,
      `The train runs along Mysuru Road through Rajarajeshwari Nagar and Vijayanagar to Majestic, then through Vidhana Soudha and Cubbon Park to MG Road. It is one of the longest single-line trips that commuters make every day.`,
      `If you are coming from the Kengeri bus terminal, Kengeri Bus Terminal station is one stop closer to the city and saves a few minutes.`
    ]
  },
  {
    file: 'silk-institute-to-cubbon-park-metro.html', from: 'Silk Institute', to: 'Cubbon Park', short: ['Silk Institute', 'Cubbon Park'],
    notes: [
      `This trip needs one change. Take the Green Line north from Silk Institute towards Madavara, change at Majestic to the Purple Line towards Whitefield (Kadugodi), and leave at Cubbon Park.`,
      `The Green Line part runs through Banashankari, Jayanagar, Lalbagh and K. R. Market. At Majestic, follow the purple signs to the Purple Line level. You stay inside the paid area.`,
      `Cubbon Park station serves the park itself, the High Court and the offices around Kasturba Road. For MG Road shopping, stay on one more stop.`
    ]
  }
];

for (const r of ROUTES) {
  const path = findShortestPath(r.from, r.to);
  const parts = legs(path);
  const stops = path.length - 1;
  const km = pathKm(path);
  const changes = parts.length - 1;
  const minutes = Math.round(stops * 2.5 + changes * 5);
  const fare = fareFor(km);
  const [a, b] = r.short;
  const firstLeg = parts[0];
  const firstKey = LINES[firstLeg.line].keys.find(k => firstLeg.board.direction.includes(getDirectionLabel(firstLeg.line, k)));
  const svc = firstKey && serviceSummary(firstLeg.line, firstKey, 'weekday');
  const steps = parts.map((leg, i) => `<li><strong>${i === 0 ? 'Board' : 'Change'} at ${esc(leg.stations[0])}</strong>: take the ${lineBadge(leg.line)} ${esc(leg.board.direction.replace('Towards', 'towards'))} from ${esc(leg.board.platform)}. Ride ${leg.stations.length - 1} stop${leg.stations.length > 2 ? 's' : ''} to ${esc(leg.stations[leg.stations.length - 1])}.</li>`).join('');
  const reverse = ROUTES.filter(o => o !== r).map(o => `<a href="${o.file}">${o.short[0]} to ${o.short[1]}</a>`).join(' · ');
  const qa = [
    [`How many stops from ${a} to ${b} by metro?`, `There are ${stops} stops from ${a} to ${b}${changes ? `, with ${changes} change of train` : ' with no change of train'}.`],
    [`What is the metro fare from ${a} to ${b}?`, `The fare is about ₹${fare} as a token, based on BMRCL's distance slabs. Smart card and QR ticket fares are usually a little lower. Check the fare shown at the ticket counter or in the official app before you travel.`],
    [`How long does the ${a} to ${b} metro take?`, `Allow about ${minutes} minutes on the train${changes ? ', including the change' : ''}, plus time to get through security and to the platform.`]
  ];
  pages.push({
    file: r.file,
    title: `${a} to ${b} Metro: Route, Stops, Fare & Timings | Namma Metro`,
    description: `${a} to ${b} by Namma Metro: ${stops} stops, about ${minutes} minutes, fare about ₹${fare}. Which platform to board, where to change, first and last trains, and tips.`,
    h1: `${a} to ${b} by metro`,
    lede: r.notes[0],
    schema: [faq(qa)],
    body: `
    <div class="stats"><div><strong>${stops}</strong><span>stops</span></div><div><strong>~${minutes} min</strong><span>on the train</span></div><div><strong>~₹${fare}</strong><span>token fare (~${km.toFixed(1)} km)</span></div><div><strong>${changes ? `${changes} change` : 'Direct'}</strong><span>${parts.map(p => p.line).join(' → ')}</span></div></div>
    <section><h2>Step by step</h2><ol class="steps">${steps}<li><strong>Exit at ${esc(r.to)}</strong>: tap your card, scan your QR ticket or drop your token at the exit gate.</li></ol></section>
    <section><h2>Good to know</h2>${r.notes.slice(1).map(n => `<p>${n}</p>`).join('')}</section>
    ${svc ? `<section><h2>When trains run</h2><p>On Tuesday to Friday, ${firstLeg.line} trains ${esc(firstLeg.board.direction.replace('Towards', 'towards'))} run from about ${clock(svc.first)} until about ${clock(svc.last)} from the end of the line. At the busiest times a train comes every ${svc.best} minutes, and early or late in the day the gap grows to ${svc.worst} minutes. Monday and weekend times are on the <a href="${LINES[firstLeg.line].slug}.html">${firstLeg.line} page</a>.</p></section>` : ''}
    <section><h2>All stops on this route</h2>${stationList(path)}</section>
    <section><h2>How the fare is worked out</h2><p>BMRCL charges by distance. This trip is roughly ${km.toFixed(1)} km measured station to station in straight lines, which falls in the ₹${fare} slab. The track is a little longer than straight lines, so a trip close to a slab boundary may cost one slab more. See the <a href="namma-metro-fares-tickets.html">fares and tickets guide</a> for every slab and the cheaper ways to pay.</p></section>
    ${faqHtml(qa)}
    <section><h2>Plan a different trip</h2><p><a href="index.html">Open the route finder</a> to search any landmark or station. Other routes: ${reverse}</p></section>`
  });
}

// ---------- Timings hub ----------
pages.push({
  file: 'namma-metro-timings.html',
  title: 'Namma Metro Timings 2026: First & Last Train, Frequency | Bengaluru Metro',
  description: 'First and last train times and train frequency for the Bengaluru Namma Metro Purple, Green and Yellow Lines, for Monday, weekdays, Saturday and Sunday.',
  h1: 'Namma Metro timings: first train, last train and frequency',
  lede: `Bengaluru Metro trains start earliest on Mondays, run from about 5 AM on other weekdays and Saturdays, and start later on Sundays. Last trains leave the ends of the lines at around 11 PM. Below are the times for every line, taken from BMRCL's published timetables.`,
  body: `
    <section><h2>How to read these tables</h2><p>The first and last train times are when trains leave the end of the line. If your station is in the middle, add a few minutes per station: trains take roughly two to three minutes between stations. The gap between trains is shortest during the morning and evening office rush and longest early in the morning and late at night.</p><p>The first train runs earlier on Mondays and later on Sundays. Festivals, cricket matches and maintenance can change these times. BMRCL announces those changes on its website and social media.</p></section>
    ${Object.keys(LINES).map(line => `<section><h2>${lineBadge(line)} ${line} timings</h2>${timingTable(line)}<p><a href="${LINES[line].slug}.html">${line} stations and tips →</a></p></section>`).join('')}
    <section><h2>Planning around the last train</h2><p>If you need to change lines late at night, the last train on your second line may leave before your first train arrives. On the Yellow Line, late-evening gaps grow to 20–25 minutes. If you are travelling after 10:30 PM, check both lines and leave yourself some spare time. The <a href="index.html">route finder</a> shows the next few departures from your boarding station based on these timetables.</p></section>`
});

// ---------- Fares & tickets ----------
pages.push({
  file: 'namma-metro-fares-tickets.html',
  title: 'Namma Metro Fare Chart & Ticket Guide | Tokens, QR Tickets, Smart Cards',
  description: 'Bengaluru Namma Metro fare slabs by distance, the minimum and maximum fare, and how tokens, QR tickets, smart cards and NCMC cards compare.',
  h1: 'Namma Metro fares and tickets',
  lede: 'Namma Metro charges by distance, from ₹10 for the shortest trips to ₹90 for the longest. How you pay matters too: smart cards and QR tickets are usually a little cheaper than tokens and save you waiting in the counter queue.',
  body: `
    <section><h2>Fare slabs by distance</h2><p>These are the distance slabs from BMRCL's February 2025 fare revision. Fares can change, and BMRCL sometimes offers extra discounts, so treat this as a guide and check the fare shown at the counter or in the official app.</p>
    <div class="table-wrap"><table><thead><tr><th>Distance travelled</th><th>Token fare</th></tr></thead><tbody>${FARE_SLABS.map(([max, f], i) => `<tr><td>${i === 0 ? 'Up to 2 km' : max === Infinity ? 'More than 25 km' : `${FARE_SLABS[i - 1][0]}–${max} km`}</td><td>₹${f}</td></tr>`).join('')}</tbody></table></div></section>
    <section><h2>Ways to pay</h2>
    <h3>Tokens</h3><p>Single-journey tokens are sold at station counters and ticket machines. You tap the token on the entry gate and drop it into the slot at the exit gate. Tokens are the simplest choice for an occasional trip, but they cost the full fare and you may have to queue at busy stations.</p>
    <h3>QR tickets</h3><p>You can buy a QR ticket on your phone through the official Namma Metro app or BMRCL's other official digital channels, which are listed on bmrc.co.in. You scan the code at the entry and exit gates. QR tickets skip the counter queue and have usually carried a small discount over tokens. Buy only from official channels, and keep your phone charged until you have exited.</p>
    <h3>Smart cards</h3><p>A Namma Metro smart card is a rechargeable stored-value card that gives a discount on every trip compared with a token. You need to keep a minimum balance to enter. Cards can be recharged at stations or online. If you travel most days, a card pays for itself quickly.</p>
    <h3>NCMC cards</h3><p>National Common Mobility Card (NCMC) enabled cards are accepted at gates that support them. Check that your card carries the NCMC mark and has been activated for transit.</p></section>
    <section><h2>Tips to avoid paying more</h2><ul><li>Don't stay inside the paid area for too long. Very long stays between entry and exit can lead to an extra charge.</li><li>A token or QR ticket is valid only from the station where you bought it. Don't buy a return token in advance at the wrong station.</li><li>Changing lines at Majestic or RV Road is included in one fare as long as you stay inside the paid area.</li><li>Check your smart card balance before rush hour, because recharge queues are longest then.</li></ul></section>
    <section><h2>Fares for popular routes</h2><p>${ROUTES.map(o => `<a href="${o.file}">${o.short[0]} to ${o.short[1]}</a>`).join(' · ')}. For any other trip, the <a href="index.html">route finder</a> shows an estimated fare.</p></section>`
});

// ---------- First-time guide ----------
pages.push({
  file: 'how-to-use-namma-metro.html',
  title: 'How to Use Namma Metro: First-Time Rider Guide | Bengaluru Metro',
  description: 'A step-by-step guide to riding the Bengaluru Metro for the first time: buying a ticket, security, finding the right platform, changing lines and metro rules.',
  h1: 'How to use Namma Metro: a first-time rider\'s guide',
  lede: 'Your first trip on the Bengaluru Metro is easy once you know two things: which platform to stand on, and where to change lines. This guide walks through a trip from the station entrance to the exit.',
  body: `
    <section><h2>1. Plan the route before you reach the station</h2><p>Find your nearest station and the station closest to where you're going. Note the line and, most importantly, the <strong>end station in your direction of travel</strong>. Platform signs show the end station (for example "Towards Whitefield (Kadugodi)"), not the next stop. The <a href="index.html">route finder</a> works this out from any landmark and tells you which platform to use.</p></section>
    <section><h2>2. Buy a ticket</h2><p>You can buy a token at the counter or a ticket machine, a QR ticket on your phone, or use a smart card. If you travel often, get a smart card or use QR tickets: they are cheaper and skip the queue. The <a href="namma-metro-fares-tickets.html">fares and tickets guide</a> explains each option.</p></section>
    <section><h2>3. Security check</h2><p>Every station has a security check. Bags go through an X-ray scanner and passengers walk through a metal detector. Large luggage, sharp objects, flammable items and anything that could harm other passengers aren't allowed. At peak hours the security line can take a few minutes, so allow for it.</p></section>
    <section><h2>4. Through the gates and onto the right platform</h2><p>Tap your token or card on the reader, or scan your QR code, and walk through when the gate opens. Then follow the signs for your line colour and the end station in your direction. At stations with two platforms, the trains on each side go in opposite directions. Check the sign above the platform before you go down.</p></section>
    <section><h2>5. Boarding and riding</h2><ul><li>Stand behind the yellow line and let people get off before you board.</li><li>The coach nearest the front in the direction of travel is reserved for women. Look for the pink signs on the platform.</li><li>Seats for senior citizens, people with disabilities and pregnant women are marked. Please give them up when needed.</li><li>Eating isn't allowed on trains. Keep music on headphones.</li><li>Announcements are in Kannada, English and Hindi, and the screens show the next station.</li></ul></section>
    <section><h2>6. Changing lines</h2><p>There are two interchanges. At <strong>Majestic</strong> (Nadaprabhu Kempegowda station) the Purple and Green Lines cross on different levels. At <strong>Rashtreeya Vidyalaya Road</strong> the Green and Yellow Lines meet. You stay inside the paid area: follow the colour signs for your next line and don't tap out. Allow about five minutes for the change at rush hour.</p></section>
    <section><h2>7. Exiting</h2><p>At your destination, drop your token into the slot, tap your card or scan your QR ticket at the exit gate. Big stations have several numbered exits. The station map near the gates shows which exit leads to which road, which can save you a long walk.</p></section>
    <section><h2>Accessibility</h2><p>Namma Metro stations have lifts and tactile paths for visually impaired passengers, and station staff can help wheelchair users. If you need help, speak to the staff at the customer care desk near the entrance.</p></section>
    <section><h2>Next steps</h2><p><a href="purple-line.html">Purple Line</a> · <a href="green-line.html">Green Line</a> · <a href="yellow-line.html">Yellow Line</a> · <a href="namma-metro-timings.html">Timings</a></p></section>`
});

// ---------- Guides hub ----------
pages.push({
  file: 'guides.html',
  title: 'Bengaluru Metro Guides: Lines, Timings, Fares & Routes | Namma Metro Navigator',
  description: 'Every Namma Metro Navigator guide in one place: line guides, first and last train timings, fares and tickets, a first-time rider guide and popular route guides.',
  h1: 'Bengaluru Metro guides',
  lede: 'Everything on this site in one place. Each guide uses the same station, timetable and fare data as the route finder.',
  type: 'website',
  body: `
    <section><h2>Getting started</h2><ul class="cards"><li><a href="how-to-use-namma-metro.html">How to use Namma Metro</a><span>Tickets, security, platforms and changing lines for first-time riders.</span></li><li><a href="namma-metro-fares-tickets.html">Fares and tickets</a><span>Distance fare slabs and how tokens, QR tickets and smart cards compare.</span></li><li><a href="namma-metro-timings.html">Timings</a><span>First and last trains and the gap between trains on every line and day.</span></li></ul></section>
    <section><h2>Line guides</h2><ul class="cards">${Object.entries(LINES).map(([l, m]) => `<li><a href="${m.slug}.html">${l}</a><span>${esc(m.from)} to ${esc(m.to)}: all stations, timings and tips.</span></li>`).join('')}</ul></section>
    <section><h2>Popular routes</h2><ul class="cards">${ROUTES.map(o => `<li><a href="${o.file}">${o.short[0]} to ${o.short[1]}</a><span>Stops, fare, platform and where to change.</span></li>`).join('')}</ul></section>`
});

// ---------- About / contact / policies ----------
pages.push({
  file: 'about.html',
  title: 'About Namma Metro Navigator | Independent Bengaluru Metro Planner',
  description: 'Who runs Namma Metro Navigator, where its station, timetable and fare data comes from, how estimates are worked out, and how to report a correction.',
  h1: 'About Namma Metro Navigator',
  lede: 'Namma Metro Navigator is a free, independent journey planner for the Bengaluru Metro. It began as a tool for our own daily commutes and grew into a full route finder and set of guides for anyone riding Namma Metro.',
  type: 'website',
  body: `
    <section><h2>What the site does</h2><p>Type any landmark, office, mall or station, and the route finder picks the nearest metro station, works out the shortest route across the Purple, Green and Yellow Lines, and shows the stops, where to change lines, the estimated fare and which platform to stand on. With location permission it can follow your trip, show the next station and alert you before your stop.</p></section>
    <section><h2>Where the information comes from</h2><ul><li><strong>Timetables</strong>: entered from BMRCL's published train frequency timetables for each line and day type. The update date is shown on each line page.</li><li><strong>Stations and routes</strong>: station order and coordinates for every line, used to find the shortest path and the nearest station.</li><li><strong>Fares</strong>: BMRCL's distance slabs, applied to the station-to-station distance of your trip.</li><li><strong>Places</strong>: landmark search uses OpenStreetMap data.</li></ul></section>
    <section><h2>How accurate is it?</h2><p>Trip times are estimated at about two and a half minutes per station plus five minutes per change, which matches typical off-peak running. Fares are estimates from the distance slabs and can be one slab off near a boundary. Platform guidance follows the usual layout at each station. BMRCL can change timetables, fares and platform use at short notice. Always follow station signs and staff, and check <a href="https://www.bmrc.co.in/" target="_blank" rel="noopener noreferrer">bmrc.co.in</a> for official updates.</p></section>
    <section><h2>Independence</h2><p>This site is not run by or connected to Bangalore Metro Rail Corporation Limited (BMRCL) or the Government of Karnataka. It is free to use and is supported by advertising. Ads and sponsored links are clearly labelled.</p></section>
    <section><h2>Corrections</h2><p>If a timing, fare, platform or station name looks wrong, please tell us through the <a href="contact.html">contact page</a>. We check every report against BMRCL notices and update the data, usually within a few days.</p></section>`
});

pages.push({
  file: 'contact.html',
  title: 'Contact Namma Metro Navigator',
  description: 'How to contact Namma Metro Navigator about corrections, feedback, privacy requests or advertising, and where to reach BMRCL for official metro support.',
  h1: 'Contact',
  lede: 'We read every message. Corrections to timings, fares or platforms are the most useful thing you can send us.',
  type: 'website',
  body: `
    <section><h2>How to reach us</h2><ul><li><strong>Instagram</strong>: send a direct message to <a href="https://www.instagram.com/blrmetro/" target="_blank" rel="noopener noreferrer">@blrmetro</a>. This is the fastest way to reach us.</li><li><strong>GitHub</strong>: report a data error or bug on the <a href="https://github.com/sunilkp3/RoutePlanner/issues" target="_blank" rel="noopener noreferrer">project issue tracker</a>.</li></ul><p>We usually reply within two working days.</p></section>
    <section><h2>What to include in a correction</h2><ul><li>The page or route you were looking at.</li><li>What it showed and what you saw at the station, such as the platform number, timing or fare.</li><li>The date and time of your trip, if it was about a timetable.</li></ul></section>
    <section><h2>Privacy requests</h2><p>For questions about the data described in our <a href="privacy.html">privacy policy</a>, message us with the word "Privacy" in your message.</p></section>
    <section><h2>Official metro support</h2><p>We can't help with lost property, refunds, smart card problems or complaints about metro service. For those, contact BMRCL through the <a href="https://www.bmrc.co.in/" target="_blank" rel="noopener noreferrer">official BMRCL website</a> or the customer care desk at any station.</p></section>`
});

pages.push({
  file: 'privacy.html',
  title: 'Privacy Policy | Namma Metro Navigator',
  description: 'How Namma Metro Navigator handles location, analytics, advertising cookies and data stored in your browser.',
  h1: 'Privacy Policy',
  lede: 'This policy explains what information Namma Metro Navigator (blrmetro.com) uses, why, and the choices you have.',
  type: 'website',
  body: `
    <section><h2>Location</h2><p>If you allow location access in your browser, the route finder uses your position to find the nearest station and follow your trip. Location is processed in your browser to do this. We don't send it to our own servers or store it. You can turn location off at any time in your browser settings and type a place instead.</p></section>
    <section><h2>Place search</h2><p>When you search for a landmark, the search text is sent to OpenStreetMap's Nominatim service to find matching places. Please don't type personal addresses you don't want to share with that service.</p></section>
    <section><h2>Data stored in your browser</h2><p>The site uses your browser's local storage to remember settings such as the destination alarm. This data stays on your device, and you can clear it with your browser's site-data settings.</p></section>
    <section><h2>Analytics</h2><p>We use Google Analytics to understand which pages are used and how the site performs, such as page views, device and browser type, and approximate region. Google Analytics uses cookies. You can opt out with Google's <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Analytics opt-out add-on</a>.</p></section>
    <section><h2>Advertising</h2><p>We use Google AdSense to show ads. Google and its partners use cookies to serve ads based on your previous visits to this and other websites. Google's use of advertising cookies lets it and its partners serve ads based on your visits to this site and other sites on the internet. You can turn off personalised advertising in <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>, or opt out of some third-party vendors' cookies at <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">aboutads.info</a>. Learn more about <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">how Google uses data from partner sites</a>. Where the law requires it, you will be asked for consent before personalised ads are shown.</p><p>The site also shows a few labelled promotions for our own related projects. Clicking one takes you to that site, which has its own privacy policy.</p></section>
    <section><h2>Children</h2><p>The site is meant for a general audience and doesn't knowingly collect personal information from children.</p></section>
    <section><h2>Changes and contact</h2><p>We will update this page if our practices change and show the new date at the top. For questions, see the <a href="contact.html">contact page</a>.</p></section>`
});

pages.push({
  file: 'terms.html',
  title: 'Terms of Use & Disclaimer | Namma Metro Navigator',
  description: 'Terms of use and disclaimer for Namma Metro Navigator, an independent Bengaluru Metro journey planner.',
  h1: 'Terms of use and disclaimer',
  lede: 'By using blrmetro.com you agree to these terms. They are short, and we have written them in plain language.',
  type: 'website',
  body: `
    <section><h2>Information is for planning only</h2><p>Routes, timings, fares, platform guidance and live-tracking estimates are worked out from published timetables and station data. They are provided as-is to help you plan. They aren't official and may not match live operations, special timetables, closures or fare changes. Always follow station signs, announcements and BMRCL staff.</p></section>
    <section><h2>Not affiliated with BMRCL</h2><p>Namma Metro Navigator is independent and isn't endorsed by Bangalore Metro Rail Corporation Limited. "Namma Metro" and line names are used only to describe the service.</p></section>
    <section><h2>Your responsibility</h2><p>Don't rely on the destination alarm or live tracking as your only way to know your stop: GPS can be inaccurate underground and between tall buildings. Use the site safely and don't look at your phone while walking near platform edges or on stairs.</p></section>
    <section><h2>Limitation of liability</h2><p>To the extent the law allows, we aren't responsible for missed trains, extra fares or any other loss that comes from using information on this site.</p></section>
    <section><h2>Third-party content</h2><p>The site shows Google ads and links to other websites. We don't control their content or practices.</p></section>
    <section><h2>Changes</h2><p>We may update these terms. The date at the top of this page shows when they last changed. Questions? See the <a href="contact.html">contact page</a>.</p></section>`
});

for (const p of pages) writeFileSync(join(root, p.file), page(p));

const sitemapFiles = ['index.html', ...pages.map(p => p.file)];
writeFileSync(join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapFiles.map(f => `  <url><loc>${SITE}/${f === 'index.html' ? '' : f}</loc><lastmod>${BUILT}</lastmod></url>`).join('\n')}
</urlset>
`);
console.log(`Wrote ${pages.length} pages and sitemap.xml`);
