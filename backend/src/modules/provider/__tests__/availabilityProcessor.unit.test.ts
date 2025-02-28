import { AvailabilityProcessor } from '../utils/availabilityProcessor';
import { DateUtils } from '../utils/dateUtils';
import { IAvailability, DayOfWeek } from '../provider.schema';
import dayjs from 'dayjs';
import { AppointmentStatus, AppointmentType } from '../../appointmentEvent/appointmentEvent.schema';

describe('AvailabilityProcessor', () => {
  const dateUtils = new DateUtils();
  const processor = new AvailabilityProcessor(dateUtils);

  describe('Specific Date Availability Lookup', () => {
    const baseTimeSlots = [
      {
        startTime: '09:00',
        endTime: '17:00',
        requiresTravelTime: false,
        spansOvernight: false
      }
    ];

    const availability: IAvailability[] = [
      {
        dayOfWeek: 'Monday' as DayOfWeek,
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
      {
        dayOfWeek: 'Monday' as DayOfWeek,
        timeSlots: baseTimeSlots,
        isRecurring: false,
        specificDates: [
          {
            date: new Date('2024-03-18'),
            timeSlots: baseTimeSlots
          }
        ]
      }
    ];

    it('prioritizes specific date over weekly schedule', () => {
      const result = processor.getSpecificDateAvailability(
        availability,
        new Date('2024-03-18')
      );

      expect(result).not.toBeNull();
      expect(result?.timeSlots[0].startTime).toBe('09:00');
      expect(result?.timeSlots[0].endTime).toBe('17:00');
    });

    it('returns null when no specific date is available', () => {
      const result = processor.getSpecificDateAvailability(
        availability,
        new Date('2024-03-19') // A Tuesday
      );

      expect(result).toBeNull();
    });

    it('handles multiple specific dates correctly', () => {
      const multiDateAvailability: IAvailability[] = [
        {
          dayOfWeek: 'Monday',
          timeSlots: baseTimeSlots,
          isRecurring: false,
          specificDates: [
            {
              date: new Date('2024-03-18'),
              timeSlots: [{ ...baseTimeSlots[0], startTime: '09:00' }]
            },
            {
              date: new Date('2024-03-19'),
              timeSlots: [{ ...baseTimeSlots[0], startTime: '10:00' }]
            }
          ]
        }
      ];

      const result = processor.getSpecificDateAvailability(
        multiDateAvailability,
        new Date('2024-03-19')
      );

      expect(result).not.toBeNull();
      expect(result?.timeSlots[0].startTime).toBe('10:00');
    });

    it('returns first matching specific date when multiple schedules exist', () => {
      const duplicateAvailability: IAvailability[] = [
        {
          dayOfWeek: 'Monday' as DayOfWeek,
          timeSlots: baseTimeSlots,
          isRecurring: false,
          specificDates: [
            {
              date: new Date('2024-03-18'),
              timeSlots: [{ ...baseTimeSlots[0], startTime: '09:00' }]
            }
          ]
        },
        {
          dayOfWeek: 'Monday' as DayOfWeek,
          timeSlots: baseTimeSlots,
          isRecurring: false,
          specificDates: [
            {
              date: new Date('2024-03-18'),
              timeSlots: [{ ...baseTimeSlots[0], startTime: '10:00' }]
            }
          ]
        }
      ];

      const result = processor.getSpecificDateAvailability(
        duplicateAvailability,
        new Date('2024-03-18')
      );

      expect(result).not.toBeNull();
      expect(result?.timeSlots[0].startTime).toBe('09:00');
    });

    it('handles timezone differences correctly', () => {
      const parisDateUtils = new DateUtils('Europe/Paris');
      const parisProcessor = new AvailabilityProcessor(parisDateUtils);
      
      // Create a date that's the 18th in UTC but might be the 19th in Paris
      const lateNightUTC = new Date('2024-03-18T23:30:00.000Z');

      const result = parisProcessor.getSpecificDateAvailability(
        availability,
        lateNightUTC
      );

      // The result should match the date as seen in Paris timezone
      const expectedMatch = parisDateUtils.normalizeDate(lateNightUTC) === '2024-03-18';
      expect(result !== null).toBe(expectedMatch);
    });
  });

  describe('Travel Buffer Between Appointments', () => {
    it('accepts slots with sufficient travel buffer', () => {
      const slots = [
        {
          startTime: '09:00',
          endTime: '12:00',
          requiresTravelTime: true,
          travelBuffer: 30,
          spansOvernight: false
        },
        {
          startTime: '13:00', // 1 hour buffer > 30 min required
          endTime: '17:00',
          requiresTravelTime: true,
          travelBuffer: 30,
          spansOvernight: false
        }
      ];

      const result = processor.processTimeSlotsForDate(new Date(), slots, 60);
      expect(result.length).toBeGreaterThan(0);
    });

    it('rejects slots with insufficient travel buffer', () => {
      const slots = [
        {
          startTime: '09:00',
          endTime: '12:00',
          requiresTravelTime: true,
          travelBuffer: 30,
          spansOvernight: false
        },
        {
          startTime: '12:15', // Only 15 min buffer < 30 min required
          endTime: '17:00',
          requiresTravelTime: true,
          travelBuffer: 30,
          spansOvernight: false
        }
      ];

      expect(() => processor.processTimeSlotsForDate(new Date(), slots, 60))
        .toThrow('Insufficient travel buffer');
    });
  });

  describe('Exception Date Handling', () => {
    const baseSchedule: IAvailability[] = [
      {
        dayOfWeek: 'Monday',
        timeSlots: [
          {
            startTime: '09:00',
            endTime: '17:00',
            requiresTravelTime: false,
            spansOvernight: false
          }
        ],
        isRecurring: true
      }
    ];

    const exceptions = [new Date('2024-03-18')]; // Add exceptions array

    it('returns no availability on exception dates', () => {
      const exceptionDate = new Date('2024-03-18'); // A Monday
      const result = processor.getDayAvailability(
        baseSchedule,
        'Monday',
        exceptionDate,
        exceptions  // Pass exceptions to method
      );

      expect(result).toBeNull();
    });

    it('returns normal availability on non-exception dates', () => {
      const normalDate = new Date('2024-03-25'); // Another Monday
      const result = processor.getDayAvailability(
        baseSchedule,
        'Monday',
        normalDate,
        exceptions  // Pass exceptions to method
      );

      expect(result).not.toBeNull();
      expect(result?.timeSlots[0].startTime).toBe('09:00');
    });
  });

  describe('Week-Specific Availability', () => {
    const biweeklySchedule: IAvailability[] = [
      {
        dayOfWeek: dayjs(new Date('2024-01-08')).format('dddd') as DayOfWeek,
        timeSlots: [
          {
            startTime: '09:00',
            endTime: '17:00',
            requiresTravelTime: false,
            spansOvernight: false
          }
        ],
        isRecurring: true,
        weeks: [2] // Start on week 2, then every other week
      }
    ];

    it('returns availability for correct alternating weeks', () => {
      // These dates should be available (every other week starting week 2)
      const availableDates = [
        new Date('2024-01-08'), // Week 2
        new Date('2024-01-22'), // Week 4
        new Date('2024-02-05'), // Week 6
        new Date('2024-02-19'), // Week 8
        new Date('2024-03-04'), // Week 10
        new Date('2024-03-18')  // Week 12
      ];

      availableDates.forEach(date => {
        const dayOfWeek = dayjs(date).format('dddd') as DayOfWeek;
        const result = processor.getDayAvailability(
          biweeklySchedule,
          dayOfWeek,
          date
        );
        expect(result).not.toBeNull();
      });
    });

    it('returns no availability for off weeks', () => {
      // These dates should not be available
      const unavailableDates = [
        new Date('2024-01-15'), // Week 3
        new Date('2024-01-29'), // Week 5
        new Date('2024-02-12'), // Week 7
        new Date('2024-02-26'), // Week 9
        new Date('2024-03-11')  // Week 11
      ];

      unavailableDates.forEach(date => {
        const dayOfWeek = dayjs(date).format('dddd') as DayOfWeek;
        const result = processor.getDayAvailability(
          biweeklySchedule,
          dayOfWeek,
          date
        );
        expect(result).toBeNull();
      });
    });
  });

  describe('Generating Available Time Slots', () => {
    const baseSlot = {
      startTime: '09:00',
      endTime: '17:00',
      requiresTravelTime: false,
      spansOvernight: false
    };

    it('generates correct number of slots for given duration', () => {
      const slots = [baseSlot];
      const duration = 60; // 1 hour appointments
      const minBreak = 0;

      const result = processor.processTimeSlotsForDate(new Date(), slots, duration, minBreak);

      // 8 hour slot should yield 8 one-hour appointments
      expect(result.length).toBe(8);
      expect(result[0].startTime.getHours()).toBe(9);
      expect(result[7].startTime.getHours()).toBe(16);
    });

    it('applies breaks between appointments correctly', () => {
      const slots = [baseSlot];
      const duration = 60; // 1 hour appointments
      const minBreak = 30; // 30 minute breaks

      const result = processor.processTimeSlotsForDate(new Date(), slots, duration, minBreak);

      // 8 hour slot with 1.5 hour blocks (1h appointment + 30min break) should yield 5 appointments
      expect(result.length).toBe(5);
      
      // Verify gaps between appointments
      for (let i = 0; i < result.length - 1; i++) {
        const gap = (result[i + 1].startTime.getTime() - result[i].endTime.getTime()) / (1000 * 60);
        expect(gap).toBe(30);
      }
    });
  });

  describe('Handling Different Appointment Durations', () => {
    const baseSlot = {
      startTime: '09:00',
      endTime: '17:00',
      requiresTravelTime: false,
      spansOvernight: false
    };

    it('handles different appointment durations correctly', () => {
      const slots = [baseSlot];
      
      // Test 30-minute appointments
      const shortResult = processor.processTimeSlotsForDate(new Date(), slots, 30);
      expect(shortResult.length).toBe(16); // 8 hours = 16 30-minute slots

      // Test 2-hour appointments
      const longResult = processor.processTimeSlotsForDate(new Date(), slots, 120);
      expect(longResult.length).toBe(4); // 8 hours = 4 2-hour slots
    });

    it('rejects appointments that exceed slot duration', () => {
      const shortSlot = {
        startTime: '09:00',
        endTime: '10:00', // 1 hour slot
        requiresTravelTime: false,
        spansOvernight: false
      };

      const result = processor.processTimeSlotsForDate(
        new Date(),
        [shortSlot],
        120 // 2 hour appointment
      );

      expect(result.length).toBe(0); // No valid slots should be found
    });

    it('handles appointments that exactly fit the slot', () => {
      const twoHourSlot = {
        startTime: '09:00',
        endTime: '11:00', // 2 hour slot
        requiresTravelTime: false,
        spansOvernight: false
      };

      const result = processor.processTimeSlotsForDate(
        new Date(),
        [twoHourSlot],
        120 // 2 hour appointment
      );

      expect(result.length).toBe(1);
      expect(result[0].startTime.getHours()).toBe(9);
      expect(result[0].endTime.getHours()).toBe(11);
    });
  });

  describe('Multi-Location Scheduling', () => {
    const multiLocationSlots = [
      {
        startTime: '09:00',
        endTime: '12:00',
        requiresTravelTime: true,
        travelBuffer: 30,
        spansOvernight: false,
        locationId: 'location_a'
      },
      {
        startTime: '13:00',
        endTime: '17:00',
        requiresTravelTime: true,
        travelBuffer: 30,
        spansOvernight: false,
        locationId: 'location_b'
      }
    ];

    it('generates slots with correct location IDs', () => {
      const result = processor.processTimeSlotsForDate(new Date(), multiLocationSlots, 60);
      
      // Morning slots should be in location A
      const morningSlots = result.filter(slot => slot.startTime.getHours() < 12);
      morningSlots.forEach(slot => {
        expect(slot.locationId).toBe('location_a');
      });

      // Afternoon slots should be in location B
      const afternoonSlots = result.filter(slot => slot.startTime.getHours() >= 13);
      afternoonSlots.forEach(slot => {
        expect(slot.locationId).toBe('location_b');
      });
    });

    it('enforces travel buffer between locations', () => {
      const tightSlots = [
        {
          startTime: '09:00',
          endTime: '12:00',
          requiresTravelTime: true,
          travelBuffer: 60,  // Needs 1 hour travel time
          spansOvernight: false,
          locationId: 'location_a'
        },
        {
          startTime: '12:30', // Only 30 min gap
          endTime: '17:00',
          requiresTravelTime: true,
          travelBuffer: 60,
          spansOvernight: false,
          locationId: 'location_b'
        }
      ];

      expect(() => processor.processTimeSlotsForDate(new Date(), tightSlots, 60))
        .toThrow('Insufficient travel buffer');
    });
  });

  describe('Time Slot Availability Check', () => {
    const baseTimeSlots = [
      {
        startTime: '09:00',
        endTime: '17:00',
        requiresTravelTime: false,
        spansOvernight: false,
        locationId: 'location_a'
      }
    ];

    const availability: IAvailability[] = [
      {
        dayOfWeek: 'Monday' as DayOfWeek,
        timeSlots: baseTimeSlots,
        isRecurring: true
      },
      {
        dayOfWeek: 'Monday' as DayOfWeek,
        timeSlots: [
          {
            startTime: '10:00',
            endTime: '15:00',
            requiresTravelTime: false,
            spansOvernight: false,
            locationId: 'location_b'
          }
        ],
        isRecurring: false,
        specificDates: [
          {
            date: new Date('2024-03-18'),
            timeSlots: [
              {
                startTime: '11:00',
                endTime: '16:00',
                requiresTravelTime: false,
                spansOvernight: false,
                locationId: 'location_c'
              }
            ]
          }
        ]
      }
    ];

    it('validates normal time slots', () => {
      const mondayDate = new Date('2024-03-11'); // A regular Monday
      const result = processor.getDayAvailability(
        availability,
        'Monday',
        mondayDate
      );

      expect(result).not.toBeNull();
      expect(result?.timeSlots[0].locationId).toBe('location_a');
      expect(result?.timeSlots[0].startTime).toBe('09:00');
    });

    it('prioritizes specific date overrides', () => {
      const specificDate = new Date('2024-03-18');
      const result = processor.getSpecificDateAvailability(
        availability,
        specificDate
      );

      expect(result).not.toBeNull();
      expect(result?.timeSlots[0].locationId).toBe('location_c');
      expect(result?.timeSlots[0].startTime).toBe('11:00');
    });

    it('respects exception dates', () => {
      const exceptionDate = new Date('2024-03-25');
      const result = processor.getDayAvailability(
        availability,
        'Monday',
        exceptionDate,
        [exceptionDate]
      );

      expect(result).toBeNull();
    });

    it('validates location-specific constraints', () => {
      const slots = [
        {
          startTime: '09:00',
          endTime: '12:00',
          requiresTravelTime: true,
          travelBuffer: 30,
          spansOvernight: false,
          locationId: 'location_a'
        },
        {
          startTime: '12:15',
          endTime: '17:00',
          requiresTravelTime: true,
          travelBuffer: 30,
          spansOvernight: false,
          locationId: 'location_b'
        }
      ];

      expect(() => processor.processTimeSlotsForDate(new Date(), slots, 60))
        .toThrow('Insufficient travel buffer');
    });
  });

  describe('Night Shift Availability', () => {
    const nightShiftSlots = [
      {
        startTime: '22:00',
        endTime: '06:00',
        requiresTravelTime: false,
        spansOvernight: true,
        locationId: 'hospital_a'
      }
    ];

    it('accepts bookings during night shift hours', () => {
      const date = new Date('2024-03-18');
      const result = processor.processTimeSlotsForDate(date, nightShiftSlots, 60);

      // Should have slots from 22:00 to 06:00
      expect(result.length).toBe(8); // 8 one-hour slots

      // Check specific times
      const times = result.map(slot => slot.startTime.getHours());
      expect(times).toContain(22); // 10 PM
      expect(times).toContain(23); // 11 PM
      expect(times).toContain(0);  // 12 AM
      expect(times).toContain(5);  // 5 AM

      // First slot should be at 10 PM
      expect(result[0].startTime.getHours()).toBe(22);
      // Last slot should be at 5 AM
      expect(result[result.length - 1].startTime.getHours()).toBe(5);
    });

    it('rejects bookings outside night shift hours', () => {
      const date = new Date('2024-03-18');
      const result = processor.processTimeSlotsForDate(date, nightShiftSlots, 60);

      // Check that no slots exist during day hours
      const dayHourSlots = result.filter(slot => {
        const hour = slot.startTime.getHours();
        return hour >= 6 && hour < 22; // 6 AM to 10 PM
      });

      expect(dayHourSlots.length).toBe(0);
    });
  });

  describe('Update Provider Availability', () => {
    const oldAvailability: IAvailability[] = [
      {
        dayOfWeek: 'Monday' as DayOfWeek,
        timeSlots: [
          {
            startTime: '09:00',
            endTime: '17:00',
            requiresTravelTime: false,
            spansOvernight: false,
            locationId: 'clinic_a'
          }
        ],
        isRecurring: true
      }
    ];

    const newAvailability: IAvailability[] = [
      {
        dayOfWeek: 'Monday' as DayOfWeek,
        timeSlots: [
          {
            startTime: '10:00',
            endTime: '18:00',
            requiresTravelTime: false,
            spansOvernight: false,
            locationId: 'clinic_a'
          }
        ],
        isRecurring: true
      }
    ];

    const existingAppointments = [{
      startDateTime: new Date('2024-03-18T14:00:00'),
      endDateTime: new Date('2024-03-18T15:00:00'),
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
    } as any, {
      startDateTime: new Date('2024-03-18T09:30:00'),
      endDateTime: new Date('2024-03-18T10:30:00'),
      location: 'clinic_a',
      participants: [],
      status: AppointmentStatus.CONFIRMED,
      appointmentType: AppointmentType.IN_PERSON,
      title: 'Test Appointment',
      description: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      _id: 'test_id2',
      isAllDay: false,
      $assertPopulated: () => {},
      $clone: () => ({} as any)
    } as any];

    const validAppointments = [{
      startDateTime: new Date('2024-03-18T11:00:00'),
      endDateTime: new Date('2024-03-18T12:00:00'),
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
    } as any];

    it('validates new availability against existing appointments', () => {
      expect(() => 
        processor.validateAvailabilityUpdate(
          oldAvailability,
          newAvailability,
          existingAppointments
        )
      ).toThrow('New schedule conflicts with existing appointments');
    });

    it('accepts valid availability update', () => {
      expect(() => 
        processor.validateAvailabilityUpdate(
          oldAvailability,
          newAvailability,
          validAppointments
        )
      ).not.toThrow();
    });

    it('validates specific date overrides in update', () => {
      const availabilityWithOverride: IAvailability[] = [
        ...newAvailability,
        {
          dayOfWeek: 'Monday' as DayOfWeek,
          timeSlots: [],
          isRecurring: false,
          specificDates: [
            {
              date: new Date('2024-03-18'),
              timeSlots: [
                {
                  startTime: '11:00',
                  endTime: '19:00',
                  requiresTravelTime: false,
                  spansOvernight: false,
                  locationId: 'clinic_a'
                }
              ]
            }
          ]
        }
      ];

      // 2 PM appointment should still be valid with the override
      expect(() => 
        processor.validateAvailabilityUpdate(
          oldAvailability,
          availabilityWithOverride,
          validAppointments
        )
      ).not.toThrow();
    });
  });
}); 