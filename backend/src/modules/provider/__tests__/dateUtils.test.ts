import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Update imports to use new utility files
import { DateUtils } from '../utils/dateUtils';

describe('DateUtils', () => {
  describe('normalizeDate', () => {
    const testCases = [
      {
        name: 'handles Paris timezone',
        date: '2024-03-15T23:30:00.000Z',
        timezone: 'Europe/Paris',
        expected: '2024-03-16'
      },
      {
        name: 'handles Tokyo timezone',
        date: '2024-03-15T22:30:00.000Z',
        timezone: 'Asia/Tokyo',
        expected: '2024-03-16'
      },
      {
        name: 'handles New York timezone',
        date: '2024-03-15T22:30:00.000Z',
        timezone: 'America/New_York',
        expected: '2024-03-15'
      }
    ];

    testCases.forEach(({ name, date, timezone, expected }) => {
      it(name, () => {
        const dateUtils = new DateUtils(timezone);
        // Create date explicitly as UTC
        const testDate = new Date(Date.parse(date));
        const result = dateUtils.normalizeDate(testDate);
        expect(result).toBe(expected);
      });
    });

    it('uses default timezone when none provided', () => {
      const dateUtils = new DateUtils();
      const date = new Date('2024-03-15T23:30:00.000Z');
      const result = dateUtils.normalizeDate(date);
      // When it's 23:30 UTC, it's 00:30 the next day in Paris (UTC+1)
      expect(result).toBe('2024-03-16');
    });
  });

  describe('createTimeOnly', () => {
    const dateUtils = new DateUtils();

    it('creates correct time-only object', () => {
      const result = dateUtils.createTimeOnly('14:30');
      expect(result.format('HH:mm')).toBe('14:30');
    });

    it('uses provided reference date', () => {
      const result = dateUtils.createTimeOnly('14:30', '2024-03-15');
      expect(result.format('YYYY-MM-DD HH:mm')).toBe('2024-03-15 14:30');
    });

    it('handles 24-hour format', () => {
      const result = dateUtils.createTimeOnly('23:59');
      expect(result.format('HH:mm')).toBe('23:59');
    });

    it('handles leading zeros', () => {
      const result = dateUtils.createTimeOnly('09:05');
      expect(result.format('HH:mm')).toBe('09:05');
    });
  });

  describe('combineDateTime', () => {
    const testCases = [
      {
        name: 'combines date and time in Paris timezone',
        date: '2024-03-15T00:00:00.000Z',
        time: '14:30',
        timezone: 'Europe/Paris',
        expected: '2024-03-15T13:30:00.000Z' // Accounting for timezone
      },
      {
        name: 'handles timezone crossing midnight',
        date: '2024-03-15T00:00:00.000Z',
        time: '01:30',
        timezone: 'Asia/Tokyo',
        expected: '2024-03-14T16:30:00.000Z'
      },
      {
        name: 'handles time before DST change',
        date: '2024-03-30T00:00:00.000Z', // Day before DST
        time: '14:30',
        timezone: 'Europe/Paris',
        expected: '2024-03-30T13:30:00.000Z'  // UTC+1 before DST
      },
      {
        name: 'handles same time after DST change',
        date: '2024-04-01T00:00:00.000Z', // Day after DST
        time: '14:30',
        timezone: 'Europe/Paris',
        expected: '2024-04-01T12:30:00.000Z'  // UTC+2 after DST
      }
    ];

    testCases.forEach(({ name, date, time, timezone, expected }) => {
      it(name, () => {
        const dateUtils = new DateUtils(timezone);
        const result = dateUtils.combineDateTime(new Date(date), time);
        expect(result.toISOString()).toBe(expected);
      });
    });

    it('throws error for invalid time format', () => {
      const dateUtils = new DateUtils();
      expect(() => {
        dateUtils.combineDateTime(new Date(), '25:00');
      }).toThrow();
    });
  });


}); 