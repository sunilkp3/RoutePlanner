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

function page({ file, title, description, h1, lede, body, type = 'article', schema = [], updated = BUILT }) {
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
    <p class="updated">Updated ${updated} · Independent guide, not an official BMRCL page</p>
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
    <section><h2>Other lines</h2><p>${others.map(l => `<a href="${LINES[l].slug}.html">${l}</a>`).join(' · ')} · <a href="pink-line.html">Pink Line (upcoming)</a> · <a href="namma-metro-timings.html">All timings</a> · <a href="index.html">Plan a route</a></p></section>
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

// ---------- Upcoming Pink Line ----------
{
  const pinkStations = ['Kalena Agrahara', 'Hulimavu', 'IIM Bangalore', 'JP Nagar 4th Phase', 'Jayadeva Hospital', 'Tavarekere'];
  const pinkTrips = [['Kalena Agrahara', 'Tavarekere'], ['Hulimavu', 'Jayadeva Hospital'], ['Hulimavu', MAJESTIC], ['Hulimavu', 'Central Silk Board'], ['Kalena Agrahara', 'Electronic City'], ['Hulimavu', 'Whitefield (Kadugodi)']];
  const tripRow = ([a, b]) => {
    const path = findShortestPath(a, b);
    const changes = legs(path).map(l => l.line.replace(' Line', '')).join(' → ');
    return `<tr><td>${esc(a)} to ${esc(b)}</td><td>${path.length - 1}</td><td>${changes}</td><td>about ₹${fareFor(pathKm(path))}</td></tr>`;
  };
  const qa = [
    ['Is the Namma Metro Pink Line open now?', 'Not yet. The Kalena Agrahara to Tavarekere stretch has been reported as cleared by the safety commissioner, but passenger service has not started.'],
    ['When will the Pink Line open?', 'The Chief Minister has said the Prime Minister will inaugurate it on 15 November 2026. That date is not final, and public service may start after the inauguration. We will update this page when BMRCL confirms it.'],
    ['Which stations open first on the Pink Line?', 'Six elevated stations: Kalena Agrahara, Hulimavu, IIM Bangalore (IIMB), JP Nagar 4th Phase, Jayadeva Hospital and Tavarekere.'],
    ['How long is the first stretch of the Pink Line?', 'About 7.5 km. The full line is planned to run about 21 km from Kalena Agrahara to Nagawara. The rest opens later, and that section has no confirmed date.'],
    ['Where does the Pink Line connect to other metro lines?', 'At Jayadeva Hospital, where you can change to the Yellow Line. To reach the Green Line, take the Yellow Line to RV Road.'],
    ['What will the Pink Line fare be?', 'BMRCL has not published Pink Line fares. If the current distance slabs apply, a ride along the whole first stretch would cost about ₹' + fareFor(pathKm(findShortestPath('Kalena Agrahara', 'Tavarekere'))) + '.'],
    ['Does the Pink Line go to MG Road?', 'Not in this first stretch. The planned route reaches MG Road in the later underground section.']
  ];
  pages.push({
    file: 'pink-line.html',
    updated: '2026-11-02',
    title: 'Namma Metro Pink Line: Opening Date, Stations & Route | Bengaluru',
    description: 'Is the Bengaluru Metro Pink Line open? Latest opening date, the 6 stations from Kalena Agrahara to Tavarekere, expected fares, connections and sample routes.',
    h1: 'Namma Metro Pink Line: opening date, stations and route',
    lede: '<strong>Upcoming, not open yet.</strong> The first stretch runs along Bannerghatta Road from Kalena Agrahara to Tavarekere, with opening expected around 15 November 2026. The date is not final.',
    schema: [faq(qa)],
    body: `
    <div class="stats"><div><strong>6</strong><span>stations in the first stretch</span></div><div><strong>7.5 km</strong><span>elevated section</span></div><div><strong>~15 Nov</strong><span>expected, date not final</span></div><div><strong>~21 km</strong><span>planned full line to Nagawara</span></div></div>
    <section><h2>Latest status</h2><p>The elevated section has been reported as cleared by the safety commissioner, and the Chief Minister has said the Prime Minister will inaugurate it on 15 November 2026. BMRCL has not published the timetable or fares that we could confirm, so check <a href="https://www.bmrc.co.in/" target="_blank" rel="noopener noreferrer">bmrc.co.in</a> before you plan around it.</p></section>
    <section><h2>Pink Line stations in order</h2><p>Listed from south to north. You change to the Yellow Line at Jayadeva Hospital.</p><ol class="stops">${pinkStations.map(st => `<li>${esc(st)}${st === 'Jayadeva Hospital' ? ' <span class="tag">Yellow Line change</span>' : ''}</li>`).join('')}</ol></section>
    <section><h2>Where it could take you</h2><p>These are previews from the current network. Fares are our estimates from today's distance slabs, not published Pink Line fares.</p><div class="table-wrap"><table><thead><tr><th>Trip</th><th>Stops</th><th>Lines</th><th>Estimated fare</th></tr></thead><tbody>${pinkTrips.map(tripRow).join('')}</tbody></table></div><p><a href="index.html">Preview your own Pink Line route</a> in the route finder by picking a Pink Line station.</p></section>
    <section><h2>What opens later</h2><p>The rest of the line continues north to Nagawara, including the underground section through the city centre. Dates for that section have changed several times and aren't confirmed, so we don't list one here.</p></section>
    ${faqHtml(qa)}
    <section><h2>Other lines</h2><p>${Object.entries(LINES).map(([l, m]) => `<a href="${m.slug}.html">${l}</a>`).join(' · ')} · <a href="namma-metro-fares-tickets.html">Fares and tickets</a></p></section>`
  });
}


// ---------- 8 In-Depth Commuter Guides for Authority & AdSense Compliance ----------

// 1. Smart Card, QR Tickets & WhatsApp Ticketing Guide
{
  const qa = [
    ['What discount do you get with a Namma Metro Smart Card or QR ticket?', 'Smart card holders and mobile QR ticket users receive a 5% discount on the standard token fare on every trip across Purple, Green, and Yellow lines.'],
    ['How do you book Namma Metro tickets on WhatsApp?', 'Save the official BMRCL WhatsApp chatbot number +91 81055 56677. Send "Hi", choose your language, select originating and destination stations, select passenger count, and complete payment via UPI. A QR code is generated instantly.'],
    ['What is the minimum balance required on a Namma Metro smart card?', 'The minimum balance required to enter a metro station is ₹50. If your card balance drops below ₹50, the entry flap gates will not open.'],
    ['Can I use an NCMC card from any bank on Namma Metro?', 'Yes, Namma Metro automatic fare collection (AFC) gates support all RuPay National Common Mobility Cards (NCMC) issued by Indian banks including SBI, ICICI, Canara Bank, and Paytm Payments Bank.']
  ];
  pages.push({
    file: 'namma-metro-smart-card-qr-tickets-guide.html',
    updated: '2026-11-09',
    title: 'Namma Metro Smart Card, QR Tickets & WhatsApp Booking Guide | Bengaluru',
    description: 'Complete guide to Namma Metro smart cards, WhatsApp QR tickets (81055 56677), NCMC open-loop cards, 5% discounts, recharge methods and refund rules.',
    h1: 'Namma Metro Smart Cards, QR Tickets and WhatsApp Booking',
    lede: 'Skipping ticket counter queues in Bengaluru saves 10 to 20 minutes every rush hour. Here is a complete guide to comparing Smart Cards, WhatsApp QR tickets, NCMC cards, and mobile app ticketing with fare discounts.',
    schema: [faq(qa)],
    body: `
    <div class="stats"><div><strong>5%</strong><span>discount on all trips</span></div><div><strong>₹50</strong><span>minimum card balance</span></div><div><strong>4</strong><span>ticketing options</span></div><div><strong>+91 81055 56677</strong><span>official WhatsApp bot</span></div></div>
    <section><h2>Ticketing options compared</h2>
      <div class="table-wrap"><table><thead><tr><th>Ticket type</th><th>Cost / Deposit</th><th>Discount</th><th>Best for</th><th>Where to buy / recharge</th></tr></thead><tbody>
        <tr><td><strong>Contactless Smart Card (Varshik)</strong></td><td>₹50 non-refundable fee</td><td>5% off token fare</td><td>Daily office commuters</td><td>Station Customer Care, BMRCL app, Amazon Pay</td></tr>
        <tr><td><strong>WhatsApp QR Ticket</strong></td><td>Exact fare (no deposit)</td><td>5% off token fare</td><td>Occasional riders & tourists</td><td>WhatsApp (+91 81055 56677)</td></tr>
        <tr><td><strong>Mobile App QR (Namma Metro / Paytm)</strong></td><td>Exact fare (no deposit)</td><td>5% off token fare</td><td>Smartphone users</td><td>Namma Metro official app, Paytm, Amazon Pay</td></tr>
        <tr><td><strong>National Common Mobility Card (NCMC)</strong></td><td>Issued by bank</td><td>5% off token fare</td><td>Inter-city travelers & transit commuters</td><td>Bank branches & online banking portals</td></tr>
        <tr><td><strong>Single Journey Token</strong></td><td>Full distance slab fare</td><td>No discount</td><td>One-off travelers without phone</td><td>Station ticket counters & TVM machines</td></tr>
      </tbody></table></div>
    </section>
    <section><h2>How to book tickets on WhatsApp (+91 81055 56677)</h2>
      <ol class="steps">
        <li><strong>Start the chat</strong>: Send "Hi" to <code>+91 81055 56677</code> on WhatsApp.</li>
        <li><strong>Choose your language</strong>: Select English or Kannada.</li>
        <li><strong>Pick stations</strong>: Tap "Buy Ticket", choose your origin station and destination station from the dropdown.</li>
        <li><strong>Select passenger count</strong>: You can purchase single or return tickets for up to 6 passengers at once.</li>
        <li><strong>Pay with UPI</strong>: Pay securely using Google Pay, PhonePe, Paytm, or BHIM.</li>
        <li><strong>Scan at the gate</strong>: Your phone screen displays a dynamic QR code. Hold it 5–10 cm above the glass reader on the right-hand side of the turnstile to open the gate.</li>
      </ol>
    </section>
    <section><h2>Smart Card recharge rules & Card Top-up Terminals (CTT)</h2>
      <p>When you recharge your Varshik Smart Card online through the Namma Metro app or Amazon Pay, <strong>the balance is not written to your card immediately</strong>. You must tap your physical card on a Card Top-up Terminal (CTT) located near station customer care counters or at the entry gate within 15 days to update the electronic chip.</p>
    </section>
    <section><h2>Card validity and refunds</h2>
      <p>Namma Metro smart cards remain valid for one year from the date of the last recharge. If your card expires with unspent money, visit any station customer care desk. Staff can extend card validity or transfer the remaining balance to a new card for a nominal processing fee.</p>
    </section>
    ${faqHtml(qa)}
    <section><h2>Related guides</h2><p><a href="namma-metro-fares-tickets.html">Distance fare slabs</a> · <a href="how-to-use-namma-metro.html">First-time rider walkthrough</a> · <a href="index.html">Open the route finder</a></p></section>`
  });
}

// 2. Majestic Metro Interchange Guide
{
  const qa = [
    ['How much time is needed to change trains at Majestic Metro station?', 'Allow between 3 to 5 minutes to change lines at Majestic. During peak rush hours (8:30 AM to 10:30 AM and 5:30 PM to 8:00 PM), allow 6 to 8 minutes due to heavier stair and escalator foot traffic.'],
    ['Do I need to tap out or buy a new ticket when interchanging at Majestic?', 'No. You stay inside the paid concourse area. Do not tap your card or QR ticket at any gate while changing lines. Simply follow the coloured directional signs to your connecting platform.'],
    ['How do I walk from Majestic Metro to KSR Bengaluru City Railway Station?', 'Take Exit A (towards railway station). Follow the covered pedestrian foot overbridge (FOB) that connects the metro concourse directly with Platform 10 and the main entrance of KSR Bengaluru City railway station without touching street traffic.']
  ];
  pages.push({
    file: 'majestic-interchange-metro-guide.html',
    updated: '2026-11-09',
    title: 'Majestic Metro Interchange Guide: Changing Between Purple & Green Lines | Bengaluru',
    description: 'Step-by-step transfer guide at Nadaprabhu Kempegowda (Majestic) station. How to switch between Purple and Green Lines, platform levels, walking times and station exits.',
    h1: 'Majestic Metro Interchange Guide: Purple and Green Lines',
    lede: 'Nadaprabhu Kempegowda Station (Majestic) is Bengaluru\'s central underground transit interchange where the Purple Line and Green Line cross. Here is how to navigate between levels quickly and safely.',
    schema: [faq(qa)],
    body: `
    <div class="stats"><div><strong>Underground</strong><span>multi-level interchange</span></div><div><strong>~3–5 min</strong><span>average transfer walk</span></div><div><strong>Platform 1 & 2</strong><span>Purple Line level</span></div><div><strong>Platform 3 & 4</strong><span>Green Line level</span></div></div>
    <section><h2>Station platform layout</h2>
      <div class="table-wrap"><table><thead><tr><th>Platform</th><th>Metro Line</th><th>Direction of Travel</th><th>Major Destinations Served</th></tr></thead><tbody>
        <tr><td><strong>Platform 1</strong></td><td><span class="badge purple">Purple Line</span></td><td>Towards Whitefield (Kadugodi)</td><td>Vidhana Soudha, Cubbon Park, MG Road, Indiranagar, KR Pura, ITPL</td></tr>
        <tr><td><strong>Platform 2</strong></td><td><span class="badge purple">Purple Line</span></td><td>Towards Challaghatta</td><td>Magadi Road, Vijayanagar, Deepanjali Nagar, Mysuru Road, Kengeri</td></tr>
        <tr><td><strong>Platform 3</strong></td><td><span class="badge green">Green Line</span></td><td>Towards Madavara (BIEC)</td><td>Sampige Road, Malleshwaram, Rajajinagar, Yeshwanthpur, Peenya</td></tr>
        <tr><td><strong>Platform 4</strong></td><td><span class="badge green">Green Line</span></td><td>Towards Silk Institute</td><td>Chickpet, KR Market, National College, Lalbagh, Jayanagar, Banashankari</td></tr>
      </tbody></table></div>
    </section>
    <section><h2>How to change trains step by step</h2>
      <ol class="steps">
        <li><strong>Step off your train</strong>: Note whether you are on the Purple Line (upper track level) or Green Line (lower track level).</li>
        <li><strong>Follow overhead colour markers</strong>: Look up at the illuminated direction boards. Follow the <strong>Purple signs</strong> for Whitefield/Challaghatta, or the <strong>Green signs</strong> for Madavara/Silk Institute.</li>
        <li><strong>Use the central escalators or stairs</strong>: Walk towards the centre of the platform. Take the designated escalators directly connecting the Purple and Green track levels.</li>
        <li><strong>Do not pass through turnstiles</strong>: Stay within the yellow tiled interchange corridors. Turnstiles will deduct an exit fare if tapped.</li>
        <li><strong>Arrive at your connecting platform</strong>: Check the platform digital screens to confirm train arrival time (usually 3 to 6 minutes at peak hours).</li>
      </ol>
    </section>
    <section><h2>Exits for trains and city buses</h2>
      <p>Majestic has multiple numbered gates serving different transit hubs:</p>
      <ul>
        <li><strong>Exit A (KSR Railway Station)</strong>: Direct covered skywalk connecting directly into Platform 10 of KSR Bengaluru City Railway Station.</li>
        <li><strong>Exit B (BMTC Bus Stand)</strong>: Opens straight into Kempegowda Bus Station (Majestic Bus Terminal) for city buses, Vayu Vajra airport buses, and suburban routes.</li>
        <li><strong>Exit C (KSRTC Inter-state Bus Terminal)</strong>: Leads to Karnataka State Road Transport Corporation terminals for inter-city travel to Mysuru, Hassan, Mangaluru, and Tamil Nadu.</li>
      </ul>
    </section>
    <section><h2>Accessibility & senior citizen transfers</h2>
      <p>All four platform levels at Majestic are connected by high-capacity glass lifts. If travelling with heavy luggage, a wheelchair, or a stroller, locate the central elevators near the station control room rather than using crowded escalators.</p>
    </section>
    ${faqHtml(qa)}
    <section><h2>Related guides</h2><p><a href="purple-line.html">Purple Line guide</a> · <a href="green-line.html">Green Line guide</a> · <a href="how-to-use-namma-metro.html">First-time rider walkthrough</a> · <a href="index.html">Open route planner</a></p></section>`
  });
}

// 3. Station Parking Directory & Charges Guide
{
  const qa = [
    ['Which Namma Metro stations have car and bike parking?', 'Major terminal and suburban stations have dedicated multi-level or surface parking lots, including Whitefield (Kadugodi), Swami Vivekananda Road, Baiyappanahalli, Mysuru Road, Jnanabharathi, Kengeri, Nagasandra, Yeshwanthpur, and Silk Institute.'],
    ['What are the parking charges at Namma Metro stations?', 'Standard two-wheeler parking is ₹15 for the first 4 hours and ₹5 for every additional hour (maximum ₹30 per day). Four-wheeler car parking is ₹30 for the first 4 hours and ₹10 per additional hour (maximum ₹60 per day).'],
    ['Is overnight parking permitted at Namma Metro stations?', 'Overnight parking is permitted at select 24-hour lots (such as Baiyappanahalli, Swami Vivekananda Road, and Nagasandra) with overnight surcharge slips, but unattended vehicles left for more than 48 hours without prior notice may be towed for security reasons.']
  ];
  pages.push({
    file: 'namma-metro-parking-stations-charges.html',
    updated: '2026-11-09',
    title: 'Namma Metro Station Parking Guide: Available Stations, Charges & Timings | Bengaluru',
    description: 'Complete list of Bengaluru Metro stations with two-wheeler and four-wheeler parking facilities, daily and monthly parking tariffs, operating hours and EV charging.',
    h1: 'Namma Metro Station Parking: Charges, Timings & Stations',
    lede: 'Driving your bike or car to the nearest metro station and riding the train into Bengaluru city center avoids peak traffic. Here is the verified list of stations with parking lots, official BMRCL tariffs, and operating guidelines.',
    schema: [faq(qa)],
    body: `
    <div class="stats"><div><strong>₹15–₹30</strong><span>daily two-wheeler tariff</span></div><div><strong>₹30–₹60</strong><span>daily four-wheeler tariff</span></div><div><strong>20+</strong><span>stations with parking lots</span></div><div><strong>5:00 AM – 11:30 PM</strong><span>parking lot hours</span></div></div>
    <section><h2>Official BMRCL parking tariff slabs</h2>
      <div class="table-wrap"><table><thead><tr><th>Duration</th><th>Two-Wheelers (Bikes/Scooters)</th><th>Four-Wheelers (Cars)</th><th>Bicycles</th></tr></thead><tbody>
        <tr><td>First 4 hours</td><td>₹15</td><td>₹30</td><td>₹5</td></tr>
        <tr><td>Every subsequent hour</td><td>₹5 / hr</td><td>₹10 / hr</td><td>₹2 / hr</td></tr>
        <tr><td>Full Day Maximum (daytime)</td><td>₹30</td><td>₹60</td><td>₹10</td></tr>
        <tr><td>Monthly Parking Pass</td><td>₹750 / month</td><td>₹1,500 / month</td><td>₹150 / month</td></tr>
        <tr><td>Overnight surcharge (after 11:30 PM)</td><td>₹50 extra</td><td>₹100 extra</td><td>₹20 extra</td></tr>
      </tbody></table></div>
    </section>
    <section><h2>Stations with official parking lots</h2>
      <h3>Purple Line parking stations</h3>
      <ul>
        <li><strong>Whitefield (Kadugodi)</strong>: Large surface lot for two-wheelers and cars; ideal for commuters from Hoskote and eastern outskirts.</li>
        <li><strong>Kadugodi Tree Park & Pattandur Agrahara</strong>: Ample two-wheeler parking for Whitefield tech workers.</li>
        <li><strong>Swami Vivekananda Road (Old Madras Road)</strong>: Dedicated multi-level automated car and two-wheeler parking facility.</li>
        <li><strong>Baiyappanahalli</strong>: Massive ground parking area for both cars and bikes near the Sir M. Visvesvaraya Railway Terminal.</li>
        <li><strong>Deepanjali Nagar & Mysuru Road</strong>: High-capacity two-wheeler and car parking lots serving western commuters.</li>
        <li><strong>Jnanabharathi & Kengeri</strong>: Dedicated parking facilities for Bengaluru University students and Mysuru Road commuters.</li>
        <li><strong>Challaghatta</strong>: Surface parking at the western terminal.</li>
      </ul>
      <h3>Green Line parking stations</h3>
      <ul>
        <li><strong>Nagasandra</strong>: Major transit hub parking serving Tumkur Road, Nelamangala, and northern commuters.</li>
        <li><strong>Dasarahalli & Jalahalli</strong>: Two-wheeler parking facilities.</li>
        <li><strong>Peenya Industry & Goraguntepalya</strong>: Two-wheeler lots for industrial estate and Ring Road commuters.</li>
        <li><strong>Yeshwanthpur</strong>: High-capacity multi-modal parking facility connected to the railway station.</li>
        <li><strong>Banashankari</strong>: Integrated parking opposite the BMTC TTMC bus terminal.</li>
        <li><strong>Yelachenahalli, Konanakunte Cross & Silk Institute</strong>: Generous car and two-wheeler parking serving Kanakapura Road communities.</li>
      </ul>
    </section>
    <section><h2>Electric vehicle (EV) charging facilities</h2>
      <p>BMRCL has installed public EV charging stations at Baiyappanahalli, Swami Vivekananda Road, Mysuru Road, and Nagasandra stations in partnership with BESCOM. Riders can charge two-wheelers and four-wheelers during their work day using the BESCOM EV Mithra mobile app.</p>
    </section>
    ${faqHtml(qa)}
    <section><h2>Related guides</h2><p><a href="namma-metro-timings.html">Metro timings</a> · <a href="namma-metro-fares-tickets.html">Fares guide</a> · <a href="index.html">Find nearest station</a></p></section>`
  });
}

// 4. Luggage Limits, Prohibited Items & Penalty Rules
{
  const qa = [
    ['What is the maximum luggage allowed in Namma Metro?', 'Each passenger may carry one bag weighing up to 15 kg with maximum dimensions of 60 cm (length) x 45 cm (breadth) x 25 cm (height). Luggage exceeding these limits may be stopped at station baggage scanners.'],
    ['Is alcohol allowed on Namma Metro?', 'No. Carrying open or sealed alcohol bottles is strictly prohibited on Namma Metro trains and inside station premises.'],
    ['Can I carry a pet or bird on the metro in Bengaluru?', 'Pets and domestic animals are strictly prohibited on Namma Metro. Only certified service animals accompanying visually impaired passengers are permitted with prior station master approval.'],
    ['What is the fine for travelling without a ticket on Namma Metro?', 'Travelling without a valid token, smart card tap, or QR ticket attracts a minimum fine of ₹500 plus the maximum distance fare slab (₹90), under the Metro Railways (Operations and Maintenance) Act.']
  ];
  pages.push({
    file: 'namma-metro-luggage-travel-rules-penalties.html',
    updated: '2026-11-09',
    title: 'Namma Metro Luggage Limits, Prohibited Items & Penalty Rules | Bengaluru',
    description: 'Official baggage dimensions, max weight limit (15 kg), prohibited items, pet policies, photography restrictions and penalty fines on Namma Metro.',
    h1: 'Namma Metro Luggage Limits, Prohibited Items & Rules',
    lede: 'Every Bengaluru Metro station operates security baggage scanners and metal detectors. Understanding baggage limits, restricted items, and passenger codes of conduct prevents delays at security checkpoints.',
    schema: [faq(qa)],
    body: `
    <div class="stats"><div><strong>15 kg</strong><span>maximum baggage weight</span></div><div><strong>60×45×25 cm</strong><span>maximum dimensions</span></div><div><strong>Zero</strong><span>alcohol permitted</span></div><div><strong>₹500</strong><span>standard violation fine</span></div></div>
    <section><h2>Baggage dimensions & weight guidelines</h2>
      <p>Passengers are permitted to carry personal luggage within the following specifications:</p>
      <ul>
        <li><strong>Maximum dimensions</strong>: 60 cm length × 45 cm breadth × 25 cm height.</li>
        <li><strong>Maximum weight</strong>: 15 kilograms per ticketed passenger.</li>
        <li><strong>Airport luggage exception</strong>: Passengers carrying standard airline check-in suitcases to or from Kempegowda Bus Station, KSR Railway Station, or airport feeder hubs are generally accommodated if baggage fits through standard X-ray scanners and does not block carriage gangways.</li>
      </ul>
    </section>
    <section><h2>Strictly prohibited items</h2>
      <div class="table-wrap"><table><thead><tr><th>Category</th><th>Prohibited Items</th><th>Enforcement Action</th></tr></thead><tbody>
        <tr><td><strong>Weapons & Sharp Objects</strong></td><td>Knives, daggers, cleavers, scissors with blades >10 cm, firearms, ammunition, replica toys</td><td>Confiscation & handover to police</td></tr>
        <tr><td><strong>Explosives & Flammables</strong></td><td>Firecrackers, matches, lighters, kerosene, petrol, paint thinners, fireworks</td><td>Confiscation & legal prosecution</td></tr>
        <tr><td><strong>Gases & Chemicals</strong></td><td>Gas cylinders, chemical sprayers, corrosive acids, toxic chemicals</td><td>Strictly barred from entry</td></tr>
        <tr><td><strong>Alcohol & Narcotics</strong></td><td>Open or sealed liquor bottles, beer cans, illicit substances</td><td>Turned away at security</td></tr>
        <tr><td><strong>Living Animals</strong></td><td>Dogs, cats, birds, reptiles (service guide dogs exempted)</td><td>Entry denied</td></tr>
      </tbody></table></div>
    </section>
    <section><h2>Code of conduct & penalty schedule</h2>
      <p>Fines are enforced under the Metro Railways (Operation and Maintenance) Act, 2002:</p>
      <ul>
        <li><strong>Ticketless travel or ticket misuse</strong>: ₹500 fine plus the maximum system fare (₹90).</li>
        <li><strong>Entering the women-only reserved coach</strong>: ₹500 fine and immediate ejection from the train (the first coach in direction of travel is reserved for women).</li>
        <li><strong>Spitting, chewing tobacco, or littering</strong>: ₹500 spot fine.</li>
        <li><strong>Drunken or disorderly behavior</strong>: ₹500 fine, removal from station, and transfer to police custody.</li>
        <li><strong>Alighting on metro tracks or walking on viaducts</strong>: Up to ₹1,000 fine and imprisonment up to 6 months.</li>
        <li><strong>Eating or drinking inside carriages</strong>: Prohibited; helps maintain train cleanliness and hygiene.</li>
      </ul>
    </section>
    ${faqHtml(qa)}
    <section><h2>Related guides</h2><p><a href="how-to-use-namma-metro.html">First-time rider guide</a> · <a href="namma-metro-fares-tickets.html">Fares & tickets</a> · <a href="index.html">Route finder</a></p></section>`
  });
}

// 5. Bengaluru Airport by Metro & Feeder Bus Guide
{
  const qa = [
    ['Can I reach Bengaluru Airport directly by Namma Metro today?', 'Not yet directly by train. The dedicated Blue Line (Phase 2B) from Central Silk Board via KR Pura and Hebbal to KIA Terminal is under construction. However, you can take the Purple or Green Line to key transfer stations and board high-frequency BMTC Vayu Vajra airport buses.'],
    ['Which is the best metro station to catch an airport bus in Bengaluru?', 'K.R. Pura (Purple Line) and Swami Vivekananda Road (Purple Line) are the two most popular transfer points. At K.R. Pura, Vayu Vajra KIA-8 and KIA-8C run every 15 to 20 minutes towards the airport.'],
    ['How much does it cost to reach the airport via Metro + Vayu Vajra bus?', 'The total trip costs around ₹270 to ₹350 per passenger (approx ₹40 metro fare + ₹250 to ₹300 Vayu Vajra ticket), compared to ₹1,200 to ₹1,800 for a private airport cab.']
  ];
  pages.push({
    file: 'bengaluru-airport-metro-feeder-bus-guide.html',
    updated: '2026-11-09',
    title: 'How to Reach Bengaluru Airport by Namma Metro & Vayu Vajra Buses | BLR Transit',
    description: 'Step-by-step route guide from Namma Metro stations to Kempegowda International Airport (BLR). Purple Line connection to KR Pura / Baiyappanahalli + BMTC Vayu Vajra KIA buses.',
    h1: 'Reaching Bengaluru Airport (BLR) by Metro and Vayu Vajra',
    lede: 'While Bengaluru\'s direct airport metro line is being built, combining Namma Metro with BMTC\'s air-conditioned Vayu Vajra buses is the most reliable, traffic-proof, and cost-effective way to get to Kempegowda International Airport.',
    schema: [faq(qa)],
    body: `
    <div class="stats"><div><strong>₹270–₹350</strong><span>total trip cost vs ₹1,500 cab</span></div><div><strong>~75–90 min</strong><span>predictable journey time</span></div><div><strong>Every 15 min</strong><span>Vayu Vajra frequency</span></div><div><strong>Phase 2B</strong><span>direct Blue Line under build</span></div></div>
    <section><h2>Top 3 Metro-to-Airport connection routes</h2>
      <div class="table-wrap"><table><thead><tr><th>Starting Area</th><th>Metro Station</th><th>Connecting Vayu Vajra Bus</th><th>Transfer Walk</th><th>Typical Journey Time</th></tr></thead><tbody>
        <tr><td><strong>East Bengaluru / IT Corridor</strong></td><td>K.R. Pura (Purple Line)</td><td><strong>KIA-8 / KIA-8C</strong></td><td>2 mins across footbridge to Tin Factory bus bay</td><td>65–75 minutes</td></tr>
        <tr><td><strong>Central Bengaluru / Indiranagar</strong></td><td>Swami Vivekananda Road</td><td><strong>KIA-4 / KIA-6</strong></td><td>Direct bus stop at station entrance</td><td>75–85 minutes</td></tr>
        <tr><td><strong>North / West Bengaluru</strong></td><td>Yeshwanthpur (Green Line)</td><td><strong>KIA-10</strong></td><td>1 min to Yeshwanthpur TTMC terminal</td><td>60–70 minutes</td></tr>
        <tr><td><strong>City Centre / Railway Station</strong></td><td>Majestic (Interchange)</td><td><strong>KIA-9</strong></td><td>Direct skywalk to BMTC Terminal 1</td><td>80–95 minutes</td></tr>
      </tbody></table></div>
    </section>
    <section><h2>Why metro + bus beats airport cabs during peak hours</h2>
      <p>Bengaluru\'s central corridors—including Old Madras Road, Indiranagar 100ft Road, and Hebbal Junction—frequently experience severe road gridlock during morning and evening rush hours. Taking the Purple Line or Green Line allows you to skip 15–20 kilometers of city-center bumper-to-bumper traffic before boarding an express AC bus on the wide Ballari Road highway.</p>
    </section>
    <section><h2>Luggage handling on Vayu Vajra buses</h2>
      <p>BMTC Vayu Vajra buses feature dedicated luggage bays inside the low-floor cabin and luggage racks beneath the coach. Bus conductors assist with large suitcases at no additional baggage charge.</p>
    </section>
    <section><h2>Upcoming Blue Line (Phase 2B) Airport Metro update</h2>
      <p>BMRCL is actively constructing the 37-kilometer Blue Line (Phase 2B) linking Central Silk Board to Kempegowda International Airport via HSR Layout, Bellandur, Marathahalli, KR Pura, Nagawara, Hebbal, and Yelahanka. Once operational, direct trains will run between the airport and the tech corridor in under 45 minutes.</p>
    </section>
    ${faqHtml(qa)}
    <section><h2>Related guides</h2><p><a href="metro-feeder-buses-mf-routes-bangalore.html">Feeder bus guide</a> · <a href="namma-metro-fares-tickets.html">Metro fares</a> · <a href="index.html">Plan route</a></p></section>`
  });
}

// 6. Metro Feeder Buses MF Series Guide
{
  const qa = [
    ['What does MF stand for in BMTC bus numbers?', 'MF stands for "Metro Feeder". These are dedicated non-AC and AC bus routes operated by BMTC specifically designed to connect metro stations to residential neighborhoods and tech parks that do not have direct rail access.'],
    ['Can I pay for Metro Feeder buses with UPI or metro smart cards?', 'BMTC conductors carry electronic ticketing machines that support dynamic UPI QR code payments (Google Pay, PhonePe, Paytm). Metro smart cards are not currently integrated with BMTC buses, but BMTC daily and monthly bus passes are accepted on non-AC feeder routes.'],
    ['Which metro stations have the best feeder bus connectivity to Outer Ring Road tech parks?', 'K.R. Pura, Swami Vivekananda Road, and Baiyappanahalli have the highest frequency of feeder buses heading towards Marathahalli, Kadubeesanahalli, Bellandur, and Sarjapur Road.']
  ];
  pages.push({
    file: 'metro-feeder-buses-mf-routes-bangalore.html',
    updated: '2026-11-09',
    title: 'Namma Metro Feeder Bus Guide: MF Series Routes & Tech Park Connections | Bengaluru',
    description: 'Comprehensive directory of BMTC Metro Feeder (MF series) buses connecting Namma Metro stations to Outer Ring Road, Manyata, Electronic City and Whitefield tech parks.',
    h1: 'Namma Metro Feeder Buses: MF Series Routes and Tech Parks',
    lede: 'Bridging the last-mile gap between Bengaluru Metro stations and major office hubs is made simple with BMTC\'s Metro Feeder (MF) bus network. Here is a practical guide to the most essential feeder routes.',
    schema: [faq(qa)],
    body: `
    <div class="stats"><div><strong>MF Series</strong><span>dedicated feeder branding</span></div><div><strong>Every 10–15 min</strong><span>peak hour frequency</span></div><div><strong>₹6–₹25</strong><span>distance bus fare</span></div><div><strong>UPI</strong><span>accepted on all routes</span></div></div>
    <section><h2>Popular Metro Feeder routes directory</h2>
      <div class="table-wrap"><table><thead><tr><th>Route Number</th><th>Connecting Metro Station</th><th>Major Destination Hubs</th><th>Frequency</th></tr></thead><tbody>
        <tr><td><strong>MF-1</strong></td><td>Swami Vivekananda Road (Purple)</td><td>Bagmane Tech Park, CV Raman Nagar, BEML Gate</td><td>Every 10 mins</td></tr>
        <tr><td><strong>MF-2</strong></td><td>Indiranagar (Purple)</td><td>Domlur, Kodihalli, Embassy Golf Links (EGL)</td><td>Every 12 mins</td></tr>
        <tr><td><strong>MF-3</strong></td><td>K.R. Pura (Purple)</td><td>Mahadevapura, Marathahalli Bridge, Bellandur</td><td>Every 8 mins</td></tr>
        <tr><td><strong>MF-5</strong></td><td>Baiyappanahalli (Purple)</td><td>Kasturi Nagar, Ramamurthy Nagar, Kalyan Nagar</td><td>Every 15 mins</td></tr>
        <tr><td><strong>MF-7</strong></td><td>Pattandur Agrahara (Purple)</td><td>ITPL, Brigade Tech Gardens, EPIP Zone, Hopefarm</td><td>Every 10 mins</td></tr>
        <tr><td><strong>MF-9</strong></td><td>Kadugodi Tree Park (Purple)</td><td>Whitefield Railway Station, Seegehalli, Kannamangala</td><td>Every 15 mins</td></tr>
        <tr><td><strong>MF-12</strong></td><td>Banashankari (Green)</td><td>Padmanabhanagar, Uttarahalli, Kumaraswamy Layout</td><td>Every 12 mins</td></tr>
        <tr><td><strong>MF-15</strong></td><td>RV Road / Jayanagar (Green)</td><td>BTM Layout 2nd Stage, Silk Board Junction</td><td>Every 10 mins</td></tr>
      </tbody></table></div>
    </section>
    <section><h2>Ticketing and payment on feeder buses</h2>
      <ul>
        <li><strong>Cash & UPI</strong>: Conductors issue printed tickets with QR codes for UPI payments (GPay, PhonePe).</li>
        <li><strong>BMTC Daily Pass</strong>: If you hold a ₹70 standard BMTC daily bus pass, it is valid on all non-AC MF routes without paying extra.</li>
        <li><strong>Vajra AC Pass</strong>: If travelling on air-conditioned feeder buses, a ₹120 Vajra daily pass is valid.</li>
      </ul>
    </section>
    <section><h2>First and last feeder bus timings</h2>
      <p>Most MF series buses begin operations at <strong>6:00 AM</strong> from metro station bays and run until <strong>10:30 PM</strong>, aligning with train arrival schedules at terminal and interchange stations.</p>
    </section>
    ${faqHtml(qa)}
    <section><h2>Related guides</h2><p><a href="how-to-use-namma-metro.html">First-time rider guide</a> · <a href="purple-line.html">Purple Line stations</a> · <a href="index.html">Plan your journey</a></p></section>`
  });
}

// 7. Lost and Found Helpline Guide
{
  const qa = [
    ['What should I do if I forget an item inside a Namma Metro train?', 'Immediately report it to the Station Controller at your destination station. Station controllers coordinate with the train operator and the terminal depot security to secure your item.'],
    ['Where is the Central Lost Property Office for Bengaluru Metro?', 'Items unclaimed within 48 hours at local stations are deposited at the BMRCL Central Lost Property Office located at Yeshwanthpur Metro Station (Concourse level, Green Line).'],
    ['What is the official Namma Metro customer care helpline number?', 'You can reach BMRCL customer care by calling toll-free 1800-425-12345 or landline 080-25191091, or by emailing travelhelp@bmrc.co.in.']
  ];
  pages.push({
    file: 'namma-metro-lost-and-found-helpline.html',
    updated: '2026-11-09',
    title: 'Namma Metro Lost and Found: How to Retrieve Lost Items & Helpline Contacts | Bengaluru',
    description: 'What to do if you lose your phone, wallet or bag on the Bengaluru Metro. Station controller contacts, Yeshwanthpur Central Lost Property Office, and BMRCL helpline.',
    h1: 'Namma Metro Lost and Found: Retrieval Steps & Helplines',
    lede: 'Every year thousands of wallets, laptops, umbrellas, and mobile phones are left on Bengaluru Metro seats. BMRCL operates a systematic Lost and Found cataloging procedure across all stations.',
    schema: [faq(qa)],
    body: `
    <div class="stats"><div><strong>1800-425-12345</strong><span>toll-free helpline</span></div><div><strong>080-25191091</strong><span>metro control helpline</span></div><div><strong>Yeshwanthpur</strong><span>central lost property office</span></div><div><strong>48 hours</strong><span>station holding period</span></div></div>
    <section><h2>Step-by-step retrieval procedure</h2>
      <ol class="steps">
        <li><strong>Alert the nearest Station Controller</strong>: Walk to the Station Control Room (located near the customer care desk) at the station where you exited. Provide the train direction, approximate coach number (front, middle, or rear), and time of travel.</li>
        <li><strong>Station Controller coordinates with train staff</strong>: If the train is still in transit or at the terminal loop (Whitefield, Challaghatta, Madavara, or Silk Institute), the station staff will radio train security to inspect the seat.</li>
        <li><strong>Item logged in Station Register</strong>: If recovered, the item is logged with a unique tracking number in the station\'s official Lost and Found register.</li>
        <li><strong>Claiming your property</strong>: Present a government photo identity card (Aadhaar, Passport, Voter ID) and verifiable proof of ownership (unlocking the smartphone, displaying matching serial numbers, or describing distinctive internal contents).</li>
      </ol>
    </section>
    <section><h2>Central Lost Property Office at Yeshwanthpur</h2>
      <p>If an item is not claimed at the local station within 48 hours, it is transferred under secure custody to the <strong>BMRCL Central Lost Property Office (LPO)</strong> located at <strong>Yeshwanthpur Metro Station</strong> (Green Line).</p>
      <ul>
        <li><strong>Location</strong>: Concourse Level, Yeshwanthpur Metro Station, Bengaluru - 560022.</li>
        <li><strong>Operating Hours</strong>: Monday to Saturday, 10:00 AM to 5:30 PM (closed on Sundays and public holidays).</li>
        <li><strong>Storage duration</strong>: Unclaimed general items are retained for up to 6 months before public auction or donation according to BMRCL regulations.</li>
      </ul>
    </section>
    <section><h2>Official emergency & customer care contacts</h2>
      <div class="table-wrap"><table><thead><tr><th>Contact Channel</th><th>Details</th><th>Operating Hours</th></tr></thead><tbody>
        <tr><td><strong>BMRCL Toll-Free Helpline</strong></td><td><code>1800-425-12345</code></td><td>5:00 AM – 11:30 PM daily</td></tr>
        <tr><td><strong>Central Control Room</strong></td><td><code>080-25191091</code> / <code>080-25191092</code></td><td>24/7 Operations</td></tr>
        <tr><td><strong>Email Support</strong></td><td><code>travelhelp@bmrc.co.in</code></td><td>Replies within 2 working days</td></tr>
        <tr><td><strong>Official BMRCL Portal</strong></td><td><a href="https://www.bmrc.co.in/" target="_blank" rel="noopener noreferrer">bmrc.co.in</a></td><td>Live notices & announcements</td></tr>
      </tbody></table></div>
    </section>
    ${faqHtml(qa)}
    <section><h2>Related guides</h2><p><a href="how-to-use-namma-metro.html">First-time rider guide</a> · <a href="namma-metro-timings.html">Metro timings</a> · <a href="index.html">Route finder</a></p></section>`
  });
}

// 8. Station-by-Station First and Last Train Timings
{
  const qa = [
    ['What time does the first Namma Metro train start in the morning?', 'On Monday through Saturday, the first train departs terminal stations (Challaghatta, Whitefield, Madavara, Silk Institute) at 5:00 AM. On Sundays, services start at 7:00 AM.'],
    ['What time does the last Namma Metro train leave at night?', 'The last trains depart from terminal stations at 11:00 PM on all days of the week. Connecting trains are coordinated at Majestic interchange until 11:25 PM.'],
    ['Does Namma Metro run late during IPL matches or New Year celebrations?', 'Yes. BMRCL regularly extends train operations until 1:00 AM or 2:00 AM on New Year\'s Eve and during IPL cricket matches played at M. Chinnaswamy Stadium (Cubbon Park and MG Road stations).']
  ];
  pages.push({
    file: 'namma-metro-first-and-last-train-timings.html',
    updated: '2026-11-09',
    title: 'Namma Metro First & Last Train Timings: Station-by-Station Timetable | Bengaluru',
    description: 'Complete first and last train timings for Purple Line, Green Line, and Yellow Line. Weekday, Saturday, Sunday and holiday departure schedules across terminal stations.',
    h1: 'Namma Metro First and Last Train Timings (Complete Timetable)',
    lede: 'Catching an early morning train or returning from late-night work in Bengaluru requires knowing precise first and last train departure times. Here is the verified timetable across all metro corridors.',
    schema: [faq(qa)],
    body: `
    <div class="stats"><div><strong>5:00 AM</strong><span>first train Mon–Sat</span></div><div><strong>7:00 AM</strong><span>first train Sunday</span></div><div><strong>11:00 PM</strong><span>last train daily</span></div><div><strong>11:25 PM</strong><span>Majestic sync connection</span></div></div>
    <section><h2>Terminal departure timetable</h2>
      <div class="table-wrap"><table><thead><tr><th>Metro Line</th><th>Originating Terminal</th><th>First Train (Mon–Sat)</th><th>First Train (Sunday)</th><th>Last Train (All Days)</th></tr></thead><tbody>
        <tr><td><span class="badge purple">Purple Line</span></td><td>Challaghatta</td><td>5:00 AM</td><td>7:00 AM</td><td>11:00 PM</td></tr>
        <tr><td><span class="badge purple">Purple Line</span></td><td>Whitefield (Kadugodi)</td><td>5:00 AM</td><td>7:00 AM</td><td>11:00 PM</td></tr>
        <tr><td><span class="badge green">Green Line</span></td><td>Madavara (BIEC)</td><td>5:00 AM</td><td>7:00 AM</td><td>11:00 PM</td></tr>
        <tr><td><span class="badge green">Green Line</span></td><td>Silk Institute</td><td>5:00 AM</td><td>7:00 AM</td><td>11:00 PM</td></tr>
        <tr><td><span class="badge yellow">Yellow Line</span></td><td>Rashtreeya Vidyalaya Road</td><td>6:00 AM</td><td>7:00 AM</td><td>10:00 PM</td></tr>
        <tr><td><span class="badge yellow">Yellow Line</span></td><td>Bommasandra</td><td>6:00 AM</td><td>7:00 AM</td><td>10:00 PM</td></tr>
      </tbody></table></div>
    </section>
    <section><h2>The Majestic 11:25 PM synchronized last train</h2>
      <p>To ensure commuters interchanging between Purple and Green Lines do not get stranded at night, BMRCL holds connecting trains at Nadaprabhu Kempegowda Station (Majestic) until <strong>11:25 PM</strong>. If you arrive at Majestic on an 11:00 PM departure from Challaghatta or Silk Institute, your connecting train towards Whitefield or Madavara will wait at the platform until all transfer passengers cross over.</p>
    </section>
    <section><h2>Peak vs non-peak train frequencies</h2>
      <ul>
        <li><strong>Morning Peak (8:30 AM – 10:30 AM)</strong>: A train arrives every <strong>3 to 5 minutes</strong> on the Purple Line central stretch (between Vijayanagar and Baiyappanahalli), and every 5 to 6 minutes on the Green Line.</li>
        <li><strong>Midday Off-Peak (11:00 AM – 4:30 PM)</strong>: A train arrives every <strong>8 to 10 minutes</strong> across all active lines.</li>
        <li><strong>Evening Peak (5:30 PM – 8:30 PM)</strong>: A train arrives every <strong>4 to 5 minutes</strong> on the Purple Line, and every 5 to 7 minutes on the Green Line.</li>
        <li><strong>Late Night (after 9:30 PM)</strong>: Frequency widens to <strong>12 to 15 minutes</strong> between trains.</li>
      </ul>
    </section>
    ${faqHtml(qa)}
    <section><h2>Related guides</h2><p><a href="namma-metro-timings.html">Detailed line frequency</a> · <a href="namma-metro-fares-tickets.html">Fares & ticket slabs</a> · <a href="index.html">Route finder</a></p></section>`
  });
}

// ---------- Guides hub ----------
pages.push({
  file: 'guides.html',
  title: 'Bengaluru Metro Guides: Lines, Timings, Fares & Routes | Namma Metro Navigator',
  description: 'Every Namma Metro Navigator guide in one place: line guides, first and last train timings, fares and tickets, a first-time rider guide and popular route guides.',
  h1: 'Bengaluru Metro guides',
  lede: 'Everything on this site in one place. Each guide uses the same station, timetable and fare data as the route finder.',
  type: 'website',
  body: `
    <section><h2>Essential Commuter Guides</h2><ul class="cards">
      <li><a href="namma-metro-smart-card-qr-tickets-guide.html">Smart Cards, QR Tickets & WhatsApp Booking</a><span>Discounts, online recharge, WhatsApp bot +91 81055 56677, and NCMC cards.</span></li>
      <li><a href="majestic-interchange-metro-guide.html">Majestic Metro Interchange Guide</a><span>Step-by-step walkthrough for changing between Purple & Green lines.</span></li>
      <li><a href="namma-metro-first-and-last-train-timings.html">First & Last Train Timings</a><span>Station-by-station departure timetable, peak gaps, and Majestic sync.</span></li>
      <li><a href="namma-metro-fares-tickets.html">Fares & Ticket Slabs</a><span>BMRCL distance fare slabs from ₹10 to ₹90 and payment options.</span></li>
      <li><a href="namma-metro-timings.html">Frequency & Day-by-Day Schedules</a><span>First and last trains and the gap between trains on every line and day.</span></li>
      <li><a href="how-to-use-namma-metro.html">First-Time Rider Guide</a><span>Tickets, security, platforms, and etiquette for beginners.</span></li>
    </ul></section>

    <section><h2>Connectivity & City Transit</h2><ul class="cards">
      <li><a href="bengaluru-airport-metro-feeder-bus-guide.html">Bengaluru Airport by Metro & Vayu Vajra</a><span>Combining Purple/Green lines with express AC buses to save ₹1,200 on cabs.</span></li>
      <li><a href="metro-feeder-buses-mf-routes-bangalore.html">Metro Feeder Buses (MF Series)</a><span>Connecting metro stations to Outer Ring Road, Manyata, and Whitefield tech parks.</span></li>
      <li><a href="namma-metro-parking-stations-charges.html">Station Parking Charges & Locations</a><span>Complete directory of two-wheeler and four-wheeler parking lots and tariffs.</span></li>
      <li><a href="namma-metro-luggage-travel-rules-penalties.html">Luggage Limits & Travel Rules</a><span>15 kg baggage rule, restricted items, alcohol prohibition, and penalty fines.</span></li>
      <li><a href="namma-metro-lost-and-found-helpline.html">Lost and Found & Helplines</a><span>How to retrieve forgotten belongings, station registers, and official helplines.</span></li>
    </ul></section>

    <section><h2>Line guides</h2><ul class="cards">${Object.entries(LINES).map(([l, m]) => `<li><a href="${m.slug}.html">${l}</a><span>${esc(m.from)} to ${esc(m.to)}: all stations, timings and tips.</span></li>`).join('')}</ul></section>
    <section><h2>Upcoming</h2><ul class="cards"><li><a href="pink-line.html">Pink Line opening date and stations</a><span>Kalena Agrahara to Tavarekere: 6 stations, expected around 15 Nov 2026.</span></li></ul></section>
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
const lastmod = Object.fromEntries(pages.map(p => [p.file, p.updated || BUILT]));
writeFileSync(join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapFiles.map(f => `  <url><loc>${SITE}/${f === 'index.html' ? '' : f}</loc><lastmod>${lastmod[f] || BUILT}</lastmod></url>`).join('\n')}
</urlset>
`);
console.log(`Wrote ${pages.length} pages and sitemap.xml`);
