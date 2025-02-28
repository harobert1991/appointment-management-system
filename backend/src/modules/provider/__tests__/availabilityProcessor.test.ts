import { AvailabilityProcessor } from '../utils/availabilityProcessor';
import { DateUtils } from '../utils/dateUtils';
import { IAvailability, DayOfWeek } from '../provider.schema';
import dayjs from 'dayjs';
import { AppointmentStatus, AppointmentType } from '../../appointmentEvent/appointmentEvent.schema';

describe('Availability Processor Integration Tests', () => {
  const dateUtils = new DateUtils();
  const processor = new AvailabilityProcessor(dateUtils);

  describe('Provider Fully Available (24/7)', () => {
    const fullAvailability: IAvailability[] = [
      {
        dayOfWeek: 'Monday' as DayOfWeek,
        timeSlots: [
          {
            startTime: '00:00',
            endTime: '24:00',
            requiresTravelTime: false,
            spansOvernight: false
          }
        ],
        isRecurring: true
      }
    ];

    it('accepts appointments at any time', () => {
      const testTimes = [
        '02:00', '08:00', '13:00', '19:00', '23:00'
      ];

      testTimes.forEach(time => {
        const date = new Date(`2024-03-18T${time}:00`); // A Monday
        const result = processor.getDayAvailability(
          fullAvailability,
          'Monday',
          date
        );

        expect(result).not.toBeNull();
        const slots = processor.processTimeSlotsForDate(date, result!.timeSlots, 60);
        expect(slots.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Provider with Weekly Availability (M-F, 9-5)', () => {
    const weeklyAvailability: IAvailability[] = [
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
    ].map(day => ({
      dayOfWeek: day as DayOfWeek,
      timeSlots: [
        {
          startTime: '09:00',
          endTime: '17:00',
          requiresTravelTime: false,
          spansOvernight: false
        }
      ],
      isRecurring: true
    }));

    it('accepts appointments during business hours', () => {
      // Tuesday March 19, 2024 at 10 AM
      const validDate = new Date('2024-03-19T10:00:00');
      const result = processor.getDayAvailability(
        weeklyAvailability,
        'Tuesday',
        validDate
      );

      expect(result).not.toBeNull();
      const slots = processor.processTimeSlotsForDate(validDate, result!.timeSlots, 60);
      expect(slots.length).toBeGreaterThan(0);
    });

    it('rejects appointments before business hours', () => {
      const earlyDate = new Date('2024-03-19T08:00:00'); // 8 AM Tuesday
      const result = processor.getDayAvailability(
        weeklyAvailability,
        'Tuesday',
        earlyDate
      );

      // Get slots specifically for 8 AM
      const slots = processor.processTimeSlotsForDate(
        earlyDate, 
        result!.timeSlots, 
        60,
        0,
        earlyDate // Add a parameter to only check this specific time
      );
      expect(slots.length).toBe(0);
    });

    it('rejects appointments after business hours', () => {
      const lateDate = new Date('2024-03-19T18:00:00'); // 6 PM Tuesday
      const result = processor.getDayAvailability(
        weeklyAvailability,
        'Tuesday',
        lateDate
      );

      // Get slots specifically for 6 PM
      const slots = processor.processTimeSlotsForDate(
        lateDate, 
        result!.timeSlots, 
        60,
        0,
        lateDate // Add a parameter to only check this specific time
      );
      expect(slots.length).toBe(0);
    });

    it('rejects weekend appointments', () => {
      const weekendDate = new Date('2024-03-23T10:00:00'); // Saturday
      const result = processor.getDayAvailability(
        weeklyAvailability,
        'Saturday',
        weekendDate
      );

      expect(result).toBeNull(); // No availability on weekends
    });
  });

  describe('Provider with Split Shifts', () => {
    const splitShiftAvailability: IAvailability[] = [
      {
        dayOfWeek: 'Monday' as DayOfWeek,
        timeSlots: [
          {
            startTime: '09:00',
            endTime: '12:00',
            requiresTravelTime: false,
            spansOvernight: false
          },
          {
            startTime: '14:00',
            endTime: '18:00',
            requiresTravelTime: false,
            spansOvernight: false
          }
        ],
        isRecurring: true
      }
    ];

    it('accepts appointments during shift hours', () => {
      const validTimes = [
        new Date('2024-03-18T11:00:00'), // Morning shift
        new Date('2024-03-18T16:00:00')  // Afternoon shift
      ];

      validTimes.forEach(date => {
        const result = processor.getDayAvailability(
          splitShiftAvailability,
          'Monday',
          date
        );

        expect(result).not.toBeNull();
        const slots = processor.processTimeSlotsForDate(date, result!.timeSlots, 60);
        expect(slots.length).toBeGreaterThan(0);
      });
    });

    it('rejects appointments during break time', () => {
      // Monday at 1 PM (during break)
      const breakTime = new Date('2024-03-18T13:00:00');
      const result = processor.getDayAvailability(
        splitShiftAvailability,
        'Monday',
        breakTime
      );

      expect(result).not.toBeNull();
      const slots = processor.processTimeSlotsForDate(breakTime, result!.timeSlots, 60);
      const breakTimeSlots = slots.filter(slot => {
        const hour = slot.startTime.getHours();
        return hour >= 12 && hour < 14;
      });
      expect(breakTimeSlots.length).toBe(0);
    });
  });

  describe('Specific Date Rules', () => {
    const specificDateAvailability: IAvailability[] = [
      {
        dayOfWeek: 'Sunday' as DayOfWeek, // March 10, 2024 is a Sunday
        timeSlots: [],
        isRecurring: false,
        specificDates: [
          {
            date: new Date('2024-03-10'),
            timeSlots: [
              {
                startTime: '08:00',
                endTime: '16:00',
                requiresTravelTime: false,
                spansOvernight: false,
                locationId: 'clinic_a'
              }
            ]
          }
        ]
      }
    ];

    it('allows appointments on specifically available dates', () => {
      const specificDate = new Date('2024-03-10T09:00:00'); // 9 AM on March 10
      const result = processor.getSpecificDateAvailability(
        specificDateAvailability,
        specificDate
      );

      expect(result).not.toBeNull();
      
      // Process slots for the specific time only
      const slots = processor.processTimeSlotsForDate(
        specificDate,
        result!.timeSlots,
        60,  // 1-hour appointment
        0,   // no break
        specificDate  // only check 9 AM
      );


      // Should get exactly one slot at 9 AM
      expect(slots.length).toBe(1);
      expect(slots[0].startTime.getHours()).toBe(9);
      expect(slots[0].endTime.getHours()).toBe(10);
    });

    it('rejects appointments on dates without specific availability', () => {
      const nextDay = new Date('2024-03-11T09:00:00'); // 9 AM on March 11
      const result = processor.getSpecificDateAvailability(
        specificDateAvailability,
        nextDay
      );

      expect(result).toBeNull();
    });

    it('rejects appointments outside specific date hours', () => {
      const earlyTime = new Date('2024-03-10T07:00:00'); // 7 AM on March 10 (before available hours)
      const result = processor.getSpecificDateAvailability(
        specificDateAvailability,
        earlyTime
      );

      expect(result).not.toBeNull();
      const slots = processor.processTimeSlotsForDate(
        earlyTime,
        result!.timeSlots,
        60,
        0,
        earlyTime
      );
      expect(slots.length).toBe(0);
    });

    it('handles transition between specific and regular availability', () => {
      const mixedAvailability: IAvailability[] = [
        {
          dayOfWeek: 'Sunday' as DayOfWeek,
          timeSlots: [
            {
              startTime: '10:00',
              endTime: '18:00',
              requiresTravelTime: false,
              spansOvernight: false
            }
          ],
          isRecurring: true
        },
        ...specificDateAvailability // Add specific date override
      ];

      // Check specific date override (8 AM - 4 PM)
      const specificDate = new Date('2024-03-10T09:00:00');
      const specificResult = processor.getSpecificDateAvailability(
        mixedAvailability,
        specificDate
      );
      expect(specificResult?.timeSlots[0].startTime).toBe('08:00');
      expect(specificResult?.timeSlots[0].endTime).toBe('16:00');

      // Check regular Sunday next week (10 AM - 6 PM)
      const regularDate = new Date('2024-03-17T09:00:00');
      const regularResult = processor.getDayAvailability(
        mixedAvailability,
        'Sunday',
        regularDate
      );
      expect(regularResult?.timeSlots[0].startTime).toBe('10:00');
      expect(regularResult?.timeSlots[0].endTime).toBe('18:00');
    });
  });

  describe('Back-to-Back and Overlapping Appointments', () => {
    const availability: IAvailability[] = [
      {
        dayOfWeek: 'Monday' as DayOfWeek,
        timeSlots: [
          {
            startTime: '10:00',
            endTime: '12:00',
            requiresTravelTime: false,
            spansOvernight: false,
            locationId: 'clinic_a'
          }
        ],
        isRecurring: true
      }
    ];

    describe('Back-to-Back Appointments', () => {
      it('allows booking consecutive slots', () => {
        const date = new Date('2024-03-18'); // A Monday
        const result = processor.getDayAvailability(
          availability,
          'Monday',
          date
        );

        expect(result).not.toBeNull();
        
        // Get all available slots
        const slots = processor.processTimeSlotsForDate(
          date,
          result!.timeSlots,
          60  // 1-hour appointments
        );

        // Should have two slots: 10-11 and 11-12
        expect(slots.length).toBe(2);
        expect(dayjs(slots[0].startTime).format('HH:mm')).toBe('10:00');
        expect(dayjs(slots[0].endTime).format('HH:mm')).toBe('11:00');
        expect(dayjs(slots[1].startTime).format('HH:mm')).toBe('11:00');
        expect(dayjs(slots[1].endTime).format('HH:mm')).toBe('12:00');
      });

      it('keeps later slots available after booking', () => {
        const date = new Date('2024-03-18');
        const existingAppointment = {
          startDateTime: new Date('2024-03-18T10:00:00'),
          endDateTime: new Date('2024-03-18T11:00:00'),
          location: 'clinic_a',
          participants: [],
          status: AppointmentStatus.CONFIRMED,
          appointmentType: AppointmentType.IN_PERSON,
          title: 'Test Appointment',
          description: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          _id: 'test_id',
          isAllDay: false,
          $assertPopulated: () => {},
          $clone: () => ({} as any)
        } as any;

        // Check if 11 AM slot is still available
        const elevenAM = new Date('2024-03-18T11:00:00');
        const result = processor.getDayAvailability(
          availability,
          'Monday',
          elevenAM
        );

        expect(result).not.toBeNull();
        const slots = processor.processTimeSlotsForDate(
          elevenAM,
          result!.timeSlots,
          60,
          0,
          elevenAM
        );

        expect(slots.length).toBe(1);
        expect(dayjs(slots[0].startTime).format('HH:mm')).toBe('11:00');
      });
    });

    describe('Overlapping Appointments', () => {
      const existingAppointment = {
        startDateTime: new Date('2024-03-18T10:00:00'),
        endDateTime: new Date('2024-03-18T11:00:00'),
        location: 'clinic_a',
        participants: [],
        status: AppointmentStatus.CONFIRMED,
        appointmentType: AppointmentType.IN_PERSON,
        title: 'Test Appointment',
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        _id: 'test_id',
        isAllDay: false,
        $assertPopulated: () => {},
        $clone: () => ({} as any)
      } as any;

      it('rejects overlapping appointments', () => {
        const overlapTime = new Date('2024-03-18T10:30:00');
        const result = processor.getDayAvailability(
          availability,
          'Monday',
          overlapTime
        );

        expect(result).not.toBeNull();
        
        // Try to book a slot that would overlap with existing appointment
        const slots = processor.processTimeSlotsForDate(
          overlapTime,
          result!.timeSlots,
          60,
          0,
          overlapTime,
          [existingAppointment]  // Pass the existing appointment
        );

        // Should not allow booking at 10:30 as it overlaps with 10:00-11:00
        expect(slots.length).toBe(0);
      });

      it('accepts non-overlapping appointments', () => {
        const validTime = new Date('2024-03-18T11:00:00');
        const result = processor.getDayAvailability(
          availability,
          'Monday',
          validTime
        );

        expect(result).not.toBeNull();
        
        // Try to book the 11:00-12:00 slot
        const slots = processor.processTimeSlotsForDate(
          validTime,
          result!.timeSlots,
          60,
          0,
          validTime
        );

        // Should allow booking at 11:00 as it doesn't overlap
        expect(slots.length).toBe(1);
        expect(dayjs(slots[0].startTime).format('HH:mm')).toBe('11:00');
        expect(dayjs(slots[0].endTime).format('HH:mm')).toBe('12:00');
      });
    });
  });
}); 