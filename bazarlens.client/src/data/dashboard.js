export const summaryCards = [
    { label: 'Total Submissions', value: '2,483', change: 12, icon: 'file', tone: 'green' },
    { label: 'Average Rice Price', value: '৳ 62', change: 5, icon: 'rice', tone: 'blue', unit: '/ kg' },
    { label: 'Average Potato Price', value: '৳ 28', change: 17, icon: 'potato', tone: 'amber', unit: '/ kg' },
    { label: 'Hilsa Price (Avg.)', value: '৳ 1,250', change: 8, icon: 'fish', tone: 'rose', unit: '/ kg' },
];
export const prices = [
    { area: 'Dhaka', price: 68, x: 149, y: 148 },
    { area: 'Chattogram', price: 62, x: 220, y: 235 },
    { area: 'Sylhet', price: 58, x: 226, y: 87 },
    { area: 'Khulna', price: 65, x: 87, y: 211 },
    { area: 'Rajshahi', price: 60, x: 68, y: 109 },
    { area: 'Barishal', price: 56, x: 147, y: 240 },
];
export const trends = [
    { item: 'Rice', color: '#059669', values: [52, 54, 53, 55, 55, 56, 58, 57, 60, 59, 60, 61, 62] },
    { item: 'Potato', color: '#f59e0b', values: [22, 23, 22, 24, 24, 25, 25, 26, 26, 27, 26, 27, 28] },
    { item: 'Hilsa', color: '#2589f5', values: [850, 890, 925, 920, 1040, 1000, 1070, 1060, 1180, 1140, 1210, 1220, 1250] },
];
export const submissions = [
    { id: 'mock-1', item: 'Rice', price: 62, unit: 'kg', area: 'Dhanmondi, Dhaka', market: '', date: '2025-05-20', time: '10:24 AM', status: 'Verified' },
    { id: 'mock-2', item: 'Potato', price: 28, unit: 'kg', area: 'Mirpur, Dhaka', market: '', date: '2025-05-20', time: '09:15 AM', status: 'Verified' },
    { id: 'mock-3', item: 'Hilsa', price: 1300, unit: 'kg', area: 'Chattogram', market: 'Karatia Bazar', date: '2025-05-20', time: '08:40 AM', status: 'Verified' },
    { id: 'mock-4', item: 'Rice', price: 60, unit: 'kg', area: 'Sylhet', market: 'Zindabazar', date: '2025-05-19', time: '07:12 PM', status: 'Pending' },
    { id: 'mock-5', item: 'Potato', price: 27, unit: 'kg', area: 'Rajshahi', market: 'New Market', date: '2025-05-19', time: '05:36 PM', status: 'Verified' },
];
export const alerts = [
    { item: 'Potato', title: 'Potato price up 30% in Khulna', description: 'Potato price increased from ৳ 22 to ৳ 29 (kg) in Khulna area.', time: '2 hours ago', tone: 'rose', icon: 'up' },
    { item: 'Hilsa', title: 'Hilsa price up 18% in Chattogram', description: 'Hilsa price increased from ৳ 1,100 to ৳ 1,300 (kg) in Chattogram area.', time: '5 hours ago', tone: 'blue', icon: 'fish' },
    { item: 'Rice', title: 'Rice price down 12% in Sylhet', description: 'Rice price decreased from ৳ 66 to ৳ 58 (kg) in Sylhet area.', time: '1 day ago', tone: 'green', icon: 'down' },
];
