// Station coordinates and names are maintained locally. See methodology.html for scope.
const STATIONS = {
  // PURPLE LINE
  "Challaghatta": { line: "Purple Line", order: 1, lat: 12.8974200, lng: 77.4612400 },
  "Kengeri": { line: "Purple Line", order: 2, lat: 12.9079540, lng: 77.4765118 },
  "Kengeri Bus Terminal": { line: "Purple Line", order: 3, lat: 12.9148975, lng: 77.4875928 },
  "Pattanagere": { line: "Purple Line", order: 4, lat: 12.9244147, lng: 77.4982564 },
  "Jnanabharathi": { line: "Purple Line", order: 5, lat: 12.9355559, lng: 77.5120187 },
  "Rajarajeshwari Nagar": { line: "Purple Line", order: 6, lat: 12.9367268, lng: 77.5195822 },
  "Pantharapalya - Nayandahalli": { line: "Purple Line", order: 7, lat: 12.9416700, lng: 77.5251200 },
  "Mysuru Road": { line: "Purple Line", order: 8, lat: 12.9467266, lng: 77.5300737 },
  "Deepanjali Nagar": { line: "Purple Line", order: 9, lat: 12.9522153, lng: 77.5371011 },
  "Attiguppe": { line: "Purple Line", order: 10, lat: 12.9619570, lng: 77.5335820 },
  "Vijayanagar": { line: "Purple Line", order: 11, lat: 12.9709156, lng: 77.5374015 },
  "Balagangadharanatha Swamiji Station, Hosahalli": { line: "Purple Line", order: 12, lat: 12.9743030, lng: 77.5454434 },
  "Magadi Road": { line: "Purple Line", order: 13, lat: 12.9756582, lng: 77.5554118 },
  "Krantivira Sangolli Rayanna Railway Station": { line: "Purple Line", order: 14, lat: 12.9758405, lng: 77.5657558 },
  "Nadaprabhu Kempegowda (Majestic)": { line: "Interchange", order: 15, lat: 12.9756893, lng: 77.5728703 },
  "Sir M. Visvesvaraya Station, Central College": { line: "Purple Line", order: 16, lat: 12.9742808, lng: 77.5839458 },
  "Dr. B. R. Ambedkar Station, Vidhana Soudha": { line: "Purple Line", order: 17, lat: 12.9787400, lng: 77.5916400 },
  "Cubbon Park": { line: "Purple Line", order: 18, lat: 12.9809006, lng: 77.5974655 },
  "MG Road": { line: "Purple Line", order: 19, lat: 12.9755000, lng: 77.6068000 },
  "Trinity": { line: "Purple Line", order: 20, lat: 12.9730000, lng: 77.6170000 },
  "Halasuru": { line: "Purple Line", order: 21, lat: 12.9756600, lng: 77.6262800 },
  "Indiranagar": { line: "Purple Line", order: 22, lat: 12.9783300, lng: 77.6386500 },
  "Swami Vivekananda Road": { line: "Purple Line", order: 23, lat: 12.9859103, lng: 77.6450043 },
  "Baiyappanahalli": { line: "Purple Line", order: 24, lat: 12.9906651, lng: 77.6525903 },
  "Benniganahalli": { line: "Purple Line", order: 25, lat: 12.9964275, lng: 77.6683160 },
  "K. R. Pura": { line: "Purple Line", order: 26, lat: 12.9999900, lng: 77.6779400 },
  "Singayyanapalya": { line: "Purple Line", order: 27, lat: 12.9967800, lng: 77.6921700 },
  "Garudacharpalya": { line: "Purple Line", order: 28, lat: 12.9935600, lng: 77.7037600 },
  "Hoodi": { line: "Purple Line", order: 29, lat: 12.9887300, lng: 77.7112700 },
  "Seetharampalya": { line: "Purple Line", order: 30, lat: 12.9809200, lng: 77.7088700 },
  "Kundalahalli": { line: "Purple Line", order: 31, lat: 12.9774610, lng: 77.7157610 },
  "Nallur Halli": { line: "Purple Line", order: 32, lat: 12.9765280, lng: 77.7247630 },
  "Sri Sathya Sai Hospital": { line: "Purple Line", order: 33, lat: 12.9810200, lng: 77.7276200 },
  "Pattandur Agrahara": { line: "Purple Line", order: 34, lat: 12.9876130, lng: 77.7382110 },
  "Kadugodi Tree Park": { line: "Purple Line", order: 35, lat: 12.9856500, lng: 77.7469000 },
  "Hopefarm Channasandra": { line: "Purple Line", order: 36, lat: 12.9879300, lng: 77.7540900 },
  "Whitefield (Kadugodi)": { line: "Purple Line", order: 37, lat: 12.9950700, lng: 77.7577700 },

  // GREEN LINE
  "Madavara": { line: "Green Line", order: 1, lat: 13.0574214, lng: 77.4728055 },
  "Chikkabidarakallu": { line: "Green Line", order: 2, lat: 13.0519444, lng: 77.4863889 },
  "Manjunathnagar": { line: "Green Line", order: 3, lat: 13.0502778, lng: 77.4944444 },
  "Nagasandra": { line: "Green Line", order: 4, lat: 13.0481315, lng: 77.5001257 },
  "Dasarahalli": { line: "Green Line", order: 5, lat: 13.0435416, lng: 77.5123791 },
  "Jalahalli": { line: "Green Line", order: 6, lat: 13.0395842, lng: 77.5198377 },
  "Peenya Industry": { line: "Green Line", order: 7, lat: 13.0363220, lng: 77.5257170 },
  "Peenya": { line: "Green Line", order: 8, lat: 13.0329868, lng: 77.5334693 },
  "Goraguntepalya": { line: "Green Line", order: 9, lat: 13.0284000, lng: 77.5402000 },
  "Yeshwanthpur": { line: "Green Line", order: 10, lat: 13.0232000, lng: 77.5499000 },
  "Sandal Soap Factory": { line: "Green Line", order: 11, lat: 13.0148000, lng: 77.5539000 },
  "Mahalakshmi": { line: "Green Line", order: 12, lat: 13.0083374, lng: 77.5488344 },
  "Rajajinagar": { line: "Green Line", order: 13, lat: 13.0003455, lng: 77.5497483 },
  "Mahakavi Kuvempu Road": { line: "Green Line", order: 14, lat: 12.9985024, lng: 77.5569474 },
  "Srirampura": { line: "Green Line", order: 15, lat: 12.9965259, lng: 77.5633565 },
  "Mantri Square Sampige Road": { line: "Green Line", order: 16, lat: 12.9905455, lng: 77.5708050 },
  "Chickpet": { line: "Green Line", order: 18, lat: 12.9675484, lng: 77.5747975 },
  "Krishna Rajendra Market": { line: "Green Line", order: 19, lat: 12.9564453, lng: 77.5735999 },
  "National College": { line: "Green Line", order: 20, lat: 12.9506136, lng: 77.5737360 },
  "Lalbagh": { line: "Green Line", order: 21, lat: 12.9462868, lng: 77.5800613 },
  "South End Circle": { line: "Green Line", order: 22, lat: 12.9383210, lng: 77.5800747 },
  "Jayanagar": { line: "Green Line", order: 23, lat: 12.9294558, lng: 77.5802873 },
  "Rashtreeya Vidyalaya Road": { line: "Interchange", order: 24, lat: 12.9215875, lng: 77.5802612 },
  "Banashankari": { line: "Green Line", order: 25, lat: 12.9155387, lng: 77.5736287 },
  "Jaya Prakash Nagar": { line: "Green Line", order: 26, lat: 12.9074229, lng: 77.5731788 },
  "Yelachenahalli": { line: "Green Line", order: 27, lat: 12.8959381, lng: 77.5701687 },
  "Konanakunte Cross": { line: "Green Line", order: 28, lat: 12.8890002, lng: 77.5626407 },
  "Doddakallasandra": { line: "Green Line", order: 29, lat: 12.8846862, lng: 77.5527510 },
  "Vajarahalli": { line: "Green Line", order: 30, lat: 12.8775389, lng: 77.5447450 },
  "Thalaghattapura": { line: "Green Line", order: 31, lat: 12.8714244, lng: 77.5383625 },
  "Silk Institute": { line: "Green Line", order: 32, lat: 12.8617700, lng: 77.5299900 },

  // YELLOW LINE
  "Ragigudda": { line: "Yellow Line", order: 2, lat: 12.9171100, lng: 77.5883700 },
  "Jayadeva Hospital": { line: "Yellow Line", order: 3, lat: 12.9167300, lng: 77.6000900 },
  "BTM Layout": { line: "Yellow Line", order: 4, lat: 12.9165600, lng: 77.6082500 },
  "Central Silk Board": { line: "Yellow Line", order: 5, lat: 12.9165200, lng: 77.6205600 },
  "Bommanahalli": { line: "Yellow Line", order: 6, lat: 12.9106600, lng: 77.6265700 },
  "Hongasandra": { line: "Yellow Line", order: 7, lat: 12.9016500, lng: 77.6320800 },
  "Kudlu Gate": { line: "Yellow Line", order: 8, lat: 12.8899200, lng: 77.6392900 },
  "Singasandra": { line: "Yellow Line", order: 9, lat: 12.8806900, lng: 77.6449800 },
  "Hosa Road": { line: "Yellow Line", order: 10, lat: 12.8707800, lng: 77.6524800 },
  "Beratena Agrahara": { line: "Yellow Line", order: 11, lat: 12.8638500, lng: 77.6579800 },
  "Electronic City": { line: "Yellow Line", order: 12, lat: 12.8564800, lng: 77.6636100 },
  "Infosys Foundation Konappana Agrahara": { line: "Yellow Line", order: 13, lat: 12.8464900, lng: 77.6711200 },
  "Huskur Road": { line: "Yellow Line", order: 14, lat: 12.8390100, lng: 77.6775400 },
  "Biocon Hebbagodi": { line: "Yellow Line", order: 15, lat: 12.8290900, lng: 77.6813300 },
  "Delta electronics Bommasandra": { line: "Yellow Line", order: 16, lat: 12.8193300, lng: 77.6883400 }
};

const STATION_ALIASES = {
  "Whitefield": "Whitefield (Kadugodi)",
  "Whitefield (Kadugodi)": "Whitefield (Kadugodi)",
  "Whitefield Kadugodi": "Whitefield (Kadugodi)",
  "Kadugodi": "Whitefield (Kadugodi)",
  "Rajarajeswari Nagar": "Rajarajeshwari Nagar",
  "Nallurhalli": "Nallur Halli",
  "Nallur Halli": "Nallur Halli",
  "Sadaramangala": "Sri Sathya Sai Hospital",
  "ITPL": "Sri Sathya Sai Hospital",
  "Sri Sathya Sai Hospital": "Sri Sathya Sai Hospital",
  "RV Road": "Rashtreeya Vidyalaya Road",
  "R V Road": "Rashtreeya Vidyalaya Road",
  "Konappana Agrahara": "Infosys Foundation Konappana Agrahara",
  "Hebbagodi": "Biocon Hebbagodi",
  "Bommasandra": "Delta electronics Bommasandra",
  "Delta Electronics Bommasandra": "Delta electronics Bommasandra",
  "Majestic": "Nadaprabhu Kempegowda (Majestic)"
};


// Interchange stations have a different position on each line. Never use their
// single legacy order field to infer a direction on another line.
const MAJESTIC = 'Nadaprabhu Kempegowda (Majestic)';
const RV_ROAD = 'Rashtreeya Vidyalaya Road';
const LINES = {
  'Purple Line': Object.keys(STATIONS).filter(name => STATIONS[name].line === 'Purple Line' || name === MAJESTIC).sort((a, b) => STATIONS[a].order - STATIONS[b].order),
  'Green Line': Object.keys(STATIONS).filter(name => STATIONS[name].line === 'Green Line' || name === MAJESTIC || name === RV_ROAD).sort((a, b) => (a === MAJESTIC ? 17 : STATIONS[a].order) - (b === MAJESTIC ? 17 : STATIONS[b].order)),
  'Yellow Line': [RV_ROAD, ...Object.keys(STATIONS).filter(name => STATIONS[name].line === 'Yellow Line').sort((a, b) => STATIONS[a].order - STATIONS[b].order)]
};
const GRAPH = Object.fromEntries(Object.keys(STATIONS).map(name => [name, []]));
for (const [line, stations] of Object.entries(LINES)) {
  for (let i = 1; i < stations.length; i++) {
    GRAPH[stations[i - 1]].push({ station: stations[i], line });
    GRAPH[stations[i]].push({ station: stations[i - 1], line });
  }
}
function normalizeName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
function resolveStation(value) {
  const key = normalizeName(value);
  if (!key) return null;
  return Object.keys(STATIONS).find(name => normalizeName(name) === key)
    || Object.entries(STATION_ALIASES).find(([alias]) => normalizeName(alias) === key)?.[1] || null;
}
function findRoute(from, to) {
  from = resolveStation(from); to = resolveStation(to);
  if (!from || !to) return null;
  const queue = [[from]];
  const seen = new Set([from]);
  while (queue.length) {
    const path = queue.shift();
    const last = path[path.length - 1];
    if (last === to) return path;
    for (const edge of GRAPH[last]) {
      if (!seen.has(edge.station)) { seen.add(edge.station); queue.push([...path, edge.station]); }
    }
  }
  return null;
}
function getJourney(from, to) {
  const path = findRoute(from, to);
  if (!path) return null;
  const segments = [];
  for (let i = 0; i < path.length - 1; i++) {
    const { line } = GRAPH[path[i]].find(edge => edge.station === path[i + 1]);
    let segment = segments[segments.length - 1];
    if (!segment || segment.line !== line) {
      const sequence = LINES[line];
      const direction = sequence.indexOf(path[i + 1]) > sequence.indexOf(path[i]) ? sequence[sequence.length - 1] : sequence[0];
      segment = { line, direction, from: path[i], to: path[i + 1], stops: [path[i], path[i + 1]] };
      segments.push(segment);
    } else {
      segment.to = path[i + 1]; segment.stops.push(path[i + 1]);
    }
  }
  return { path, segments, stops: path.length - 1, changes: Math.max(0, segments.length - 1) };
}
function distanceKm(lat1, lng1, lat2, lng2) {
  const radians = n => n * Math.PI / 180;
  const a = Math.sin(radians(lat2 - lat1) / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function nearestStation(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return Object.entries(STATIONS).map(([station, point]) => ({ station, distance: distanceKm(lat, lng, point.lat, point.lng) })).sort((a, b) => a.distance - b.distance)[0];
}
const MetroNetwork = { STATIONS, LINES, GRAPH, STATION_ALIASES, resolveStation, findRoute, getJourney, nearestStation };
if (typeof module !== 'undefined' && module.exports) module.exports = MetroNetwork;
if (typeof window !== 'undefined') window.MetroNetwork = MetroNetwork;
