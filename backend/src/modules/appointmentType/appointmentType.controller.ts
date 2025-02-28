import { Request, Response } from 'express';
import { AppointmentTypeService } from './appointmentType.services';

export class AppointmentTypeController {
  private appointmentTypeService: AppointmentTypeService;

  constructor() {
    this.appointmentTypeService = new AppointmentTypeService();
  }

  createAppointmentType = async (req: Request, res: Response): Promise<void> => {
    try {
      const appointmentType = await this.appointmentTypeService.createAppointmentType(req.body);
      res.status(201).json({
        success: true,
        data: appointmentType
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({ 
          success: false,
          error: 'Duplicate appointment type name',
          details: error.message
        });
        return;
      }
      res.status(500).json({ 
        success: false,
        error: 'Failed to create appointment type',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getAppointmentTypeById = async (req: Request, res: Response): Promise<void> => {
    try {
      const appointmentType = await this.appointmentTypeService.getAppointmentTypeById(req.params.id);
      if (!appointmentType) {
        res.status(404).json({ 
          success: false,
          error: 'Appointment type not found'
        });
        return;
      }
      res.json({
        success: true,
        data: appointmentType
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: 'Failed to get appointment type',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getAllAppointmentTypes = async (req: Request, res: Response): Promise<void> => {
    try {
      const filter = req.query;
      const appointmentTypes = await this.appointmentTypeService.getAllAppointmentTypes(filter);
      res.json({
        success: true,
        data: appointmentTypes
      });
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        res.status(400).json({ 
          success: false,
          error: 'Invalid filter',
          details: error.message
        });
        return;
      }
      res.status(500).json({ 
        success: false,
        error: 'Failed to get appointment types',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  updateAppointmentType = async (req: Request, res: Response): Promise<void> => {
    try {
      const appointmentType = await this.appointmentTypeService.updateAppointmentType(
        req.params.id,
        req.body
      );
      if (!appointmentType) {
        res.status(404).json({ 
          success: false,
          error: 'Appointment type not found'
        });
        return;
      }
      res.json({
        success: true,
        data: appointmentType
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({ 
          success: false,
          error: 'Duplicate appointment type name',
          details: error.message
        });
        return;
      }
      res.status(500).json({ 
        success: false,
        error: 'Failed to update appointment type',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  deleteAppointmentType = async (req: Request, res: Response): Promise<void> => {
    try {
      const appointmentType = await this.appointmentTypeService.deleteAppointmentType(req.params.id);
      if (!appointmentType) {
        res.status(404).json({ 
          success: false,
          error: 'Appointment type not found'
        });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: 'Failed to delete appointment type',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  cleanupAppointmentTypes = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.appointmentTypeService.deleteAll();
      res.status(200).json({
        success: true,
        message: 'All appointment types deleted successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('production')) {
        res.status(403).json({ 
          success: false,
          error: 'Operation not allowed',
          details: error.message
        });
        return;
      }
      res.status(500).json({ 
        success: false,
        error: 'Failed to cleanup appointment types LOL',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
} 