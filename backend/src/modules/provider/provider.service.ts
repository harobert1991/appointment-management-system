import { AvailabilityProcessor } from './utils/availabilityProcessor';
import { IAvailability, DayOfWeek } from './provider.schema';
import { AppointmentEventService } from '../appointmentEvent/appointmentEvent.services';
import { IAppointmentEvent } from '../appointmentEvent/appointmentEvent.schema';

export class ProviderService {
  private appointmentService: AppointmentEventService;

  constructor(
    private availabilityProcessor: AvailabilityProcessor
  ) {
    this.appointmentService = new AppointmentEventService();
  }

  async getAvailability(
    providerId: string,
    date: Date,
    duration: number
  ) {
    // Get provider's availability schedule
    const availability = await this.getProviderAvailability(providerId);
    
    // Get existing appointments
    const existingAppointments = await this.appointmentService.findByDateRange(
      date,
      date,
      { providerId }
    );

    // Get day availability
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dayAvailability = this.availabilityProcessor.getDayAvailability(
      availability,
      dayOfWeek as DayOfWeek,
      date
    );

    if (!dayAvailability) return null;

    // Process time slots
    return this.availabilityProcessor.processTimeSlotsForDate(
      date,
      dayAvailability.timeSlots,
      duration,
      0,
      undefined,
      existingAppointments
    );
  }

  async getSpecificDateAvailability(providerId: string, date: Date) {
    const availability = await this.getProviderAvailability(providerId);
    return this.availabilityProcessor.getSpecificDateAvailability(availability, date);
  }

  async updateAvailability(providerId: string, newAvailability: IAvailability[]) {
    const existingAppointments = await this.appointmentService.findByParticipant(providerId);
    
    // Validate update against existing appointments
    this.availabilityProcessor.validateAvailabilityUpdate(
      await this.getProviderAvailability(providerId),
      newAvailability,
      existingAppointments
    );

    // Update availability in database
    await this.updateProviderAvailability(providerId, newAvailability);
  }

  async getAvailableTimeSlots(
    providerId: string,
    date: Date,
    duration: number,
    locationId?: string
  ) {
    const availability = await this.getProviderAvailability(providerId);
    const existingAppointments = await this.appointmentService.findByDateRange(
      date,
      date,
      { providerId }
    );

    // Get specific date or regular availability
    const dayAvailability = this.availabilityProcessor.getSpecificDateAvailability(availability, date) ||
      this.availabilityProcessor.getDayAvailability(
        availability,
        date.toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek,
        date
      );

    if (!dayAvailability) return [];

    // Filter slots by location if specified
    const timeSlots = locationId
      ? dayAvailability.timeSlots.filter(slot => slot.locationId === locationId)
      : dayAvailability.timeSlots;

    return this.availabilityProcessor.processTimeSlotsForDate(
      date,
      timeSlots,
      duration,
      0,
      undefined,
      existingAppointments
    );
  }

  private async getProviderAvailability(providerId: string): Promise<IAvailability[]> {
    // TODO: Implement database access
    throw new Error('Not implemented');
  }

  private async updateProviderAvailability(providerId: string, availability: IAvailability[]): Promise<void> {
    // TODO: Implement database access
    throw new Error('Not implemented');
  }
} 