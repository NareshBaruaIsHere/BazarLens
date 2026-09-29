export const emptyLocation = { division: '', district: '', area: '', marketId: '' };

export function locationForMarket(market) {
  return market ? { division: market.division, district: market.district, area: market.area, marketId: market.id } : { ...emptyLocation };
}

export function matchesLocation(market, location) {
  return ['division', 'district', 'area'].every(key => !location[key] || market[key] === location[key]) && (!location.marketId || market.id === location.marketId);
}

export function changeLocation(location, key, value) {
  const keys = ['division', 'district', 'area', 'marketId'];
  const next = { ...location, [key]: value };
  keys.slice(keys.indexOf(key) + 1).forEach(child => { next[child] = ''; });
  return next;
}

export function locationOptions(markets, location) {
  const unique = (rows, key) => [...new Set(rows.map(row => row[key]).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  const districts = markets.filter(m => m.division === location.division);
  const thanas = districts.filter(m => m.district === location.district);
  return {
    divisions: unique(markets, 'division'),
    districts: unique(districts, 'district'),
    thanas: unique(thanas, 'area'),
    markets: location.area ? thanas.filter(m => m.area === location.area).sort((a,b) => a.name.localeCompare(b.name)) : [],
  };
}
