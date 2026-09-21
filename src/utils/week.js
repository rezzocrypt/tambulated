export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]
export const DAY_NAMES_KEY = ['', 'tasksMon', 'tasksTue', 'tasksWed', 'tasksThu', 'tasksFri', 'tasksSat', 'tasksSun']

function pad(n) {
  return String(n).padStart(2, '0')
}

export function addDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}

export function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDateKey(str) {
  const [year, month, day] = String(str).split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function weekdayNum(date) {
  return ((date.getDay() + 6) % 7) + 1 // Mon..Sun = 1..7
}

export function mondayOf(date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() - weekdayNum(monday) + 1)
  return monday
}

export function shiftWeek(date, amount) {
  const monday = mondayOf(date)
  monday.setDate(monday.getDate() + amount * 7)
  return monday
}

export function weekDates(monday) {
  return ALL_DAYS.map((offset) => addDays(monday, offset - 1))
}