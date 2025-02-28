import { DatabaseService } from '../../rootModules/database/database.services';
import { AppointmentEvent, IAppointmentEvent, AppointmentStatus } from './appointmentEvent.schema';
import { FilterQuery } from 'mongoose';
import { logger } from '../../utils';

export class AppointmentEventService extends DatabaseService<IAppointmentEvent> {
  constructor() {
    super(AppointmentEvent);
  }

  /**
   * Create a new appointment with conflict checking and validation
   */
  async createAppointment(appointmentData: Partial<IAppointmentEvent>): Promise<IAppointmentEvent> {
    // Convert string dates to Date objects if needed
    if (typeof appointmentData.startDateTime === 'string') {
      appointmentData.startDateTime = new Date(appointmentData.startDateTime);
    }
    if (typeof appointmentData.endDateTime === 'string') {
      appointmentData.endDateTime = new Date(appointmentData.endDateTime);
    }
    // Validate required fields
    this.validateRequiredFields(appointmentData);

    // Validate organizationId is present
    if (!appointmentData.organizationId) {
      throw new Error('Organization ID is required');
    }

    // Check for scheduling conflicts
    await this.checkForConflicts(
      appointmentData.startDateTime!,
      appointmentData.endDateTime!,
      appointmentData.providerId,
      appointmentData.participants?.map(p => p.userId)
    );

    // Set initial status
    appointmentData.status = AppointmentStatus.SCHEDULED;

    // Create the appointment
    const appointment = await this.create(appointmentData);
    logger.info(`Created appointment with ID: ${appointment._id}`);
    return appointment;
  }

  /**
   * Validate required fields for appointment creation
   */
  private validateRequiredFields(data: Partial<IAppointmentEvent>): void {
    const requiredFields = ['startDateTime', 'endDateTime', 'participants', 'appointmentType'];
    const missingFields = requiredFields.filter(field => !data[field as keyof IAppointmentEvent]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate date range
    if (data.startDateTime && data.endDateTime) {
      if (data.startDateTime >= data.endDateTime) {
        throw new Error('End date must be after start date');
      }

      const minDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
      if (data.endDateTime.getTime() - data.startDateTime.getTime() < minDuration) {
        throw new Error('Appointment must be at least 15 minutes long');
      }
    }

    // Validate participants
    if (data.participants && data.participants.length === 0) {
      throw new Error('At least one participant is required');
    }
  }

  /**
   * Update an appointment with validation and conflict checking
   */
  async updateAppointment(
    id: string,
    updateData: Partial<IAppointmentEvent>
  ): Promise<IAppointmentEvent | null> {
    const existingAppointment = await this.findOne({ _id: id }) as IAppointmentEvent;
    if (!existingAppointment) {
      throw new Error('Appointment not found');
    }

    // Prevent changing organizationId after creation
    if (updateData.organizationId && 
        updateData.organizationId.toString() !== existingAppointment.organizationId.toString()) {
      throw new Error('Organization ID cannot be changed once set');
    }

    // Check if time is being updated
    if (updateData.startDateTime || updateData.endDateTime) {
      await this.checkForConflicts(
        updateData.startDateTime || existingAppointment.startDateTime,
        updateData.endDateTime || existingAppointment.endDateTime,
        updateData.providerId || existingAppointment.providerId,
        updateData.participants?.map(p => p.userId) || existingAppointment.participants.map(p => p.userId),
        id
      );
    }

    // Validate status transition
    if (updateData.status) {
      await this.validateStatusTransition(existingAppointment, updateData.status);
    }

    const updatedAppointment = await this.update({ _id: id }, updateData);
    logger.info(`Updated appointment with ID: ${id}`);
    return updatedAppointment;
  }

  /**
   * Cancel an appointment with reason
   */
  async cancelAppointment(
    id: string,
    reason: string,
    cancelledBy?: { userId: string; organizationId?: string }
  ): Promise<IAppointmentEvent | null> {
    const appointment = await this.findOne({ _id: id });
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Only validate organization if cancelledBy is provided with organizationId
    if (cancelledBy?.organizationId && 
        appointment.organizationId.toString() !== cancelledBy.organizationId.toString()) {
      throw new Error('Cannot modify appointments from different organizations');
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new Error('Appointment is already cancelled');
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new Error('Cannot cancel a completed appointment');
    }

    const updateData = {
      status: AppointmentStatus.CANCELLED,
      cancellationReason: {
        reason,
        cancelledBy: cancelledBy?.userId || 'system',
        cancelledAt: new Date()
      }
    };

    const cancelledAppointment = await this.update({ _id: id }, updateData);
    logger.info(`Cancelled appointment with ID: ${id}`);
    return cancelledAppointment;
  }

  /**
   * Find appointments by date range
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    filters: Record<string, unknown> = {}
  ): Promise<IAppointmentEvent[]> {
    const query: FilterQuery<IAppointmentEvent> = {
      startDateTime: { $gte: startDate },
      endDateTime: { $lte: endDate },
      ...(Object.keys(filters).length > 0 ? filters : {})
    };

    return this.find(query);
  }

  /**
   * Find appointments by participant
   */
  async findByParticipant(
    userId: string,
    status?: AppointmentStatus
  ): Promise<IAppointmentEvent[]> {
    const query: FilterQuery<IAppointmentEvent> = {
      'participants.userId': userId
    };

    if (status) {
      query.status = status;
    }

    return this.find(query);
  }

  /**
   * Private helper to check for scheduling conflicts
   * @returns true if no conflicts found, throws error if conflicts exist
   */
  private async checkForConflicts(
    startDateTime: Date,
    endDateTime: Date,
    providerId?: string,
    participantIds: string[] = [],
    excludeAppointmentId?: string
  ): Promise<boolean> {
    const query: FilterQuery<IAppointmentEvent> = {
      $or: [
        {
          startDateTime: { $lt: endDateTime },
          endDateTime: { $gt: startDateTime }
        }
      ],
      status: { $nin: [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED] }
    };

    // Exclude current appointment when updating
    if (excludeAppointmentId) {
      query._id = { $ne: excludeAppointmentId };
    }

    // Check provider conflicts
    if (providerId) {
      const providerConflicts = await this.find({
        ...query,
        providerId
      });

      if (providerConflicts.length > 0) {
        throw new Error('Provider has a scheduling conflict');
      }
    }

    // Check participant conflicts
    if (participantIds.length > 0) {
      const participantConflicts = await this.find({
        ...query,
        'participants.userId': { $in: participantIds }
      });
      if (participantConflicts.length > 0) {
        throw new Error('One or more participants have scheduling conflicts');
      }
    }

    return true; // Return true if no conflicts were found
  }

  /**
   * Private helper to validate status transitions
   */
  private async validateStatusTransition(
    appointment: IAppointmentEvent,
    newStatus: AppointmentStatus
  ): Promise<void> {
    const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
      [AppointmentStatus.SCHEDULED]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
      [AppointmentStatus.CONFIRMED]: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
      [AppointmentStatus.CANCELLED]: [],
      [AppointmentStatus.COMPLETED]: [],
      [AppointmentStatus.NO_SHOW]: []
    };

    if (!validTransitions[appointment.status]?.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${appointment.status} to ${newStatus}`
      );
    }
  }
} 