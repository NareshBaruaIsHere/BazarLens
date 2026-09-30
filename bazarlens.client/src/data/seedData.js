export const defaultSettings = { defaultArea: '', emailAlerts: false, inAppNotifications: true, compactTables: false };
export function seedData() {
  const now = new Date();
  const date = days => new Date(now.getTime() - days * 86400000).toISOString();
  const users = [
    { id: 'admin-demo', name: 'BazerLens Admin', email: 'admin@bazarlens.com', password: 'Admin@123', role: 'admin', status: 'active', city: 'Dhaka', area: 'Tejgaon', avatarUrl: '', createdAt: date(90) },
    { id: 'user-demo', name: 'Tanvir Ahmed', email: 'user@bazarlens.com', password: 'User@123', role: 'user', status: 'active', city: 'Dhaka', area: 'Dhanmondi', avatarUrl: '', createdAt: date(60) },
    { id: 'agent-demo', name: 'BazerLens Field Agent', email: 'agent@bazarlens.com', password: 'Agent@123', role: 'agent', status: 'active', city: 'Dhaka', area: 'Dhanmondi', avatarUrl: '', createdAt: date(45) },
    { id: 'user-sadia', name: 'Sadia Rahman', email: 'sadia@example.com', password: 'Demo@123', role: 'user', status: 'active', city: 'Sylhet', area: 'Zindabazar', avatarUrl: '', createdAt: date(30) },
  ];
  const products = [['Rice','Grains','kg'],['Potato','Vegetables','kg'],['Onion','Vegetables','kg'],['Tomato','Vegetables','kg'],['Egg','Protein','dozen'],['Chicken','Meat','kg'],['Beef','Meat','kg'],['Hilsa','Fish','kg']].map(([name,category,unit], i) => ({ id: `p${i}`, name, category, unit, active: true, createdAt: date(90) }));
  const markets = [['Karwan Bazar','Tejgaon','Dhaka','Dhaka'],['Town Hall Bazar','Dhanmondi','Dhaka','Dhaka'],['Reazuddin Bazar','Kotwali','Chattogram','Chattogram'],['Zindabazar','Zindabazar','Sylhet','Sylhet'],['New Market','Boalia','Rajshahi','Rajshahi'],['Boro Bazar','Khulna Sadar','Khulna','Khulna'],['Port Road Bazar','Barishal Sadar','Barishal','Barishal']].map(([name,area,district,division], i) => ({ id: `m${i}`, name, area, district, division, active: true, createdAt: date(90) }));
  const submissions = [];
  products.forEach((product, p) => markets.forEach((market, m) => {
    [28,21,14,7,1,0].forEach((days, n) => {
      const status = n === 5 && m === 0 ? (p % 3 === 0 ? 'rejected' : 'pending') : 'verified';
      submissions.push({ id: `s${p}-${m}-${n}`, userId: p % 2 ? 'user-sadia' : 'user-demo', productId: product.id, category: product.category, quality: 'Standard', marketId: market.id, area: market.area, unit: product.unit, price: [62,28,75,90,145,190,780,1250][p] + m * 2 + n * (p + 1), date: date(days).slice(0,10), note: 'Seeded community price (demo).', evidenceUrl: '', status, rejectionReason: status === 'rejected' ? 'Please verify the unit and provide a clearer market reference.' : '', createdAt: date(days), updatedAt: date(days), history: status === 'pending' ? [] : [{ status, reviewerId: 'admin-demo', at: date(days), reason: status === 'rejected' ? 'Unit needs verification.' : '' }] });
    });
  }));
  return { version: 1, users, products, markets, submissions, alerts: [{ id: 'a1', userId: 'user-demo', productId: 'p0', area: 'Dhanmondi', direction: 'above', targetPrice: 60, enabled: true, createdAt: date(2) }], settings: Object.fromEntries(users.map(u => [u.id, { ...defaultSettings }])), activity: [{ id: 'activity-seed', userId: 'admin-demo', message: 'Demo database created', createdAt: date(0) }] };
}
