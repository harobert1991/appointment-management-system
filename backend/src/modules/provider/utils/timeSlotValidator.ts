import { ITimeSlot } from '../provider.schema';
import { DateUtils } from './dateUtils';

export class TimeSlotValidator {
  constructor(private dateUtils: DateUtils) {}

  validateNoTimeSlotOverlap(timeSlots: ITimeSlot[]): void {
    timeSlots.forEach(slot => {
      const start = this.dateUtils.createTimeOnly(slot.startTime);
      const end = this.dateUtils.createTimeOnly(slot.endTime);
      
      if (start.isSame(end)) {
        throw new Error('Time slot cannot start and end at the same time');
      }

      if (end.isBefore(start) && !slot.spansOvernight) {
        throw new Error('Time slot spans overnight but spansOvernight is false');
      }

      if (!end.isBefore(start) && slot.spansOvernight) {
        throw new Error('Time slot marked as overnight but times are within same day');
      }
    });

    const slots = timeSlots
      .map(slot => {
        const start = this.dateUtils.createTimeOnly(slot.startTime);
        let end = this.dateUtils.createTimeOnly(slot.endTime);
        
        if (slot.spansOvernight) {
          end = end.add(1, 'day');
        }
        
        return { start, end, original: slot };
      })
      .sort((a, b) => a.start.valueOf() - b.start.valueOf());

    for (let i = 0; i < slots.length - 1; i++) {
      const current = slots[i];
      const next = slots[i + 1];

      if (current.end.isAfter(next.start)) {
        throw new Error(
          `Time slots overlap or have invalid boundaries: ` +
          `${current.original.startTime}-${current.original.endTime} and ` +
          `${next.original.startTime}-${next.original.endTime}`
        );
      }

      if (current.original.requiresTravelTime || next.original.requiresTravelTime) {
        const gap = next.start.diff(current.end, 'minute');
        const requiredBuffer = Math.max(
          current.original.travelBuffer || 0,
          next.original.travelBuffer || 0
        );
        
        if (gap < requiredBuffer) {
          throw new Error(
            `Insufficient travel buffer between slots: ` +
            `${current.original.startTime}-${current.original.endTime} and ` +
            `${next.original.startTime}-${next.original.endTime}. ` +
            `Required: ${requiredBuffer} minutes, Found: ${gap} minutes`
          );
        }
      }
    }
  }
} 