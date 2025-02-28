import { TimeSlotValidator } from '../utils/timeSlotValidator';
import { DateUtils } from '../utils/dateUtils';

describe('TimeSlotValidator', () => {
  const dateUtils = new DateUtils();
  const validator = new TimeSlotValidator(dateUtils);

  describe('validateNoTimeSlotOverlap', () => {
    it('accepts valid non-overlapping time slots', () => {
      const validSlots = [
        { 
          startTime: '09:00', 
          endTime: '12:00',
          requiresTravelTime: false,
          spansOvernight: false
        },
        { 
          startTime: '13:00', 
          endTime: '17:00',
          requiresTravelTime: false,
          spansOvernight: false
        }
      ];

      expect(() => validator.validateNoTimeSlotOverlap(validSlots)).not.toThrow();
    });

    it('accepts slots that touch but do not overlap', () => {
      const boundarySlots = [
        { 
          startTime: '09:00', 
          endTime: '12:00',
          requiresTravelTime: false,
          spansOvernight: false
        },
        { 
          startTime: '12:00', 
          endTime: '17:00',
          requiresTravelTime: false,
          spansOvernight: false
        }
      ];

      expect(() => validator.validateNoTimeSlotOverlap(boundarySlots)).not.toThrow();
    });

    it('handles overnight shifts correctly', () => {
      const overnightSlots = [
        { 
          startTime: '22:00', 
          endTime: '04:00', 
          spansOvernight: true,
          requiresTravelTime: false
        },
        { 
          startTime: '14:00', 
          endTime: '20:00',
          spansOvernight: false,
          requiresTravelTime: false
        }
      ];

      expect(() => validator.validateNoTimeSlotOverlap(overnightSlots)).not.toThrow();
    });

    it('rejects overlapping time slots', () => {
      const overlappingSlots = [
        { 
          startTime: '09:00', 
          endTime: '12:00',
          requiresTravelTime: false,
          spansOvernight: false
        },
        { 
          startTime: '11:00', 
          endTime: '14:00',
          requiresTravelTime: false,
          spansOvernight: false
        }
      ];

      expect(() => validator.validateNoTimeSlotOverlap(overlappingSlots))
        .toThrow('Time slots overlap or have invalid boundaries');
    });

    it('rejects slots with invalid boundaries', () => {
      const invalidSlots = [
        { 
          startTime: '09:00', 
          endTime: '09:00',
          requiresTravelTime: false,
          spansOvernight: false
        }
      ];

      expect(() => validator.validateNoTimeSlotOverlap(invalidSlots))
        .toThrow('Time slot cannot start and end at the same time');
    });

    it('handles overnight shifts with travel buffer', () => {
      const slotsWithBuffer = [
        { 
          startTime: '22:00', 
          endTime: '04:00', 
          spansOvernight: true,
          requiresTravelTime: true,
          travelBuffer: 30
        },
        { 
          startTime: '14:00', 
          endTime: '20:00',
          spansOvernight: false,
          requiresTravelTime: true,
          travelBuffer: 30
        }
      ];

      expect(() => validator.validateNoTimeSlotOverlap(slotsWithBuffer)).not.toThrow();
    });

    it('rejects insufficient travel buffer between slots', () => {
      const insufficientBuffer = [
        { 
          startTime: '09:00', 
          endTime: '12:00',
          requiresTravelTime: true,
          travelBuffer: 30,
          spansOvernight: false
        },
        { 
          startTime: '12:15', 
          endTime: '14:00',
          requiresTravelTime: true,
          travelBuffer: 30,
          spansOvernight: false
        }
      ];

      expect(() => validator.validateNoTimeSlotOverlap(insufficientBuffer))
        .toThrow('Insufficient travel buffer between slots');
    });

    describe('Overnight Shift Handling', () => {
      it('validates time slot correctly extends to next day when spansOvernight is true', () => {
        const overnightSlot = [
          { 
            startTime: '22:00', 
            endTime: '06:00',
            spansOvernight: true,
            requiresTravelTime: false
          }
        ];

        expect(() => validator.validateNoTimeSlotOverlap(overnightSlot)).not.toThrow();
      });

      it('throws error when endTime is before startTime but spansOvernight is false', () => {
        const invalidOvernightSlot = [
          { 
            startTime: '22:00', 
            endTime: '06:00',
            spansOvernight: false,
            requiresTravelTime: false
          }
        ];

        expect(() => validator.validateNoTimeSlotOverlap(invalidOvernightSlot))
          .toThrow('Time slot spans overnight but spansOvernight is false');
      });

      it('throws error when spansOvernight is true but times are within same day', () => {
        const invalidSpanSlot = [
          { 
            startTime: '09:00', 
            endTime: '17:00',
            spansOvernight: true,
            requiresTravelTime: false
          }
        ];

        expect(() => validator.validateNoTimeSlotOverlap(invalidSpanSlot))
          .toThrow('Time slot marked as overnight but times are within same day');
      });
    });
  });
});