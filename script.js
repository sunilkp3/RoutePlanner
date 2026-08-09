let watchId = null;
let isTracking = false;
let currentNearestStation = null;
let currentNearestStationDistanceMeters = null;
let fromStationSource = 'live';
let activeView = 'journey';
let currentPanel = 'unselected';
let currentRoutePath = [];
let currentMapView = { x: 0, y: 0, width: 1100, height: 760 };
let leafletMap = null;
let leafletLayerGroup = null;
let leafletBaseLayers = null;
let lastLeafletFocusKey = '';
let lastLeafletRenderKey = '';
let leafletUserTouched = false;
let leafletProgrammaticFit = false;
let leafletAutoFitRequested = true;
let suppressLiveAutoFillUntilBlur = false;
let fromInputIdleAutoFillTimer = null;

// Track selected departure train schedule index
let selectedTrainIndex = 0;
const JOURNEY_REFRESH_INTERVAL_MS = 15000;

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

const ADJACENCY = {
  "Challaghatta": ["Kengeri"],
  "Kengeri": ["Challaghatta", "Kengeri Bus Terminal"],
  "Kengeri Bus Terminal": ["Kengeri", "Pattanagere"],
  "Pattanagere": ["Kengeri Bus Terminal", "Jnanabharathi"],
  "Jnanabharathi": ["Pattanagere", "Rajarajeshwari Nagar"],
  "Rajarajeshwari Nagar": ["Jnanabharathi", "Pantharapalya - Nayandahalli"],
  "Pantharapalya - Nayandahalli": ["Rajarajeshwari Nagar", "Mysuru Road"],
  "Mysuru Road": ["Pantharapalya - Nayandahalli", "Deepanjali Nagar"],
  "Deepanjali Nagar": ["Mysuru Road", "Attiguppe"],
  "Attiguppe": ["Deepanjali Nagar", "Vijayanagar"],
  "Vijayanagar": ["Attiguppe", "Balagangadharanatha Swamiji Station, Hosahalli"],
  "Balagangadharanatha Swamiji Station, Hosahalli": ["Vijayanagar", "Magadi Road"],
  "Magadi Road": ["Balagangadharanatha Swamiji Station, Hosahalli", "Krantivira Sangolli Rayanna Railway Station"],
  "Krantivira Sangolli Rayanna Railway Station": ["Magadi Road", "Nadaprabhu Kempegowda (Majestic)"],
  "Nadaprabhu Kempegowda (Majestic)": ["Krantivira Sangolli Rayanna Railway Station", "Sir M. Visvesvaraya Station, Central College", "Mantri Square Sampige Road", "Chickpet"],
  "Sir M. Visvesvaraya Station, Central College": ["Nadaprabhu Kempegowda (Majestic)", "Dr. B. R. Ambedkar Station, Vidhana Soudha"],
  "Dr. B. R. Ambedkar Station, Vidhana Soudha": ["Sir M. Visvesvaraya Station, Central College", "Cubbon Park"],
  "Cubbon Park": ["Dr. B. R. Ambedkar Station, Vidhana Soudha", "MG Road"],
  "MG Road": ["Cubbon Park", "Trinity"],
  "Trinity": ["MG Road", "Halasuru"],
  "Halasuru": ["Trinity", "Indiranagar"],
  "Indiranagar": ["Halasuru", "Swami Vivekananda Road"],
  "Swami Vivekananda Road": ["Indiranagar", "Baiyappanahalli"],
  "Baiyappanahalli": ["Swami Vivekananda Road", "Benniganahalli"],
  "Benniganahalli": ["Baiyappanahalli", "K. R. Pura"],
  "K. R. Pura": ["Benniganahalli", "Singayyanapalya"],
  "Singayyanapalya": ["K. R. Pura", "Garudacharpalya"],
  "Garudacharpalya": ["Singayyanapalya", "Hoodi"],
  "Hoodi": ["Garudacharpalya", "Seetharampalya"],
  "Seetharampalya": ["Hoodi", "Kundalahalli"],
  "Kundalahalli": ["Seetharampalya", "Nallur Halli"],
  "Nallur Halli": ["Kundalahalli", "Sri Sathya Sai Hospital"],
  "Sri Sathya Sai Hospital": ["Nallur Halli", "Pattandur Agrahara"],
  "Pattandur Agrahara": ["Sri Sathya Sai Hospital", "Kadugodi Tree Park"],
  "Kadugodi Tree Park": ["Pattandur Agrahara", "Hopefarm Channasandra"],
  "Hopefarm Channasandra": ["Kadugodi Tree Park", "Whitefield (Kadugodi)"],
  "Whitefield (Kadugodi)": ["Hopefarm Channasandra"],

  "Madavara": ["Chikkabidarakallu"],
  "Chikkabidarakallu": ["Madavara", "Manjunathnagar"],
  "Manjunathnagar": ["Chikkabidarakallu", "Nagasandra"],
  "Nagasandra": ["Manjunathnagar", "Dasarahalli"],
  "Dasarahalli": ["Nagasandra", "Jalahalli"],
  "Jalahalli": ["Dasarahalli", "Peenya Industry"],
  "Peenya Industry": ["Jalahalli", "Peenya"],
  "Peenya": ["Peenya Industry", "Goraguntepalya"],
  "Goraguntepalya": ["Peenya", "Yeshwanthpur"],
  "Yeshwanthpur": ["Goraguntepalya", "Sandal Soap Factory"],
  "Sandal Soap Factory": ["Yeshwanthpur", "Mahalakshmi"],
  "Mahalakshmi": ["Sandal Soap Factory", "Rajajinagar"],
  "Rajajinagar": ["Mahalakshmi", "Mahakavi Kuvempu Road"],
  "Mahakavi Kuvempu Road": ["Rajajinagar", "Srirampura"],
  "Srirampura": ["Mahakavi Kuvempu Road", "Mantri Square Sampige Road"],
  "Mantri Square Sampige Road": ["Srirampura", "Nadaprabhu Kempegowda (Majestic)"],
  "Chickpet": ["Nadaprabhu Kempegowda (Majestic)", "Krishna Rajendra Market"],
  "Krishna Rajendra Market": ["Chickpet", "National College"],
  "National College": ["Krishna Rajendra Market", "Lalbagh"],
  "Lalbagh": ["National College", "South End Circle"],
  "South End Circle": ["Lalbagh", "Jayanagar"],
  "Jayanagar": ["South End Circle", "Rashtreeya Vidyalaya Road"],
  "Rashtreeya Vidyalaya Road": ["Jayanagar", "Banashankari", "Ragigudda"],
  "Banashankari": ["Rashtreeya Vidyalaya Road", "Jaya Prakash Nagar"],
  "Jaya Prakash Nagar": ["Banashankari", "Yelachenahalli"],
  "Yelachenahalli": ["Jaya Prakash Nagar", "Konanakunte Cross"],
  "Konanakunte Cross": ["Yelachenahalli", "Doddakallasandra"],
  "Doddakallasandra": ["Konanakunte Cross", "Vajarahalli"],
  "Vajarahalli": ["Doddakallasandra", "Thalaghattapura"],
  "Thalaghattapura": ["Vajarahalli", "Silk Institute"],
  "Silk Institute": ["Thalaghattapura"],

  "Ragigudda": ["Rashtreeya Vidyalaya Road", "Jayadeva Hospital"],
  "Jayadeva Hospital": ["Ragigudda", "BTM Layout"],
  "BTM Layout": ["Jayadeva Hospital", "Central Silk Board"],
  "Central Silk Board": ["BTM Layout", "Bommanahalli"],
  "Bommanahalli": ["Central Silk Board", "Hongasandra"],
  "Hongasandra": ["Bommanahalli", "Kudlu Gate"],
  "Kudlu Gate": ["Hongasandra", "Singasandra"],
  "Singasandra": ["Kudlu Gate", "Hosa Road"],
  "Hosa Road": ["Singasandra", "Beratena Agrahara"],
  "Beratena Agrahara": ["Hosa Road", "Electronic City"],
  "Electronic City": ["Beratena Agrahara", "Infosys Foundation Konappana Agrahara"],
  "Infosys Foundation Konappana Agrahara": ["Electronic City", "Huskur Road"],
  "Huskur Road": ["Infosys Foundation Konappana Agrahara", "Biocon Hebbagodi"],
  "Biocon Hebbagodi": ["Huskur Road", "Delta electronics Bommasandra"],
  "Delta electronics Bommasandra": ["Biocon Hebbagodi"]
};

const STATION_ALIASES = {
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
  "Delta electronics Bommasandra": "Delta electronics Bommasandra"
};

const stationNames = Object.keys(STATIONS).sort();

const LINE_COLORS = {
  "Purple Line": "#a855f7",
  "Green Line": "#22c55e",
  "Yellow Line": "#eab308",
  "Interchange": "#f59e0b"
};

const BMRC_TIMETABLES = {
  "Purple Line": {
    updated: "2025-12-24",
    monday: {
      toWhitefield: [[255, 275, 20], [275, 315, 15], [315, 414, 11], [414, 765, 10], [765, 1005, 8], [1005, 1385, 10]],
      toChallaghatta: [[255, 275, 20], [275, 300, 13], [300, 657, 10], [657, 921, 8], [921, 1321, 10], [1321, 1365, 15]]
    },
    weekday: {
      toWhitefield: [[300, 320, 20], [320, 360, 15], [360, 414, 11], [414, 740, 10], [740, 962, 8], [962, 1385, 10]],
      toChallaghatta: [[300, 320, 20], [320, 657, 10], [657, 921, 8], [921, 1321, 10], [1321, 1365, 15]]
    },
    saturday: {
      toWhitefield: [[300, 320, 20], [320, 360, 15], [360, 414, 11], [414, 740, 10], [740, 1005, 8], [1005, 1385, 10]],
      toChallaghatta: [[300, 320, 20], [320, 657, 10], [657, 921, 8], [921, 1321, 10], [1321, 1365, 15]]
    },
    sunday: {
      toWhitefield: [[420, 470, 15], [470, 720, 10], [720, 1288, 8], [1288, 1385, 10]],
      toChallaghatta: [[420, 633, 10], [633, 1201, 8], [1201, 1351, 10], [1351, 1365, 14]]
    }
  },
  "Green Line": {
    updated: "2025-12-24",
    monday: {
      toSilkInstitute: [[255, 280, 25], [300, 375, 15], [375, 625, 10], [625, 639, 7], [639, 951, 8], [951, 1184, 10], [1184, 1224, 8], [1224, 1360, 10], [1360, 1377, 15]],
      toMadavara: [[255, 300, 20], [300, 420, 15], [420, 669, 10], [669, 1008, 8], [1008, 1229, 10], [1229, 1290, 8], [1290, 1360, 10], [1360, 1385, 12.5]]
    },
    weekday: {
      toSilkInstitute: [[300, 375, 15], [375, 625, 11], [625, 639, 7], [639, 951, 8], [951, 1184, 10], [1184, 1224, 8], [1224, 1324, 10], [1324, 1360, 10], [1360, 1377, 15]],
      toMadavara: [[300, 420, 15], [420, 669, 10], [669, 1008, 8], [1008, 1229, 10], [1229, 1290, 8], [1290, 1360, 10], [1360, 1385, 12.5]]
    },
    saturday: {
      toSilkInstitute: [[300, 375, 15], [375, 639, 11], [639, 961, 8], [961, 983, 5.5], [983, 1192, 11], [1192, 1224, 8], [1224, 1324, 10], [1324, 1380, 15]],
      toMadavara: [[300, 420, 15], [420, 713, 11], [713, 1008, 8], [1008, 1257, 11], [1257, 1290, 8], [1290, 1360, 10], [1360, 1385, 12.5]]
    },
    sunday: {
      toSilkInstitute: [[420, 647, 10], [647, 1215, 8], [1215, 1325, 10], [1325, 1349, 12], [1349, 1380, 15]],
      toMadavara: [[420, 478, 15], [478, 728, 10], [728, 1304, 8], [1304, 1364, 10], [1364, 1385, 12]]
    }
  },
  "Yellow Line": {
    updated: "2026-06-03",
    monday: {
      toBommasandra: [[305, 335, 30], [335, 360, 25], [360, 400, 20], [400, 416, 16], [416, 427, 11], [427, 507, 10], [507, 563, 8], [563, 633, 7], [633, 665, 8], [665, 1005, 10], [1005, 1138, 7], [1138, 1234, 8], [1234, 1294, 10], [1294, 1305, 11], [1305, 1340, 12], [1340, 1360, 20], [1360, 1435, 25]],
      toRvRoad: [[305, 335, 30], [335, 360, 20], [360, 380, 20], [380, 470, 10], [470, 526, 8], [526, 589, 7], [589, 629, 8], [629, 969, 10], [969, 1109, 7], [1109, 1197, 8], [1197, 1257, 10], [1257, 1353, 12], [1353, 1362, 9]]
    },
    weekday: {
      toBommasandra: [[360, 400, 20], [400, 416, 16], [416, 427, 11], [427, 507, 10], [507, 563, 8], [563, 633, 7], [633, 665, 8], [665, 1005, 10], [1005, 1138, 7], [1138, 1234, 8], [1234, 1294, 10], [1294, 1305, 11], [1305, 1340, 12], [1340, 1360, 20], [1360, 1435, 25]],
      toRvRoad: [[360, 380, 20], [380, 470, 10], [470, 526, 8], [526, 589, 7], [589, 629, 8], [629, 969, 10], [969, 1109, 7], [1109, 1197, 8], [1197, 1257, 10], [1257, 1353, 12], [1353, 1362, 9]]
    },
    saturday: {
      toBommasandra: [[360, 385, 20], [385, 425, 20], [425, 440, 15], [440, 451, 11], [451, 1231, 10], [1231, 1327, 12], [1327, 1345, 18], [1345, 1385, 20], [1385, 1435, 25]],
      toRvRoad: [[360, 400, 20], [400, 415, 15], [415, 1195, 10], [1195, 1351, 12], [1351, 1362, 11]]
    },
    sunday: {
      toBommasandra: [[420, 528, 18], [528, 598, 14], [598, 646, 12], [646, 1256, 10], [1256, 1340, 12], [1340, 1370, 15], [1370, 1410, 20], [1410, 1435, 25]],
      toRvRoad: [[420, 492, 18], [492, 548, 14], [548, 620, 12], [620, 1220, 10], [1220, 1352, 12], [1352, 1362, 10]]
    }
  }
};

// Helper Utilities
function getMapPoint(stationName) {
  const station = STATIONS[stationName];
  const minLng = 77.45;
  const maxLng = 77.77;
  const minLat = 12.81;
  const maxLat = 13.07;
  const x = 70 + ((station.lng - minLng) / (maxLng - minLng)) * 960;
  const y = 670 - ((station.lat - minLat) / (maxLat - minLat)) * 570;
  return { x, y };
}

function shortMapLabel(name) {
  return name
    .replace("Nadaprabhu Kempegowda (Majestic)", "Majestic")
    .replace("Rashtreeya Vidyalaya Road", "RV Road")
    .replace("Balagangadharanatha Swamiji Station, Hosahalli", "Hosahalli")
    .replace("Krantivira Sangolli Rayanna Railway Station", "KSR Station")
    .replace("Sir M. Visvesvaraya Station, Central College", "Central College")
    .replace("Dr. B. R. Ambedkar Station, Vidhana Soudha", "Vidhana Soudha")
    .replace("Pantharapalya - Nayandahalli", "Nayandahalli")
    .replace("Sri Sathya Sai Hospital", "Sathya Sai")
    .replace("Hopefarm Channasandra", "Hopefarm")
    .replace("Whitefield (Kadugodi)", "Whitefield")
    .replace("Infosys Foundation Konappana Agrahara", "Konappana Agrahara")
    .replace("Biocon Hebbagodi", "Hebbagodi")
    .replace("Delta electronics Bommasandra", "Bommasandra");
}

function normalizeStationName(name) {
  const trimmed = name.trim();
  return STATION_ALIASES[trimmed] || trimmed;
}

function minutesToTime(totalMinutes) {
  const minutes = Math.round(totalMinutes);
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getScheduleKey(date = new Date()) {
  const day = date.getDay();
  if (day === 0) return "sunday";
  if (day === 1) return "monday";
  if (day === 6) return "saturday";
  return "weekday";
}

function getDirectionKey(line, directionText) {
  if (line === "Purple Line") return directionText.includes("Whitefield") ? "toWhitefield" : "toChallaghatta";
  if (line === "Green Line") return directionText.includes("Silk Institute") ? "toSilkInstitute" : "toMadavara";
  if (line === "Yellow Line") return directionText.includes("Bommasandra") ? "toBommasandra" : "toRvRoad";
  return null;
}

function getLineForSegment(current, next) {
  if (STATIONS[current].line !== "Interchange") return STATIONS[current].line;
  if (STATIONS[next].line !== "Interchange") return STATIONS[next].line;
  return STATIONS[next].line || "Purple Line";
}

function getPlatformDetails(current, next) {
  const line = getLineForSegment(current, next);

  if (current === "Nadaprabhu Kempegowda (Majestic)") {
    if (line === "Purple Line") {
      const eastBound = ["Sir M. Visvesvaraya Station, Central College", "Cubbon Park", "MG Road", "Indiranagar", "K. R. Pura", "Sri Sathya Sai Hospital", "Whitefield (Kadugodi)"];
      return eastBound.includes(next)
        ? { platform: "Platform 1 (Level 1)", direction: "Towards Whitefield (Kadugodi)", line }
        : { platform: "Platform 2 (Level 1)", direction: "Towards Challaghatta", line };
    } else {
      const southBound = ["Chickpet", "Krishna Rajendra Market", "National College", "Jayanagar", "Rashtreeya Vidyalaya Road", "Silk Institute"];
      return southBound.includes(next)
        ? { platform: "Platform 4 (Level 2)", direction: "Towards Silk Institute", line }
        : { platform: "Platform 3 (Level 2)", direction: "Towards Madavara", line };
    }
  }

  if (current === "Rashtreeya Vidyalaya Road") {
    if (line === "Yellow Line") {
      return { platform: "Platform 3 (Yellow Line Concourse)", direction: "Towards Delta electronics Bommasandra", line };
    } else {
      const southBound = ["Banashankari", "Yelachenahalli", "Silk Institute"];
      return southBound.includes(next)
        ? { platform: "Platform 2 (Green Line)", direction: "Towards Silk Institute", line }
        : { platform: "Platform 1 (Green Line)", direction: "Towards Madavara / Majestic", line };
    }
  }

  if (line === "Purple Line") {
    const eastBound = ["Sir M. Visvesvaraya Station, Central College", "MG Road", "Indiranagar", "K. R. Pura", "Sri Sathya Sai Hospital", "Whitefield (Kadugodi)"];
    return eastBound.includes(next) || (STATIONS[next]?.order > STATIONS[current]?.order)
      ? { platform: "Platform 1", direction: "Towards Whitefield (Kadugodi)", line }
      : { platform: "Platform 2", direction: "Towards Challaghatta", line };
  } else if (line === "Yellow Line") {
    return STATIONS[next]?.order > STATIONS[current]?.order
      ? { platform: "Platform 2", direction: "Towards Delta electronics Bommasandra", line }
      : { platform: "Platform 1", direction: "Towards Rashtreeya Vidyalaya Road", line };
  } else {
    const southBound = ["Chickpet", "National College", "Jayanagar", "Rashtreeya Vidyalaya Road", "Silk Institute"];
    return southBound.includes(next) || (STATIONS[next]?.order > STATIONS[current]?.order)
      ? { platform: "Platform 2", direction: "Towards Silk Institute", line }
      : { platform: "Platform 1", direction: "Towards Madavara", line };
  }
}

// Timetable Calculation Engines
function getNextTrainArrival(routeInfo, offsetMinutes = 0) {
  const directionText = typeof routeInfo === "string" ? routeInfo : routeInfo.direction;
  const line = typeof routeInfo === "string" ? null : routeInfo.line;
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMins = hours * 60 + minutes + offsetMinutes;
  const timetable = BMRC_TIMETABLES[line];
  const directionKey = timetable ? getDirectionKey(line, directionText) : null;
  const bands = directionKey ? timetable[getScheduleKey(now)]?.[directionKey] : null;

  if (!bands) {
    return { mins: "See BMRCL", minsNumeric: 0, detail: `Check BMRCL official timetable (${directionText})`, dateObj: null, isAvailable: false };
  }

  let activeBand = bands.find(([start, end]) => totalMins >= start && totalMins <= end);
  let nextMins;

  if (activeBand) {
    const [start, end, headway] = activeBand;
    const elapsed = Math.max(0, totalMins - start);
    nextMins = headway - (elapsed % headway);
    if (nextMins <= 0) nextMins += headway;
    const serviceEnd = minutesToTime(end);
    const depTime = new Date(now.getTime() + (totalMins - (hours * 60 + minutes) + nextMins) * 60000);
    const depTimeString = depTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      mins: `${Math.ceil(nextMins + offsetMinutes)} min${Math.ceil(nextMins + offsetMinutes) > 1 ? 's' : ''}`,
      minsNumeric: Math.ceil(nextMins + offsetMinutes),
      detail: `Expected at ${depTimeString} (${directionText}) • BMRCL ${headway} min frequency until ${serviceEnd}`,
      dateObj: depTime,
      isAvailable: true,
      headway
    };
  }

  const upcomingBand = bands.find(([start]) => totalMins < start);
  if (!upcomingBand) {
    const firstStart = minutesToTime(bands[0][0]);
    const lastEnd = minutesToTime(bands[bands.length - 1][1]);
    return { mins: "No Service", minsNumeric: 0, detail: `${line} ${directionText}: BMRCL timetable window is ${firstStart} - ${lastEnd}`, dateObj: null, isAvailable: false };
  }

  nextMins = upcomingBand[0] - totalMins;
  const depTime = new Date(now.getTime() + (totalMins - (hours * 60 + minutes) + nextMins) * 60000);
  const depTimeString = depTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return {
    mins: `${Math.ceil(nextMins + offsetMinutes)} min${Math.ceil(nextMins + offsetMinutes) > 1 ? 's' : ''}`,
    minsNumeric: Math.ceil(nextMins + offsetMinutes),
    detail: `First scheduled service at ${depTimeString} (${directionText}) • BMRCL timetable`,
    dateObj: depTime,
    isAvailable: true,
    headway: upcomingBand[2] || 10
  };
}

function getMultipleUpcomingTrainArrivals(routeInfo, count = 3) {
  const results = [];
  let cumulativeOffset = 0;

  for (let i = 0; i < count; i++) {
    const schedule = getNextTrainArrival(routeInfo, cumulativeOffset);
    if (!schedule.isAvailable) {
      if (i === 0) results.push(schedule);
      break;
    }
    results.push(schedule);
    const headway = schedule.headway || 10;
    cumulativeOffset += headway;
  }
  return results;
}

function findShortestPath(start, goal) {
  let queue = [[start]];
  let visited = new Set([start]);

  while (queue.length > 0) {
    let path = queue.shift();
    let node = path[path.length - 1];

    if (node === goal) return path;

    for (let neighbor of (ADJACENCY[node] || [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  return null;
}

// UI Render Functions
function renderUnselectedDualDirections(boardingStation) {
  const container = document.getElementById('unselected-dual-container');
  container.innerHTML = '';
  currentPanel = 'unselected';
  currentRoutePath = [];
  
  const quickContainer = document.getElementById('quick-schedules-container');
  if (quickContainer) quickContainer.style.display = 'none';

  updatePanelVisibility();
  renderMetroMap();

  if (!STATIONS[boardingStation]) return;

  const line = STATIONS[boardingStation]?.line === "Interchange" ? "Purple Line" : STATIONS[boardingStation]?.line;
  let directions = [];

  if (line === "Purple Line") {
    directions = [
      { label: "Platform 1", dir: "Towards Whitefield (Kadugodi)", line, offset: 0 },
      { label: "Platform 2", dir: "Towards Challaghatta", line, offset: 3 }
    ];
  } else if (line === "Green Line") {
    directions = [
      { label: "Platform 2", dir: "Towards Silk Institute", line, offset: 0 },
      { label: "Platform 1", dir: "Towards Madavara", line, offset: 4 }
    ];
  } else {
    directions = [
      { label: "Platform 2", dir: "Towards Delta electronics Bommasandra", line, offset: 0 },
      { label: "Platform 1", dir: "Towards Rashtreeya Vidyalaya Road", line, offset: 3 }
    ];
  }

  directions.forEach(d => {
    const schedule = getNextTrainArrival({ direction: d.dir, line: d.line }, d.offset);
    const box = document.createElement('div');
    box.className = 'next-train-box';
    box.innerHTML = `
      <div>
        <div class="time-title">${d.label} • ${d.dir}</div>
        <div class="time-sub">${schedule.detail}</div>
      </div>
      <div class="time-val ${!schedule.isAvailable ? 'no-service' : ''}">${schedule.mins}</div>
    `;
    container.appendChild(box);
  });
}

function renderQuickSchedulesBar(platInfo, schedules) {
  const container = document.getElementById('quick-schedules-container');
  const list = document.getElementById('quick-schedules-list');
  
  if (!container || !list) return;

  if (!schedules || schedules.length === 0 || !schedules[0].isAvailable) {
    container.style.display = 'none';
    return;
  }

  const visibleSchedules = schedules.slice(0, 5);
  list.innerHTML = '';

  visibleSchedules.forEach((schedule, idx) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `quick-schedule-chip ${idx === selectedTrainIndex ? 'active' : ''}`;
    chip.innerHTML = `🚆 in ${schedule.minsNumeric} min${schedule.minsNumeric > 1 ? 's' : ''}`;
    
    chip.addEventListener('click', () => {
      selectedTrainIndex = idx;
      document.querySelectorAll('.quick-schedule-chip').forEach((c, i) => {
        c.classList.toggle('active', i === idx);
      });
      updateRouteScheduleView(visibleSchedules);
    });

    list.appendChild(chip);
  });

  container.style.display = 'block';
}

function renderSingleSelectedRouteTrain(platInfo, schedules) {
  const container = document.getElementById('single-route-train-container');
  container.innerHTML = '';

  const visibleSchedules = schedules.slice(0, 5);
  const activeSchedule = visibleSchedules[selectedTrainIndex] || visibleSchedules[0];

  if (!activeSchedule) {
    container.innerHTML = '<div class="next-train-box">No train schedule available.</div>';
    return null;
  }

  const box = document.createElement('div');
  box.className = 'next-train-box active-route-dir';
  box.innerHTML = `
    <div>
      <div class="time-title">
        ${platInfo.platform} • ${platInfo.direction}
        <span class="live-tag">SELECTED TRAIN</span>
      </div>
      <div class="time-sub">${activeSchedule.detail}</div>
    </div>
    <div class="time-val ${!activeSchedule.isAvailable ? 'no-service' : ''}">${activeSchedule.mins}</div>
  `;
  container.appendChild(box);

  return activeSchedule;
}

function refreshSelectedRouteJourney() {
  const path = currentRoutePath;
  if (!path || path.length < 2) return;

  const firstPlatInfo = getPlatformDetails(path[0], path[1]);
  const schedules = getMultipleUpcomingTrainArrivals(firstPlatInfo, 5);
  renderQuickSchedulesBar(firstPlatInfo, schedules);
  updateRouteScheduleView(schedules);
}

function updateRouteScheduleView(schedules) {
  const path = currentRoutePath;
  if (!path || path.length < 2) return;

  const firstPlatInfo = getPlatformDetails(path[0], path[1]);
  const activeSchedule = renderSingleSelectedRouteTrain(firstPlatInfo, schedules);

  const noServiceBanner = document.getElementById('no-service-banner');
  if (!activeSchedule || !activeSchedule.isAvailable) {
    noServiceBanner.style.display = 'block';
  } else {
    noServiceBanner.style.display = 'none';
  }

  let runningTime = (activeSchedule && activeSchedule.dateObj) ? new Date(activeSchedule.dateObj.getTime()) : new Date();

  const timeline = document.getElementById('timeline');
  timeline.innerHTML = '';

  let currentLine = null;

  for (let i = 0; i < path.length; i++) {
    const station = path[i];
    const isStart = i === 0;
    const isEnd = i === path.length - 1;
    const nextStation = path[i + 1];
    const isLivePos = (currentNearestStation === station);

    if (i > 0) {
      const prevStation = path[i - 1];
      const isPrevInterchange = STATIONS[prevStation]?.line === "Interchange";
      const extraMins = isPrevInterchange ? 5 : 2.5;
      runningTime = new Date(runningTime.getTime() + extraMins * 60000);
    }

    const timeTagHTML = (activeSchedule && activeSchedule.isAvailable)
      ? `<span class="arrival-time-tag">${isStart ? 'Dep:' : 'Arr:'} ${runningTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`
      : `<span class="arrival-time-tag no-service-tag">No Service</span>`;

    let stepDiv = document.createElement('div');
    stepDiv.className = 'step' + (isLivePos ? ' live-location-active' : '');

    if (isStart) {
      const platInfo = getPlatformDetails(station, nextStation);
      currentLine = platInfo.line;
      const colorClass = currentLine === "Purple Line" ? "purple" : (currentLine === "Yellow Line" ? "yellow" : "green");

      stepDiv.innerHTML = `
        <div class="badge ${colorClass}">1</div>
        <div class="step-content">
          <div class="step-header-row">
            <div class="step-title">
              Boarding at ${station}
              ${isLivePos ? '<span class="live-tag">YOU ARE HERE</span>' : ''}
            </div>
            ${timeTagHTML}
          </div>
          <div class="step-desc">Board the <strong>${currentLine}</strong> train.</div>
          <div class="platform-tag">${platInfo.platform} • ${platInfo.direction}</div>
        </div>
      `;
    } else if (isEnd) {
      const colorClass = currentLine === "Purple Line" ? "purple" : (currentLine === "Yellow Line" ? "yellow" : "green");
      stepDiv.innerHTML = `
        <div class="badge ${colorClass}">✓</div>
        <div class="step-content">
          <div class="step-header-row">
            <div class="step-title">
              Arrive at ${station}
              ${isLivePos ? '<span class="live-tag">YOU ARE HERE</span>' : ''}
            </div>
            ${timeTagHTML}
          </div>
          <div class="step-desc">Exit through fare gates. Journey complete.</div>
        </div>
      `;
    } else if (STATIONS[station].line === "Interchange") {
      const nextPlat = getPlatformDetails(station, nextStation);
      const lineChanged = currentLine !== nextPlat.line;
      currentLine = nextPlat.line;

      if (!lineChanged) {
        const colorClass = currentLine === "Purple Line" ? "purple" : (currentLine === "Yellow Line" ? "yellow" : "green");
        stepDiv.innerHTML = `
          <div class="badge ${colorClass}">•</div>
          <div class="step-content">
            <div class="step-header-row">
              <div class="step-title">
                ${station}
                ${isLivePos ? '<span class="live-tag">YOU ARE HERE</span>' : ''}
              </div>
              ${timeTagHTML}
            </div>
            <div class="step-desc">En-route station</div>
          </div>
        `;
      } else {
        stepDiv.innerHTML = `
          <div class="badge interchange">⇄</div>
          <div class="step-content">
            <div class="step-header-row">
              <div class="step-title">
                Interchange at ${station}
                ${isLivePos ? '<span class="live-tag">YOU ARE HERE</span>' : ''}
              </div>
              ${timeTagHTML}
            </div>
            <div class="alert"><strong>Line Switch:</strong> Transfer to <strong>${nextPlat.line}</strong> using concourse walkway/stairs.</div>
            <div class="platform-tag">${nextPlat.platform} • ${nextPlat.direction}</div>
          </div>
        `;
      }
    } else {
      const colorClass = currentLine === "Purple Line" ? "purple" : (currentLine === "Yellow Line" ? "yellow" : "green");
      stepDiv.innerHTML = `
        <div class="badge ${colorClass}">•</div>
        <div class="step-content">
          <div class="step-header-row">
            <div class="step-title">
              ${station}
              ${isLivePos ? '<span class="live-tag">YOU ARE HERE</span>' : ''}
            </div>
            ${timeTagHTML}
          </div>
          <div class="step-desc">En-route station</div>
        </div>
      `;
    }

    timeline.appendChild(stepDiv);
  }
}

function updatePanelVisibility() {
  document.getElementById('map-card').style.display = activeView === 'map' ? 'block' : 'none';
  document.getElementById('unselected-card').style.display = activeView === 'journey' && currentPanel === 'unselected' ? 'block' : 'none';
  document.getElementById('result-card').style.display = activeView === 'journey' && currentPanel === 'result' ? 'block' : 'none';
  document.getElementById('journey-view-btn').classList.toggle('active', activeView === 'journey');
  document.getElementById('map-view-btn').classList.toggle('active', activeView === 'map');
}

function calculateRoute(isGpsUpdate = false) {
  const start = normalizeStationName(document.getElementById('from-input').value);
  const end = normalizeStationName(document.getElementById('to-input').value);

  if (!STATIONS[start]) {
    if (!isGpsUpdate) alert("Please select a valid boarding station from the search dropdown!");
    return;
  }

  if (!end || !STATIONS[end]) {
    if (!isGpsUpdate) alert("Please select a valid destination station to calculate your journey!");
    return;
  }

  if (start === end) {
    if (!isGpsUpdate) alert("Source and Destination cannot be the same!");
    return;
  }

  const path = findShortestPath(start, end);
  if (!path) return;
  currentRoutePath = path;
  selectedTrainIndex = 0;

  if (!isGpsUpdate) requestLeafletAutoFit(true);

  currentPanel = 'result';
  updatePanelVisibility();
  renderMetroMap();

  const totalStops = path.length - 1;
  const isInterchange = path.includes("Nadaprabhu Kempegowda (Majestic)") || path.includes("Rashtreeya Vidyalaya Road");
  const estTimeMinutes = totalStops * 2.5 + (isInterchange ? 5 : 0);
  const calculatedFare = Math.min(90, Math.max(10, Math.ceil(totalStops * 5.2)));

  document.getElementById('metric-fare').innerText = `₹${calculatedFare}`;
  document.getElementById('metric-time').innerText = `~${Math.round(estTimeMinutes)} mins`;
  document.getElementById('metric-stops').innerText = totalStops;

  const firstPlatInfo = getPlatformDetails(path[0], path[1]);
  const schedules = getMultipleUpcomingTrainArrivals(firstPlatInfo, 5);

  renderQuickSchedulesBar(firstPlatInfo, schedules);
  updateRouteScheduleView(schedules);
}

function updateCurrentRouteScheduleFromSelection() {
  if (!currentRoutePath || currentRoutePath.length < 2) return;
  refreshSelectedRouteJourney();
}

function updateRouteFromInputs(isDynamicUpdate = false) {
  const start = normalizeStationName(document.getElementById('from-input').value);
  const end = normalizeStationName(document.getElementById('to-input').value);

  if (STATIONS[start] && STATIONS[end] && start !== end) {
    calculateRoute(isDynamicUpdate);
    return;
  }

  if (STATIONS[start]) {
    showBoardingDirections();
    return;
  }

  currentPanel = 'unselected';
  currentRoutePath = [];
  const quickContainer = document.getElementById('quick-schedules-container');
  if (quickContainer) quickContainer.style.display = 'none';

  updatePanelVisibility();
  renderMetroMap();
}

function showBoardingDirections() {
  currentPanel = 'unselected';
  currentRoutePath = [];
  updatePanelVisibility();

  const currentFrom = normalizeStationName(document.getElementById('from-input').value);
  if (currentFrom) renderUnselectedDualDirections(currentFrom);
  renderMetroMap();
}

// GPS & Map Engine Functions
function getDistanceInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getDistanceLabel(distanceMeters) {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(distanceMeters)} m`;
}

function getLocationErrorMessage(error) {
  switch (error?.code) {
    case error?.PERMISSION_DENIED:
      return "Location access was blocked. Please allow location permission for this site in your browser and refresh the page.";
    case error?.POSITION_UNAVAILABLE:
      return "Your location could not be determined right now. Please try again or select a station manually.";
    case error?.TIMEOUT:
      return "Location detection timed out. Please try again or choose a station manually.";
    default:
      return "Location detection failed. Please try again or select a station manually.";
  }
}

function findNearestStationForCoordinates(lat, lng) {
  let nearestStation = null;
  let minDistance = Infinity;

  for (const [station, coords] of Object.entries(STATIONS)) {
    if (!coords.lat || !coords.lng) continue;
    const dist = getDistanceInKm(lat, lng, coords.lat, coords.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestStation = station;
    }
  }

  return nearestStation ? { station: nearestStation, distanceMeters: minDistance * 1000 } : null;
}

function applyNearestStationToField(targetInputId, lat, lng, statusDiv, label) {
  const match = findNearestStationForCoordinates(lat, lng);
  if (!match) return false;

  const targetInput = document.getElementById(targetInputId);
  if (targetInput) {
    targetInput.value = match.station;
    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  if (targetInputId === 'from-input') {
    setFromStationSource('manual');
    renderUnselectedDualDirections(match.station);
  }

  if (statusDiv) {
    statusDiv.innerHTML = `${label} nearest metro station is <strong>${match.station}</strong> (${getDistanceLabel(match.distanceMeters)} away).`;
  }

  requestLeafletAutoFit(true);
  updateRouteFromInputs(false);
  return true;
}

function syncFromFieldWithLiveLocation(nearestStation, shouldUpdateRoute = true) {
  const fromInput = document.getElementById('from-input');
  const fromClear = document.getElementById('from-clear');
  if (!fromInput || !fromClear) return false;

  const hasManualSelection = Boolean(fromInput.value.trim() && STATIONS[normalizeStationName(fromInput.value)]);
  if (fromStationSource !== 'live' || hasManualSelection || !nearestStation) return false;

  fromInput.value = nearestStation;
  fromClear.style.display = 'flex';

  if (shouldUpdateRoute) {
    renderUnselectedDualDirections(nearestStation);
    updateRouteFromInputs(true);
  }

  return true;
}

function updateLiveDistanceStatus(distanceLabel, nearestStation) {
  const statusDiv = document.getElementById('gps-status');
  if (!statusDiv) return;
  if (nearestStation) {
    statusDiv.innerHTML = `Live location detected the nearest metro station as <strong>${nearestStation}</strong> (${distanceLabel} away).`;
  } else {
    statusDiv.innerHTML = `Live location detected your current position, but no nearby metro station was found.`;
  }
}

function applyDetectedPosition(position, statusDiv) {
  const userLat = position.coords.latitude;
  const userLng = position.coords.longitude;

  let nearestStation = null;
  let minDistance = Infinity;

  for (const [station, coords] of Object.entries(STATIONS)) {
    if (!coords.lat || !coords.lng) continue;
    const dist = getDistanceInKm(userLat, userLng, coords.lat, coords.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestStation = station;
    }
  }

  if (nearestStation) {
    const nearestChanged = nearestStation !== currentNearestStation;
    currentNearestStation = nearestStation;
    currentNearestStationDistanceMeters = minDistance * 1000;
    const distanceLabel = getDistanceLabel(currentNearestStationDistanceMeters);

    const fromInput = document.getElementById('from-input');
    const toInput = document.getElementById('to-input');
    const fromValue = normalizeStationName(fromInput?.value || '');
    const toValue = normalizeStationName(toInput?.value || '');
    const hasManualFromSelection = Boolean(fromValue && STATIONS[fromValue]);
    const hasSelectedRoute = Boolean(STATIONS[fromValue] && STATIONS[toValue] && fromValue !== toValue);

    if (fromStationSource === 'live') {
      const appliedLiveValue = syncFromFieldWithLiveLocation(nearestStation, false);
      if (nearestChanged || !hasManualFromSelection || appliedLiveValue) {
        const destination = normalizeStationName(document.getElementById('to-input')?.value || '');
        if (!STATIONS[destination]) renderUnselectedDualDirections(nearestStation);
        updateRouteFromInputs(true);
      }
      if (hasManualFromSelection) {
        statusDiv.innerHTML = `Live location nearby: <strong>${nearestStation}</strong> (${distanceLabel} away). Using your selected station.`;
      } else {
        updateLiveDistanceStatus(distanceLabel, nearestStation);
      }
    } else if (hasSelectedRoute) {
      const statusMessage = `Live journey position: <strong>${nearestStation}</strong> (${distanceLabel} away). Current route still follows your selected trip.`;
      if (statusDiv) statusDiv.innerHTML = statusMessage;
    } else {
      statusDiv.innerHTML = `Live location nearby: <strong>${nearestStation}</strong> (${distanceLabel} away). Using your selected station.`;
    }

    const shouldRefreshRouteView = nearestChanged || hasSelectedRoute;
    if (shouldRefreshRouteView) {
      renderMetroMap();
      updateCurrentRouteScheduleFromSelection();
    }
  }
}

function startGPSLiveTracking() {
  const statusDiv = document.getElementById('gps-status');

  if (!('geolocation' in navigator)) {
    setFromStationSource('manual');
    statusDiv.innerText = 'GPS is not supported here. Search and select your boarding station manually.';
    return;
  }

  if (!window.isSecureContext && location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    setFromStationSource('manual');
    statusDiv.innerText = 'Location detection needs a secure connection. Open this site over HTTPS or localhost, then allow location access.';
    return;
  }

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  isTracking = true;
  statusDiv.innerText = 'Requesting location access...';

  const locationOptions = { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 };
  const handleSuccess = (position) => {
    applyDetectedPosition(position, statusDiv);
  };
  const handleError = (err) => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    isTracking = false;
    setFromStationSource('manual');
    statusDiv.innerText = getLocationErrorMessage(err);
  };

  navigator.geolocation.getCurrentPosition(handleSuccess, handleError, locationOptions);
  watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, locationOptions);
}

function stopGPSLiveTracking() {
  if (watchId !== null && "geolocation" in navigator) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  isTracking = false;
}

function clearFromInputIdleAutoFillTimer() {
  if (fromInputIdleAutoFillTimer) {
    clearTimeout(fromInputIdleAutoFillTimer);
    fromInputIdleAutoFillTimer = null;
  }
}

function scheduleFromFieldLiveAutoFill() {
  const fromInput = document.getElementById('from-input');
  if (!fromInput) return;

  clearFromInputIdleAutoFillTimer();

  if (fromInput.value.trim()) {
    return;
  }

  fromInputIdleAutoFillTimer = setTimeout(() => {
    const activeFromValue = normalizeStationName(fromInput.value || '');
    if (activeFromValue) return;

    if (!('geolocation' in navigator)) return;

    setFromStationSource('live');
    if (currentNearestStation) {
      syncFromFieldWithLiveLocation(currentNearestStation, true);
    } else {
      startGPSLiveTracking();
    }
  }, 10000);
}

function setFromStationSource(source) {
  fromStationSource = source;
  const fromInput = document.getElementById('from-input');
  const fromClear = document.getElementById('from-clear');
  const isLive = source === 'live';

  const toggle = document.getElementById('from-source-toggle');
  if (toggle) toggle.checked = isLive;

  const sourceLabel = document.getElementById('from-source-label');
  if (sourceLabel) sourceLabel.innerText = isLive ? 'Live location auto-fill' : 'Manual station search';

  const sourceHelper = document.getElementById('from-source-helper');
  if (sourceHelper) sourceHelper.innerText = isLive
    ? 'We will auto-fill the nearest metro station from your location when you have not selected one manually.'
    : 'You can search and choose a station manually; live location will not override it.';

  if (fromInput) {
    fromInput.readOnly = false;
    fromInput.placeholder = 'Search starting place or station...';
  }
  if (fromClear) fromClear.style.display = fromInput?.value.trim() ? 'flex' : 'none';
}

function updateMapStats() {
  const stopsStat = document.getElementById('map-stops-stat');
  const linesStat = document.getElementById('map-lines-stat');
  if (!stopsStat || !linesStat) return;

  if (currentRoutePath.length < 2) {
    stopsStat.textContent = '-- stops';
    linesStat.textContent = 'Overview';
    return;
  }

  const lineNames = new Set();
  for (let i = 0; i < currentRoutePath.length - 1; i++) {
    lineNames.add(getLineForSegment(currentRoutePath[i], currentRoutePath[i + 1]));
  }

  const stops = currentRoutePath.length - 1;
  stopsStat.textContent = `${stops} stop${stops === 1 ? '' : 's'}`;
  linesStat.textContent = `${lineNames.size} line${lineNames.size === 1 ? '' : 's'}`;
}

function requestLeafletAutoFit(resetTouch = false) {
  leafletAutoFitRequested = true;
  if (resetTouch) leafletUserTouched = false;
}

function setActiveView(view) {
  activeView = view;
  if (view === 'map') requestLeafletAutoFit(false);
  updatePanelVisibility();
  renderMetroMap();
}

function stationLatLng(stationName) {
  const station = STATIONS[stationName];
  return station ? [station.lat, station.lng] : null;
}

function canUseLeafletMap() {
  return typeof L !== 'undefined' && Boolean(document.getElementById('leaflet-map'));
}

function uniqueMapEdges() {
  const seen = new Set();
  const edges = [];

  Object.keys(STATIONS).forEach((stationName) => {
    const neighbors = ADJACENCY[stationName] || [];
    neighbors.forEach((neighborName) => {
      const edgeKey = [stationName, neighborName].sort().join('|');
      if (seen.has(edgeKey)) return;
      seen.add(edgeKey);
      edges.push([stationName, neighborName]);
    });
  });

  return edges;
}

function getRouteLineAt(index) {
  if (!currentRoutePath || currentRoutePath.length < 2) return 'Interchange';

  const stationName = currentRoutePath[index];
  const nextStation = currentRoutePath[index + 1];
  const previousStation = currentRoutePath[index - 1];

  if (nextStation) return getLineForSegment(stationName, nextStation);
  if (previousStation) return getLineForSegment(previousStation, stationName);
  return 'Interchange';
}

function initLeafletMap() {
  if (!canUseLeafletMap()) return false;
  if (leafletMap) return true;

  leafletMap = L.map('leaflet-map', {
    zoomControl: true,
    attributionControl: true
  }).setView([12.9716, 77.5946], 11);

  const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community'
  });

  const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  });

  street.addTo(leafletMap);
  leafletBaseLayers = { 'Street map': street, 'Satellite': satellite };
  L.control.layers(leafletBaseLayers, null, { position: 'topright' }).addTo(leafletMap);
  leafletLayerGroup = L.layerGroup().addTo(leafletMap);
  leafletMap.on('dragstart zoomstart', () => {
    if (!leafletProgrammaticFit) leafletUserTouched = true;
  });
  setTimeout(() => leafletMap.invalidateSize(), 0);
  return true;
}

function renderLeafletMetroMap() {
  if (!initLeafletMap()) return false;

  const leafletEl = document.getElementById('leaflet-map');
  const htmlMap = document.getElementById('html-metro-map');
  if (leafletEl) leafletEl.classList.add('active');
  if (htmlMap) htmlMap.style.display = 'none';

  updateMapStats();
  leafletLayerGroup.clearLayers();

  const summary = document.getElementById('map-summary');
  const livePill = document.getElementById('map-live-pill');
  const from = normalizeStationName(document.getElementById('from-input')?.value || '');
  const to = normalizeStationName(document.getElementById('to-input')?.value || '');
  const isRouteMap = currentRoutePath.length > 1;
  const bounds = [];
  const routeEdgeKeys = new Set();
  const focusKey = isRouteMap ? `route:${currentRoutePath.join('|')}` : 'overview:network';
  const renderKey = [activeView, focusKey, from, to, currentNearestStation || '', leafletAutoFitRequested ? 'fit' : 'steady'].join('::');

  if (renderKey === lastLeafletRenderKey && !leafletAutoFitRequested) return true;
  lastLeafletRenderKey = renderKey;

  if (isRouteMap) {
    for (let i = 0; i < currentRoutePath.length - 1; i++) {
      routeEdgeKeys.add([currentRoutePath[i], currentRoutePath[i + 1]].sort().join('|'));
    }
  }

  const edges = isRouteMap
    ? currentRoutePath.slice(0, -1).map((stationName, index) => [stationName, currentRoutePath[index + 1]])
    : uniqueMapEdges();

  edges.forEach(([fromStation, toStation]) => {
    const fromLatLng = stationLatLng(fromStation);
    const toLatLng = stationLatLng(toStation);
    if (!fromLatLng || !toLatLng) return;

    const lineName = getLineForSegment(fromStation, toStation);
    const color = LINE_COLORS[lineName] || '#38bdf8';
    const edgeKey = [fromStation, toStation].sort().join('|');
    const highlighted = !isRouteMap || routeEdgeKeys.has(edgeKey);
    L.polyline([fromLatLng, toLatLng], {
      color,
      weight: highlighted ? 6 : 3,
      opacity: highlighted ? 0.95 : 0.35,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(leafletLayerGroup);
    bounds.push(fromLatLng, toLatLng);
  });

  const stationList = isRouteMap
    ? Array.from(new Set([...currentRoutePath, currentNearestStation].filter(Boolean)))
    : Object.keys(STATIONS);

  stationList.forEach((stationName) => {
    const latLng = stationLatLng(stationName);
    const station = STATIONS[stationName];
    if (!latLng || !station) return;

    const routeIndex = currentRoutePath.indexOf(stationName);
    const selected = routeIndex > -1;
    const lineName = selected ? getRouteLineAt(routeIndex) : station.line;
    const color = LINE_COLORS[lineName] || LINE_COLORS.Interchange;
    const size = selected ? 20 : 16;
    const markerIcon = L.divIcon({
      className: '',
      html: `<div class="leaflet-station-marker ${selected ? 'selected' : ''}" style="--marker-color:${color}"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });

    L.marker(latLng, { icon: markerIcon, title: stationName })
      .bindTooltip(shortMapLabel(stationName), {
        direction: 'top',
        offset: [0, -9],
        opacity: 0.95,
        permanent: selected,
        sticky: !selected,
        className: selected ? 'route-station-label' : 'station-label'
      })
      .addTo(leafletLayerGroup);
    bounds.push(latLng);
  });

  if (currentNearestStation && STATIONS[currentNearestStation]) {
    const liveLatLng = stationLatLng(currentNearestStation);
    const trainIcon = L.divIcon({
      className: '',
      html: '<div class="leaflet-train-marker">🚆</div>',
      iconSize: [34, 28],
      iconAnchor: [17, 14]
    });
    L.marker(liveLatLng, { icon: trainIcon, title: `Live nearest: ${currentNearestStation}`, zIndexOffset: 1000 })
      .bindTooltip(`Live nearest: ${shortMapLabel(currentNearestStation)}`, {
        direction: 'bottom',
        offset: [0, 10],
        opacity: 0.98,
        permanent: true,
        className: 'live-location-label'
      })
      .addTo(leafletLayerGroup);
    bounds.push(liveLatLng);
  }

  if (summary) {
    summary.textContent = isRouteMap
      ? `${from} to ${to} • ${currentRoutePath.length - 1} stops highlighted on real map`
      : (STATIONS[from] ? `Boarding station selected: ${from}` : 'Allow GPS or choose stations to highlight your route.');
  }
  if (livePill) livePill.textContent = currentNearestStation ? `Live: ${currentNearestStation}` : 'Live: waiting';

  const focusBounds = isRouteMap ? currentRoutePath.map(stationLatLng).filter(Boolean) : bounds;
  const shouldAutoFitMap = activeView === 'map' && leafletAutoFitRequested && (!leafletUserTouched || isRouteMap);

  setTimeout(() => {
    if (activeView !== 'map') return;
    if (!shouldAutoFitMap) {
      leafletAutoFitRequested = false;
      return;
    }
    leafletMap.invalidateSize({ pan: false });
    leafletProgrammaticFit = true;
    leafletAutoFitRequested = false;
    leafletUserTouched = false;
    lastLeafletFocusKey = focusKey;
    if (focusBounds.length) {
      leafletMap.fitBounds(focusBounds, { animate: false, padding: isRouteMap ? [18, 18] : [28, 28], maxZoom: isRouteMap ? 16 : 12 });
    } else {
      leafletMap.setView([12.9716, 77.5946], 11, { animate: false });
    }
    setTimeout(() => { leafletProgrammaticFit = false; }, 350);
  }, 0);
  return true;
}

function renderHtmlMetroMap() {
  const container = document.getElementById('html-metro-map');
  if (!container) return;

  updateMapStats();
  const summary = document.getElementById('map-summary');
  const livePill = document.getElementById('map-live-pill');
  const from = normalizeStationName(document.getElementById('from-input')?.value || '');
  const to = normalizeStationName(document.getElementById('to-input')?.value || '');

  container.innerHTML = `<div class="html-map-empty">Spatial HTML Fallback Map</div>`;

  if (summary) {
    summary.textContent = currentRoutePath.length > 1
      ? `${from} to ${to} • ${currentRoutePath.length - 1} stops highlighted`
      : (STATIONS[from] ? `Boarding station selected: ${from}` : 'Allow GPS or choose stations to highlight your route.');
  }

  if (livePill) livePill.textContent = currentNearestStation ? `Live: ${currentNearestStation}` : 'Live: waiting';
}

function renderMetroMap() {
  if (renderLeafletMetroMap()) return;

  const leafletEl = document.getElementById('leaflet-map');
  const htmlMap = document.getElementById('html-metro-map');
  if (leafletEl) leafletEl.classList.remove('active');
  if (htmlMap) htmlMap.style.display = '';

  renderHtmlMetroMap();
}

function setupAutocomplete(inputId, resultsId) {
  const input = document.getElementById(inputId);
  const results = document.getElementById(resultsId);
  const clearBtn = document.getElementById(inputId === 'from-input' ? 'from-clear' : 'to-clear');

  function updateClearButton() {
    clearBtn.style.display = input.value.trim() ? 'flex' : 'none';
  }

  function renderResults(filterText = '') {
    results.innerHTML = '';
    const query = filterText.toLowerCase().trim();
    const matches = stationNames.filter(name => name.toLowerCase().includes(query));

    if (matches.length === 0) {
      results.style.display = 'none';
      return;
    }

    matches.forEach(st => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      const lineType = STATIONS[st].line.split(' ')[0];
      item.innerHTML = `
        <span>${st}</span>
        <span class="line-badge-sm ${lineType}">${lineType}</span>
      `;

      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = st;
        results.style.display = 'none';
        updateClearButton();
        
        if (inputId === 'from-input') {
          setFromStationSource('manual');
          suppressLiveAutoFillUntilBlur = false;
          renderUnselectedDualDirections(st);
        } else {
          setFromStationSource('manual');
        }
        requestLeafletAutoFit(true);
        updateRouteFromInputs(false);
        updateCurrentRouteScheduleFromSelection();
        input.blur();
      });

      results.appendChild(item);
    });

    results.style.display = 'block';
  }

  input.addEventListener('focus', () => {
    if (!input.disabled && !input.readOnly) {
      suppressLiveAutoFillUntilBlur = true;
      if (inputId === 'from-input') {
        setFromStationSource('manual');
        if (!input.value.trim()) {
          scheduleFromFieldLiveAutoFill();
        }
      }
      renderResults(input.value);
    }
  });
  clearBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    input.value = '';
    results.style.display = 'none';
    updateClearButton();
    if (inputId === 'from-input') {
      setFromStationSource('manual');
      suppressLiveAutoFillUntilBlur = true;
      scheduleFromFieldLiveAutoFill();
      if (currentNearestStation) {
        const statusDiv = document.getElementById('gps-status');
        if (statusDiv) {
          statusDiv.innerHTML = currentNearestStationDistanceMeters != null
            ? `Live location detected the nearest metro station as <strong>${currentNearestStation}</strong> (${getDistanceLabel(currentNearestStationDistanceMeters)} away).`
            : `Live location is available. The nearest metro station will be used when you do not select one manually.`;
        }
      }
    }
    input.focus();
    requestLeafletAutoFit(true);
    updateRouteFromInputs(false);
  });
  input.addEventListener('input', () => { 
    if (!input.disabled && !input.readOnly) {
      updateClearButton();
      renderResults(input.value);
      const normalizedInput = normalizeStationName(input.value);
      if (inputId === 'from-input') {
        clearFromInputIdleAutoFillTimer();
        setFromStationSource('manual');
        suppressLiveAutoFillUntilBlur = true;
        if (input.value.trim()) {
          suppressLiveAutoFillUntilBlur = false;
          if (STATIONS[normalizedInput]) renderUnselectedDualDirections(normalizedInput);
        } else {
          scheduleFromFieldLiveAutoFill();
        }
      }
      if (STATIONS[normalizedInput]) requestLeafletAutoFit(true);
      updateRouteFromInputs(false);
    }
  });
  input.addEventListener('blur', () => {
    setTimeout(() => {
      results.style.display = 'none';
      updateClearButton();
      if (inputId === 'from-input' && !input.value.trim()) {
        scheduleFromFieldLiveAutoFill();
      }
      suppressLiveAutoFillUntilBlur = false;
    }, 150);
  });
  updateClearButton();
}

function updateLiveClock() {
  const now = new Date();
  document.getElementById('live-clock').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function refreshJourneyView() {
  if (currentRoutePath.length > 1) {
    renderMetroMap();
    updateCurrentRouteScheduleFromSelection();
  }

  if ('geolocation' in navigator && fromStationSource === 'live') {
    navigator.geolocation.getCurrentPosition(
      (position) => applyDetectedPosition(position, document.getElementById('gps-status')),
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
    );
  }
}

// Global Initialization
document.addEventListener('DOMContentLoaded', () => {
  setupAutocomplete('from-input', 'from-results');
  setupAutocomplete('to-input', 'to-results');
  setFromStationSource('live');
  updatePanelVisibility();
  renderMetroMap();

  const collapsibleToggle = document.querySelector('.collapsible-toggle');
  const collapsibleContent = document.querySelector('.collapsible-content');
  const collapsibleIcon = document.querySelector('.collapsible-icon');

  if (collapsibleToggle && collapsibleContent) {
    collapsibleToggle.addEventListener('click', () => {
      const expanded = collapsibleToggle.getAttribute('aria-expanded') === 'true';
      collapsibleToggle.setAttribute('aria-expanded', String(!expanded));
      collapsibleContent.hidden = expanded;
      if (collapsibleIcon) {
        collapsibleIcon.textContent = expanded ? '+' : '−';
      }
    });
  }

  const mapCard = document.getElementById('map-card');
  if (mapCard) {
    mapCard.style.display = 'none';
  }

  document.getElementById('journey-view-btn').addEventListener('click', () => setActiveView('journey'));
  document.getElementById('map-view-btn').addEventListener('click', () => setActiveView('map'));

  setInterval(updateLiveClock, 1000);
  setInterval(refreshJourneyView, JOURNEY_REFRESH_INTERVAL_MS);
  updateLiveClock();
  document.getElementById('year').innerText = new Date().getFullYear();

  startGPSLiveTracking();
});