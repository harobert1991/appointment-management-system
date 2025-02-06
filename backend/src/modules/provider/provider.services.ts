import { DatabaseService } from '../../rootModules/database/database.services';
import { Provider, IProvider, IAvailability, ITimeSlot, DayOfWeek } from './provider.schema';
import { FilterQuery } from 'mongoose';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { DateUtils } from './utils/dateUtils';
import { TimeSlotValidator } from './utils/timeSlotValidator';
import { AvailabilityProcessor } from './utils/availabilityProcessor';
import { AppointmentEventService } from '../appointmentEvent/appointmentEvent.services';
import { IAppointmentEvent } from '../appointmentEvent/appointmentEvent.schema';
import { UserService } from '../user/user.services';
import { IUser } from '../user/user.schema';

// Initialize dayjs plugins
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(weekOfYear);
dayjs.extend(timezone);
dayjs.extend(utc);

class ProviderNotFoundError extends Error {
  constructor(providerId: string) {
    super(`Provider with ID ${providerId} not found`);
    this.name = 'ProviderNotFoundError';
  }
}

export class ProviderService extends DatabaseService<IProvider> {
  private dateUtils: DateUtils;
  private timeSlotValidator: TimeSlotValidator;
  private availabilityProcessor: AvailabilityProcessor;
  public validateNoTimeSlotOverlap: (timeSlots: ITimeSlot[]) => void;


  constructor() {
    super(Provider);
    this.dateUtils = new DateUtils();
    this.timeSlotValidator = new TimeSlotValidator(this.dateUtils);
    this.availabilityProcessor = new AvailabilityProcessor(this.dateUtils);
    this.validateNoTimeSlotOverlap = this.timeSlotValidator.validateNoTimeSlotOverlap.bind(this.timeSlotValidator);

  }

  /**
   * Creates a new provider with associated user
   */
  async createProviderWithUser(
    providerData: Omit<Partial<IProvider>, 'userId'>,
    userData: Partial<IUser>
  ): Promise<{ provider: IProvider; user: IUser }> {
    // Validate time slots for each availability
    if (providerData.availability) {
      this.validateAvailabilityPatterns(providerData.availability);
    }

    const session = await this.startSession();
    
    try {
      await session.startTransaction();

      // Create user first
      const userService = new UserService();
      const user = await userService.createUser(userData, { session });

      // Create provider with user reference
      const provider = await this.create({
        ...providerData,
        userId: user._id
      }, { session });

      await session.commitTransaction();

      return {
        provider,
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role
        } as IUser
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Checks if a provider is available at a specific time
   * Now includes handling for overnight spans and specific dates
   * @throws ProviderNotFoundError if provider doesn't exist
   */
  async isProviderAvailable(
    providerId: string,
    startTime: Date,
    endTime: Date,
    locationId?: string
  ): Promise<boolean> {
    const provider = await this.findById(providerId);
    if (!provider) {
      throw new ProviderNotFoundError(providerId);
    }

    // Check if date is in exceptions
    if (this.isDateInExceptions(startTime, provider.exceptions, provider.timezone)) {
      return false;
    }

    // First check specific dates
    const specificAvailability = this.availabilityProcessor.getSpecificDateAvailability(
      provider.availability, 
      startTime
    );
    if (specificAvailability) {
      return this.isTimeInAvailableSlots(
        startTime,
        endTime,
        specificAvailability.timeSlots,
        locationId
      );
    }

    // If no specific date, check regular availability
    const dayOfWeek = dayjs(startTime).format('dddd') as DayOfWeek;
    const availability = this.availabilityProcessor.getDayAvailability(
      provider.availability, 
      dayOfWeek, 
      startTime
    );
    
    if (!availability) return false;

    return this.isTimeInAvailableSlots(
      startTime,
      endTime,
      availability.timeSlots,
      locationId
    );
  }

  /**
   * Gets all available time slots for a provider on a specific date
   * Now includes overnight spans and specific dates
   * @throws ProviderNotFoundError if provider doesn't exist
   */
  async getAvailableTimeSlots(
    providerId: string,
    date: Date,
    duration: number
  ): Promise<Array<{ startTime: Date; endTime: Date; locationId?: string }>> {
    const provider = await this.findById(providerId);
    if (!provider) {
      throw new ProviderNotFoundError(providerId);
    }

    if (this.isDateInExceptions(date, provider.exceptions, provider.timezone)) {
      return [];
    }

    // Check specific dates first
    const specificAvailability = this.availabilityProcessor.getSpecificDateAvailability(
      provider.availability, 
      date
    );
    if (specificAvailability) {
      return this.processTimeSlotsForDate(
        date,
        specificAvailability.timeSlots,
        duration,
        provider.minBreakBetweenAppointments
      );
    }

    // If no specific date, get regular availability
    const dayOfWeek = dayjs(date).format('dddd') as DayOfWeek;
    const availability = this.availabilityProcessor.getDayAvailability(
      provider.availability, 
      dayOfWeek, 
      date
    );
    
    if (!availability) return [];

    return this.processTimeSlotsForDate(
      date,
      availability.timeSlots,
      duration,
      provider.minBreakBetweenAppointments
    );
  }

  /**
   * Updates provider's availability patterns
   */
  async updateProviderAvailability(
    providerId: string,
    availability: IAvailability[]
  ): Promise<IProvider> {
    const provider = await this.findById(providerId);
    if (!provider) {
      throw new ProviderNotFoundError(providerId);
    }

    // Get existing appointments to validate against
    const appointmentService = new AppointmentEventService();
    const existingAppointments = await appointmentService.findByParticipant(providerId);
    
    // Validate update against existing appointments
    this.availabilityProcessor.validateAvailabilityUpdate(
      provider.availability,
      availability,
      existingAppointments
    );

    // Validate new availability patterns
    this.validateAvailabilityPatterns(availability);

    // Use the DatabaseService update method directly
    return await this.update(
      { _id: providerId }, 
      { $set: { availability } }
    ) as IProvider;
  }

  /**
   * Updates provider properties, with special handling for availability updates
   * @param providerId The ID of the provider to update
   * @param data The provider data to update
   * @returns Updated provider
   */
  async updateProvider(
    providerId: string,
    data: Partial<IProvider>
  ): Promise<IProvider> {
    const provider = await this.findById(providerId);
    if (!provider) {
      throw new ProviderNotFoundError(providerId);
    }

    // If availability is being updated, use the dedicated flow
    if (data.availability) {
      // Remove availability from the update data
      const { availability, ...otherUpdates } = data;
      
      // First update other properties if any
      if (Object.keys(otherUpdates).length > 0) {
        await this.update(
          { _id: providerId },
          { $set: otherUpdates }
        );
      }

      // Then update availability using the specialized method
      // This includes all availability validations and appointment checks
      return await this.updateProviderAvailability(providerId, availability);
    }

    // If no availability update, just update the other properties
    return await this.update(
      { _id: providerId },
      { $set: data }
    ) as IProvider;
  }

  /**
   * Deletes a provider and handles related cleanup
   * @param providerId The ID of the provider to delete
   * @param forceCancelAppointments If true, will cancel all future appointments
   * @throws ProviderNotFoundError if provider doesn't exist
   */
  async deleteProvider(providerId: string, forceCancelAppointments = false): Promise<void> {
    const provider = await this.findById(providerId);
    if (!provider) {
      throw new ProviderNotFoundError(providerId);
    }

    // Check for future appointments
    const appointmentService = new AppointmentEventService();
    const allAppointments = await appointmentService.findByParticipant(providerId);
    const futureAppointments = allAppointments.filter(
      appointment => appointment.startDateTime >= new Date()
    );

    if (futureAppointments.length > 0) {
      if (!forceCancelAppointments) {
        throw new Error('Cannot delete provider with future appointments');
      }

      // Cancel all future appointments
      await Promise.all(
        futureAppointments.map((appointment: IAppointmentEvent) =>
          appointmentService.cancelAppointment(
            appointment._id,
            'system',
            'Provider no longer available'
          )
        )
      );
    }

    // Delete the provider
    await this.delete({ _id: providerId });
  }

  // Private helper methods

  private validateAvailabilityPatterns(availability: IAvailability[]): void {
    for (const schedule of availability) {
      this.validateNoTimeSlotOverlap(schedule.timeSlots);

      // Validate conditions
      if (schedule.conditions) {
        this.validateConditions(schedule.conditions);
      }

      // Validate weeks if specified
      if (schedule.weeks && schedule.weeks.length > 0) {
        this.validateWeeks(schedule.weeks);
      }
    }
  }

  /**
   * Checks if a date falls within provider's exceptions
   * Compares dates in provider's timezone to handle business days correctly
   * @param date Date to check
   * @param exceptions Array of exception dates
   * @param providerTimezone Provider's timezone (defaults to system timezone)
   */
  private isDateInExceptions(
    date: Date, 
    exceptions: Date[], 
    providerTimezone?: string
  ): boolean {
    const utils = providerTimezone ? new DateUtils(providerTimezone) : this.dateUtils;
    const localDate = utils.normalizeDate(date);
    
    return exceptions.some(exception => 
      utils.normalizeDate(exception) === localDate
    );
  }

  /**
   * Checks if a given time range falls within available time slots
   * Handles complex overnight shifts including multi-day spans
   */
  private isTimeInAvailableSlots(
    startTime: Date,
    endTime: Date,
    timeSlots: ITimeSlot[],
    locationId?: string
  ): boolean {
    const startDayjs = dayjs(startTime);
    const endDayjs = dayjs(endTime);

    return timeSlots.some(slot => {
      if (locationId && slot.locationId && slot.locationId !== locationId) {
        return false;
      }

      let slotStart = dayjs(startTime)
        .set('hour', parseInt(slot.startTime.split(':')[0]))
        .set('minute', parseInt(slot.startTime.split(':')[1]));

      let slotEnd = dayjs(startTime)
        .set('hour', parseInt(slot.endTime.split(':')[0]))
        .set('minute', parseInt(slot.endTime.split(':')[1]));

      // Enhanced overnight shift handling
      if (slot.spansOvernight && slotEnd.isBefore(slotStart)) {
        const daysToAdd = Math.max(1, Math.abs(slotEnd.diff(slotStart, 'day')));
        slotEnd = slotEnd.add(daysToAdd, 'day');
      }

      if (slot.requiresTravelTime && slot.travelBuffer) {
        slotStart = slotStart.add(slot.travelBuffer, 'minute');
        slotEnd = slotEnd.subtract(slot.travelBuffer, 'minute');
      }

      return startDayjs.isSameOrAfter(slotStart) && 
             endDayjs.isSameOrBefore(slotEnd);
    });
  }

  /**
   * Processes time slots for a specific date, handling multi-day overnight shifts
   * Ensures consistent breaks between appointments
   */
  private processTimeSlotsForDate(
    date: Date,
    timeSlots: ITimeSlot[],
    duration: number,
    minBreak: number = 0
  ): Array<{ startTime: Date; endTime: Date; locationId?: string }> {
    const availableSlots: Array<{ startTime: Date; endTime: Date; locationId?: string }> = [];

    timeSlots.forEach(slot => {
      let currentStart = dayjs(date)
        .set('hour', parseInt(slot.startTime.split(':')[0]))
        .set('minute', parseInt(slot.startTime.split(':')[1]));

      const slotEnd = dayjs(date)
        .set('hour', parseInt(slot.endTime.split(':')[0]))
        .set('minute', parseInt(slot.endTime.split(':')[1]))
        .add(slot.spansOvernight ? 1 : 0, 'day');

      // Apply travel buffer at slot boundaries if needed
      if (slot.requiresTravelTime && slot.travelBuffer) {
        currentStart = currentStart.add(slot.travelBuffer, 'minute');
        slotEnd.subtract(slot.travelBuffer, 'minute');
      }

      // Calculate total time needed for each appointment including break
      const totalSlotTime = duration + minBreak;

      while (currentStart.add(duration, 'minute').isSameOrBefore(slotEnd)) {
        const appointmentStart = currentStart.toDate();
        const appointmentEnd = currentStart.add(duration, 'minute').toDate();

        availableSlots.push({
          startTime: appointmentStart,
          endTime: appointmentEnd,
          locationId: slot.locationId
        });

        // Move to next slot start, including break
        currentStart = dayjs(appointmentEnd).add(minBreak, 'minute');
      }
    });

    return availableSlots;
  }

  /**
   * Validates availability conditions for a provider
   * Currently a placeholder for future condition validations
   * @param conditions Array of condition objects to validate
   * @todo Implement specific condition validations based on business rules
   */
  private validateConditions(conditions: IAvailability['conditions']): void {
    if (!conditions) return;
    // Add any specific condition validations here
  }

  /**
   * Validates week numbers in bi-weekly or specific week patterns
   * Ensures all week numbers are within valid range (1-53)
   * @param weeks Array of week numbers to validate
   * @throws Error if any week number is outside valid range
   */
  private validateWeeks(weeks: number[]): void {
    if (weeks.some(week => week < 1 || week > 53)) {
      throw new Error('Week numbers must be between 1 and 53');
    }
  }
} 