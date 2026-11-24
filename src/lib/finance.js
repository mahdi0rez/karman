export const toman = (value) => new Intl.NumberFormat('fa-IR').format(Math.round(value || 0));
export const faDate = (value, options = {}) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric', ...options }).format(new Date(value));
export const faTime = (value) => new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
export const durationMinutes = (start, end) => Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000));
export const calculatePay = (start, end, hourlyRate) => Math.round((durationMinutes(start, end) / 60) * Number(hourlyRate || 0));
export const formatDuration = (minutes) => `${Math.floor(minutes / 60)} ساعت و ${minutes % 60} دقیقه`;
export const startOfWeek = (date) => { const d = new Date(date); const day = (d.getDay() + 6) % 7; d.setHours(0,0,0,0); d.setDate(d.getDate() - day); return d; };
export const inRange = (date, start, end) => { const d = new Date(date); return d >= start && d <= end; };
