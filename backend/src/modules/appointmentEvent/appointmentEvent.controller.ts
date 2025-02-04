import { Request, Response } from 'express';
import { AppointmentEventService } from './appointmentEvent.services';
import { logger } from '../../utils';
import { AppointmentStatus } from './appointmentEvent.schema';

export class AppointmentEventController {
  private service: AppointmentEventService;

  constructor() {
    this.service = new AppointmentEventService();
  }

  /**
   * Create a new appointment
   */
  public createAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
      const appointment = await this.service.createAppointment(req.body);
      res.status(201).json(appointment);
    } catch (error) {
      logger.error('Failed to create appointment:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Failed to create appointment' 
      });
    }
  };

  /**
   * Update an existing appointment
   */
  public updateAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const appointment = await this.service.updateAppointment(id, req.body);
      
      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      res.json(appointment);
    } catch (error) {
      logger.error('Failed to update appointment:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Failed to update appointment' 
      });
    }
  };

  /**
   * Cancel an appointment
   */
  public cancelAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { cancelledBy, reason } = req.body;

      const appointment = await this.service.cancelAppointment(id, cancelledBy, reason);
      
      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      res.json(appointment);
    } catch (error) {
      logger.error('Failed to cancel appointment:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Failed to cancel appointment' 
      });
    }
  };

  /**
   * Get appointments by date range
   */
  public getAppointmentsByDateRange = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;
      const filters = req.query.filters ? JSON.parse(String(req.query.filters)) : {};

      const appointments = await this.service.findByDateRange(
        new Date(String(startDate)),
        new Date(String(endDate)),
        filters
      );

      res.json(appointments);
    } catch (error) {
      logger.error('Failed to fetch appointments:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Failed to fetch appointments' 
      });
    }
  };

  /**
   * Get appointments by participant
   */
  public getAppointmentsByParticipant = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const status = req.query.status as AppointmentStatus | undefined;

      const appointments = await this.service.findByParticipant(userId, status);
      res.json(appointments);
    } catch (error) {
      logger.error('Failed to fetch participant appointments:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Failed to fetch appointments' 
      });
    }
  };
} 