import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import weekOfYear from 'dayjs/plugin/weekOfYear';

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(weekOfYear);

export class DateUtils {
  constructor(private timezone: string = process.env.TIMEZONE || 'Europe/Paris') {}

  normalizeDate(date: Date): string {
    return dayjs.utc(date)
      .tz(this.timezone)
      .format('YYYY-MM-DD');
  }

  createTimeOnly(timeStr: string, referenceDate: string = '2000-01-01'): dayjs.Dayjs {
    return dayjs(`${referenceDate} ${timeStr}`);
  }

  combineDateTime(date: Date, timeStr: string): dayjs.Dayjs {
    const localDate = dayjs(date).tz(this.timezone);
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    if (hours >= 24 || minutes >= 60) {
      throw new Error('Invalid time format');
    }

    return localDate
      .set('hour', hours)
      .set('minute', minutes);
  }
} 