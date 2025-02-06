import { ITimeSlot, IAvailability, DayOfWeek } from '../provider.schema';
import { IAppointmentEvent } from '../../appointmentEvent/appointmentEvent.schema';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isBetween from 'dayjs/plugin/isBetween';
import { DateUtils } from './dateUtils';

// Initialize dayjs plugins
dayjs.extend(weekOfYear);
dayjs.extend(isBetween);

export class AvailabilityProcessor {
  private readonly REFERENCE_DATE = new Date('2024-01-01'); // Start of the year as reference

  constructor(private dateUtils: DateUtils) {}

  processTimeSlotsForDate(
    date: Date,
    timeSlots: ITimeSlot[],
    duration: number,
    minBreak: number = 0,
    specificTime?: Date,
    existingAppointments: IAppointmentEvent[] = []
  ): Array<{ startTime: Date; endTime: Date; locationId?: string }> {

    // First validate travel buffers between slots
    for (let i = 0; i < timeSlots.length - 1; i++) {
      const current = timeSlots[i];
      const next = timeSlots[i + 1];

      if (current.requiresTravelTime || next.requiresTravelTime) {
        const currentEnd = this.dateUtils.createTimeOnly(current.endTime);
        const nextStart = this.dateUtils.createTimeOnly(next.startTime);
        const gap = nextStart.diff(currentEnd, 'minute');
        const requiredBuffer = Math.max(
          current.travelBuffer || 0,
          next.travelBuffer || 0
        );

        if (gap < requiredBuffer) {
          throw new Error('Insufficient travel buffer between slots');
        }
      }
    }

    // Check for overlaps with existing appointments
    if (specificTime) {
      const requestedStart = dayjs(specificTime);
      const requestedEnd = requestedStart.add(duration, 'minute');

      const hasOverlap = existingAppointments.some(appt => {
        const apptStart = dayjs(appt.startDateTime);
        const apptEnd = dayjs(appt.endDateTime);
        return requestedStart.isBefore(apptEnd) && requestedEnd.isAfter(apptStart);
      });

      if (hasOverlap) {
        return [];
      }
    }

    const availableSlots: Array<{ startTime: Date; endTime: Date; locationId?: string }> = [];

    timeSlots.forEach((slot, index) => {

      if (specificTime) {
        const specificDayjs = dayjs(specificTime);
        const requestedHour = specificDayjs.hour();
        const slotStartHour = parseInt(slot.startTime.split(':')[0]);
        const slotEndHour = parseInt(slot.endTime.split(':')[0]);

        const isWithinSlot = slot.spansOvernight
          ? (requestedHour >= slotStartHour || requestedHour < slotEndHour)
          : (requestedHour >= slotStartHour && requestedHour < slotEndHour);

        if (isWithinSlot) {
          const slotStart = dayjs(date)
            .set('hour', requestedHour)
            .set('minute', specificDayjs.minute());
            
          const newSlot = {
            startTime: slotStart.toDate(),
            endTime: slotStart.add(duration, 'minute').toDate(),
            locationId: slot.locationId
          };
            
          availableSlots.push(newSlot);
        }
        return availableSlots;
      }

      // Regular slot generation
      let currentStart = dayjs(date)
        .set('hour', parseInt(slot.startTime.split(':')[0]))
        .set('minute', parseInt(slot.startTime.split(':')[1]));

      let slotEnd = dayjs(date)
        .set('hour', parseInt(slot.endTime.split(':')[0]))
        .set('minute', parseInt(slot.endTime.split(':')[1]));

      if (slot.spansOvernight) {
        slotEnd = slotEnd.add(1, 'day');
      }

      while (currentStart.add(duration, 'minute').isSameOrBefore(slotEnd)) {
        const newSlot = {
          startTime: currentStart.toDate(),
          endTime: currentStart.add(duration, 'minute').toDate(),
          locationId: slot.locationId
        };

        availableSlots.push(newSlot);
        currentStart = dayjs(currentStart).add(duration + minBreak, 'minute');
      }
    });

    return availableSlots;
  }

  private isAlternateWeek(date: Date, weeks: number[]): boolean {
    const currentWeek = dayjs(date).week();
    const startWeek = Math.min(...weeks); // e.g., 2 if weeks=[2]
    
    // Simple check if the difference from start week is even
    const weekDiff = currentWeek - startWeek;
    const isAlternateWeek = weekDiff >= 0 && weekDiff % 2 === 0;

    return isAlternateWeek;
  }

  getDayAvailability(
    availability: IAvailability[],
    dayOfWeek: DayOfWeek,
    date: Date,
    exceptions: Date[] = []
  ): IAvailability | null {
    // Check exceptions first
    const dateStr = this.dateUtils.normalizeDate(date);
    if (exceptions.some(d => this.dateUtils.normalizeDate(d) === dateStr)) {
      return null;
    }

    return availability.find(a => {
      const dayMatches = a.dayOfWeek === dayOfWeek;
      const weekMatches = !a.weeks || this.isAlternateWeek(date, a.weeks);

      return dayMatches && weekMatches;
    }) || null;
  }

  getSpecificDateAvailability(
    availability: IAvailability[],
    date: Date
  ): { timeSlots: ITimeSlot[] } | null {
    const dateStr = this.dateUtils.normalizeDate(date);
    
    return availability.reduce<{ timeSlots: ITimeSlot[] } | null>((result, schedule) => {
      if (result) return result;
      
      const matchingDate = schedule.specificDates?.find(sd => 
        this.dateUtils.normalizeDate(sd.date) === dateStr
      );
      
      return matchingDate ? { timeSlots: matchingDate.timeSlots } : null;
    }, null);
  }

  validateAvailabilityUpdate(
    oldAvailability: IAvailability[],
    newAvailability: IAvailability[],
    existingAppointments: IAppointmentEvent[]
  ): void {
    for (const appointment of existingAppointments) {
      const dayOfWeek = dayjs(appointment.startDateTime).format('dddd') as DayOfWeek;
      const date = appointment.startDateTime;

      // Check specific date availability first
      const specificDate = this.getSpecificDateAvailability(newAvailability, date);
      if (specificDate) {
        if (!this.isTimeSlotAvailable(specificDate.timeSlots, appointment)) {
          throw new Error('New schedule conflicts with existing appointments');
        }
        continue;
      }

      // Check regular availability
      const dayAvailability = this.getDayAvailability(newAvailability, dayOfWeek, date);
      if (!dayAvailability || !this.isTimeSlotAvailable(dayAvailability.timeSlots, appointment)) {
        throw new Error('New schedule conflicts with existing appointments');
      }
    }
  }

  private isTimeSlotAvailable(
    timeSlots: ITimeSlot[],
    appointment: IAppointmentEvent
  ): boolean {
    return timeSlots.some(slot => {
      const apptStartTime = dayjs(appointment.startDateTime).format('HH:mm');
      const apptEndTime = dayjs(appointment.endDateTime).format('HH:mm');
      
      return (
        slot.locationId === appointment.location &&
        apptStartTime >= slot.startTime &&
        apptEndTime <= slot.endTime
      );
    });
  }
} 