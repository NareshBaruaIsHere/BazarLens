// Deterministic prototype policy; the backend must own this rule in production.
export function screenPrice(db, row) {
  const from = new Date(`${row.date}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 30);
  const cutoff = from.toISOString().slice(0, 10);
  const samples = db.submissions.filter(s =>
    s.id !== row.id && s.userId !== row.userId && s.status === 'verified' &&
    s.screening?.decision !== 'auto-approved' && s.productId === row.productId &&
    s.marketId === row.marketId && s.unit === row.unit &&
    s.date >= cutoff && s.date <= row.date,
  );
  // One daily average per date prevents one busy day dominating the baseline.
  const dates = [...new Set(samples.map(s => s.date))];
  const values = dates.map(date => {
    const day = samples.filter(s => s.date === date);
    return day.reduce((sum,s) => sum + s.price, 0) / day.length;
  }).sort((a,b) => a-b);
  const base = { policy: 'market-median-v1', thresholdPercent: 25, sampleDays: values.length, baseline: null, deviationPercent: null, checkedAt: new Date().toISOString() };
  if (values.length < 3) return { ...base, decision: 'insufficient-data', reason: 'Fewer than 3 independently verified days in the previous 30 days. Administrator review required.' };
  const middle = Math.floor(values.length / 2);
  const baseline = values.length % 2 ? values[middle] : (values[middle-1] + values[middle]) / 2;
  const deviation = Math.abs(row.price-baseline) / baseline * 100;
  const unusual = deviation > 25;
  return { ...base, baseline, deviationPercent: Number(deviation.toFixed(2)), decision: unusual ? 'unusual' : 'normal', reason: unusual ? `Price differs by ${deviation.toFixed(1)}% from the recent market median of ৳${baseline.toFixed(2)}/${row.unit}.` : `Price is within 25% of the recent market median of ৳${baseline.toFixed(2)}/${row.unit}.` };
}
