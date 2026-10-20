/* Local station routing. No remote geocoding, advertising, or timetable feed. */
(() => {
  'use strict';
  const { STATIONS, LINES, STATION_ALIASES, resolveStation, getJourney, nearestStation } = window.MetroNetwork;
  const byId = id => document.getElementById(id);
  const from = byId('from-input');
  const to = byId('to-input');
  const result = byId('route-result');
  const message = byId('route-message');
  const shortName = name => ({
    'Nadaprabhu Kempegowda (Majestic)': 'Majestic',
    'Rashtreeya Vidyalaya Road': 'RV Road',
    'Delta electronics Bommasandra': 'Bommasandra'
  }[name] || name);
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const options = byId('station-list');
  Object.keys(STATIONS).sort().forEach(name => {
    const option = node('option'); option.value = name; options.appendChild(option);
  });
  Object.keys(STATION_ALIASES).filter(alias => !STATIONS[alias]).forEach(alias => {
    const option = node('option'); option.value = alias; option.label = STATION_ALIASES[alias]; options.appendChild(option);
  });
  function clearResult() {
    result.hidden = true; result.replaceChildren(); message.textContent = '';
  }
  function showRoute(updateUrl = true) {
    clearResult();
    const start = resolveStation(from.value), end = resolveStation(to.value);
    if (!start || !end) {
      message.textContent = 'Choose both stations from the suggestions. Names such as Majestic, RV Road and Whitefield also work. For places or office addresses, check the station name first.';
      (!start ? from : to).focus(); return;
    }
    from.value = start; to.value = end;
    const journey = getJourney(start, end);
    if (!journey) { message.textContent = 'This station pair is not connected in our stored network. Check BMRCL for other services.'; return; }
    if (updateUrl) {
      const url = new URL(window.location.href); url.searchParams.set('from', start); url.searchParams.set('to', end);
      history.replaceState(null, '', url);
    }
    result.hidden = false;
    const title = node('h2', `${shortName(start)} to ${shortName(end)}`); title.tabIndex = -1;
    result.appendChild(title);
    if (!journey.stops) {
      result.appendChild(node('p', 'Both selections refer to the same station. No train journey is needed between them. Check your exact destination and station exit before leaving.'));
      title.focus(); return;
    }
    result.appendChild(node('p', `${journey.stops} stops after boarding · ${journey.path.length} stations including both endpoints · ${journey.changes} ${journey.changes === 1 ? 'change' : 'changes'}`, 'route-summary'));
    const instructions = node('ol', undefined, 'journey-steps');
    journey.segments.forEach((segment, index) => {
      const li = node('li');
      li.appendChild(node('span', segment.line, `line-badge ${segment.line.split(' ')[0].toLowerCase()}`));
      li.appendChild(node('h3', `${index ? 'Change at' : 'Board at'} ${segment.from}`));
      li.appendChild(node('p', `Take the train towards ${segment.direction}. ${index ? 'Follow signs for the new line inside the station. ' : ''}Confirm the destination on the station display before boarding.`));
      li.appendChild(node('p', `Ride ${segment.stops.length - 1} ${segment.stops.length === 2 ? 'stop' : 'stops'} to ${segment.to}. ${index === journey.segments.length - 1 ? 'Leave the train here.' : 'Change trains here for the next leg.'}`));
      instructions.appendChild(li);
    });
    result.appendChild(instructions);
    const stopsHeading = node('h3', 'Every station in order');
    const list = node('ol', undefined, 'station-sequence');
    journey.path.forEach((station, index) => {
      const transfer = journey.segments.slice(1).some(segment => segment.from === station);
      list.appendChild(node('li', `${station}${index === 0 ? ' — board here' : index === journey.path.length - 1 ? ' — leave here' : transfer ? ' — change lines' : ''}`, transfer ? 'transfer' : ''));
    });
    result.append(stopsHeading, list);
    const note = node('div', undefined, 'notice');
    note.appendChild(node('strong', 'Fare and departure check'));
    note.appendChild(node('p', 'This route describes the stored network, not current train operations. Use BMRCL ticketing for the fare between these exact stations, and station displays for the next train. Allow separately for entry, waiting, transfers and the final walk.'));
    const source = node('a', 'Official BMRCL timetable'); source.href = 'https://www.bmrc.co.in/metro-timings/';
    note.appendChild(source); result.appendChild(note);
    const reverse = node('button', 'Plan the return journey', 'secondary'); reverse.type = 'button';
    reverse.addEventListener('click', () => { [from.value, to.value] = [to.value, from.value]; showRoute(); });
    result.appendChild(reverse);
    title.focus();
  }
  byId('route-form').addEventListener('submit', event => { event.preventDefault(); showRoute(); });
  function clearDraftRoute() {
    clearResult();
    const url = new URL(window.location.href); url.searchParams.delete('from'); url.searchParams.delete('to');
    history.replaceState(null, '', url);
  }
  from.addEventListener('input', clearDraftRoute); to.addEventListener('input', clearDraftRoute);
  byId('swap-stations').addEventListener('click', () => { [from.value, to.value] = [to.value, from.value]; clearDraftRoute(); });
  byId('use-location').addEventListener('click', () => {
    const status = byId('location-status');
    if (!navigator.geolocation) { status.textContent = 'Location is unavailable in this browser. Choose a station manually.'; return; }
    status.textContent = 'Requesting your location once. You can continue with manual selection.';
    navigator.geolocation.getCurrentPosition(position => {
      const match = nearestStation(position.coords.latitude, position.coords.longitude);
      if (!match || match.distance > 15) { status.textContent = 'Your location is outside the supported metro area. Choose the station where you intend to board.'; return; }
      clearDraftRoute(); from.value = match.station;
      status.textContent = `${match.station} is approximately ${match.distance.toFixed(1)} km away in a straight line. This is not a walking route; check entrances and road crossings. Location accuracy reported by your device: about ${Math.round(position.coords.accuracy)} m.`;
    }, () => { status.textContent = 'Location was not available. Select an origin station manually; the planner still works.'; }, { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false });
  });
  document.querySelectorAll('[data-from][data-to]').forEach(button => button.addEventListener('click', () => {
    from.value = button.dataset.from; to.value = button.dataset.to; showRoute();
  }));
  const params = new URLSearchParams(window.location.search);
  if (params.has('from') || params.has('to')) {
    from.value = params.get('from') || ''; to.value = params.get('to') || ''; showRoute(false);
  }
  byId('planner-loading').hidden = true;
})();
