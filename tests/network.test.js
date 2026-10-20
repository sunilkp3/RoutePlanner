const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {STATIONS, LINES, GRAPH, getJourney, resolveStation, nearestStation} = require('../network.js');
const M='Nadaprabhu Kempegowda (Majestic)', R='Rashtreeya Vidyalaya Road';
test('all station pairs are connected and reverse consistently with valid directions', () => {
 for(const a of Object.keys(STATIONS)) for(const b of Object.keys(STATIONS)) {
  const j=getJourney(a,b), back=getJourney(b,a);
  assert.ok(j, `${a} -> ${b}`);
  assert.deepEqual(j.path.toReversed(),back.path);
  assert.equal(j.stops,j.path.length-1);
  assert.equal(j.changes,Math.max(0,j.segments.length-1));
  for(let i=1;i<j.path.length;i++) assert.ok(GRAPH[j.path[i-1]].some(e=>e.station===j.path[i]));
  for(const segment of j.segments) {
   const ordered=LINES[segment.line], delta=ordered.indexOf(segment.stops[1])-ordered.indexOf(segment.stops[0]);
   assert.equal(Math.abs(delta),1);
   assert.equal(segment.direction,delta>0?ordered.at(-1):ordered[0]);
   for(let k=1;k<segment.stops.length;k++) assert.equal(ordered.indexOf(segment.stops[k])-ordered.indexOf(segment.stops[k-1]),delta);
  }
 }
});
test('reverse Purple direction is correct at formerly broken Central College edge',()=>{
 const j=getJourney('Indiranagar','Majestic');assert.equal(j.stops,7);assert.equal(j.changes,0);assert.equal(j.segments[0].direction,'Challaghatta');
});
test('RV Road is the correct two-line interchange and both directions differ',()=>{
 const j=getJourney('Jayanagar','Electronic City');assert.equal(j.stops,12);assert.equal(j.changes,1);
 assert.deepEqual(j.segments.map(s=>[s.line,s.from,s.direction]),[['Green Line','Jayanagar','Silk Institute'],['Yellow Line',R,'Delta electronics Bommasandra']]);
 assert.deepEqual(getJourney('Electronic City','Jayanagar').segments.map(s=>s.direction),[R,'Madavara']);
 assert.equal(getJourney('RV Road','Bommasandra').segments[0].line,'Yellow Line');
});
test('passing an interchange does not add a transfer',()=>{
 assert.equal(getJourney('Kengeri','MG Road').changes,0);assert.equal(getJourney('Kengeri','MG Road').stops,17);
 const j=getJourney('Silk Institute','Cubbon Park');assert.equal(j.changes,1);assert.equal(j.segments[1].from,M);assert.equal(j.segments[1].direction,'Whitefield (Kadugodi)');
});
test('station aliases, same-station and invalid input have defined behavior',()=>{
 assert.equal(resolveStation('  rv road '),R);assert.equal(resolveStation('whitefield'),'Whitefield (Kadugodi)');
 assert.equal(getJourney('Majestic',M).stops,0);assert.equal(getJourney('invalid','MG Road'),null);
 assert.equal(nearestStation(NaN,77),null);assert.equal(nearestStation(12.9294558,77.5802873).station,'Jayanagar');
});
test('published files do not reintroduce simulated fares, departures, platform numbers or ad execution',()=>{
 for(const file of fs.readdirSync(path.join(__dirname,'..')).filter(f=>/\.(html|js)$/.test(f))) {
  const text=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  assert.doesNotMatch(text,/Math\.ceil\(totalStops\s*\*\s*5\.2\)|BMRC_TIMETABLES|getNextTrainArrival|Platform [1-9]|Metro Services Closed|pagead2\.googlesyndication|adsbygoogle|nominatim\.openstreetmap|googletagmanager/,file);
 }
});
test('all generated route guides contain actual graph station order',()=>{
 const pairs=[['indiranagar-to-majestic','Indiranagar','Majestic'],['jayanagar-to-electronic-city','Jayanagar','Electronic City'],['majestic-to-whitefield','Majestic','Whitefield'],['rv-road-to-bommasandra','RV Road','Bommasandra'],['kengeri-to-mg-road','Kengeri','MG Road'],['silk-institute-to-cubbon-park','Silk Institute','Cubbon Park']];
 for(const [slug,from,to] of pairs) {
  const html=fs.readFileSync(path.join(__dirname,'..',`${slug}-metro.html`),'utf8');
  const actual=html.match(/<ol class="station-sequence">(.*?)<\/ol>/s)[1];
  assert.deepEqual([...actual.matchAll(/<li>(.*?)<\/li>/g)].map(m=>m[1].split(' — ')[0]),getJourney(from,to).path);
  assert.match(html,new RegExp(`${getJourney(from,to).stops} stops after boarding`));
 }
});
