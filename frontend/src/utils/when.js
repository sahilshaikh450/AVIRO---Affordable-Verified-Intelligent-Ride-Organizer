// Dates in words people use: "Today", "Tomorrow", "Fri 6 Nov"; times like "9:30 am"

const startOfDay = (d) => new Date(d).setHours(0, 0, 0, 0);

export const timeOf = (value) =>
  new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export const dayOf = (value) => {
  const days = Math.round((startOfDay(value) - startOfDay(Date.now())) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return new Date(value).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

// "Today, 9:00 am" / "Tomorrow, 9:00 am" / "Fri 6 Nov, 9:00 am"
export const formatWhen = (value) => `${dayOf(value)}, ${timeOf(value)}`;

export const isPast = (value, graceHours = 0) => new Date(value).getTime() + graceHours * 3600e3 < Date.now();
