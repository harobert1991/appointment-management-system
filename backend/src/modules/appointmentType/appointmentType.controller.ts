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
      res.status(201).json(appointmentType);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create appointment type' });
    }
  };

  getAppointmentTypeById = async (req: Request, res: Response): Promise<void> => {
    try {
      const appointmentType = await this.appointmentTypeService.getAppointmentTypeById(req.params.id);
      if (!appointmentType) {
        res.status(404).json({ error: 'Appointment type not found' });
        return;
      }
      res.json(appointmentType);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get appointment type' });
    }
  };

  getAllAppointmentTypes = async (req: Request, res: Response): Promise<void> => {
    try {
      const filter = req.query;
      const appointmentTypes = await this.appointmentTypeService.getAllAppointmentTypes(filter);
      res.json(appointmentTypes);
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to get appointment types' });
    }
  };

  updateAppointmentType = async (req: Request, res: Response): Promise<void> => {
    try {
      const appointmentType = await this.appointmentTypeService.updateAppointmentType(
        req.params.id,
        req.body
      );
      if (!appointmentType) {
        res.status(404).json({ error: 'Appointment type not found' });
        return;
      }
      res.json(appointmentType);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update appointment type' });
    }
  };

  deleteAppointmentType = async (req: Request, res: Response): Promise<void> => {
    try {
      const appointmentType = await this.appointmentTypeService.deleteAppointmentType(req.params.id);
      if (!appointmentType) {
        res.status(404).json({ error: 'Appointment type not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete appointment type' });
    }
  };
} 