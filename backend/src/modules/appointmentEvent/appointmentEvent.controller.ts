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
      // Check if organizationId is provided
      if (!req.body.organizationId) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: 'Organization ID is required'
        });
        return;
      }

      const appointment = await this.service.createAppointment(req.body);
      res.status(201).json({
        success: true,
        data: appointment
      });
    } catch (error) {
      logger.error('Failed to create appointment:', error);
      res.status(400).json({ 
        success: false,
        error: 'Failed to create appointment',
        details: error instanceof Error ? error.message : 'Unknown error'
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
        res.status(404).json({ 
          success: false,
          error: 'Appointment not found'
        });
        return;
      }

      res.json({
        success: true,
        data: appointment
      });
    } catch (error) {
      logger.error('Failed to update appointment:', error);
      res.status(400).json({ 
        success: false,
        error: 'Failed to update appointment',
        details: error instanceof Error ? error.message : 'Unknown error'
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
        res.status(404).json({ 
          success: false,
          error: 'Appointment not found'
        });
        return;
      }

      res.json({
        success: true,
        data: appointment
      });
    } catch (error) {
      logger.error('Failed to cancel appointment:', error);
      res.status(400).json({ 
        success: false,
        error: 'Failed to cancel appointment',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get appointments by date range
   */
  public getAppointmentsByDateRange = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, organizationId } = req.query;
      
      // Validate organizationId is provided
      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: 'Organization ID is required'
        });
        return;
      }
      
      const filters = req.query.filters ? JSON.parse(String(req.query.filters)) : {};
      
      // Always filter by organization ID
      filters.organizationId = organizationId;

      const appointments = await this.service.findByDateRange(
        new Date(String(startDate)),
        new Date(String(endDate)),
        filters
      );

      res.json({
        success: true,
        data: appointments
      });
    } catch (error) {
      logger.error('Failed to fetch appointments:', error);
      res.status(400).json({ 
        success: false,
        error: 'Failed to fetch appointments',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get appointments by participant
   */
  public getAppointmentsByParticipant = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { organizationId } = req.query;
      const status = req.query.status as AppointmentStatus | undefined;
      
      // Validate organizationId is provided
      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: 'Organization ID is required'
        });
        return;
      }

      // Find appointments by participant, additionally filtered by organizationId
      const appointments = await this.service.find({
        'participants.userId': userId,
        organizationId,
        ...(status ? { status } : {})
      });
      
      res.json({
        success: true,
        data: appointments
      });
    } catch (error) {
      logger.error('Failed to fetch participant appointments:', error);
      res.status(400).json({ 
        success: false,
        error: 'Failed to fetch appointments',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
} 