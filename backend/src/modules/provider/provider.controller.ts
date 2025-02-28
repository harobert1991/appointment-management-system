import { Request, Response } from 'express';
import { ProviderService } from './provider.services';
import { ICreateProviderRequest, validateDateFormat } from './provider.schema';
import { AppointmentTypeService } from '../appointmentType/appointmentType.services';
import mongoose from 'mongoose';

export class ProviderController {
  private providerService: ProviderService;
  private appointmentTypeService: AppointmentTypeService;
  
  constructor(){
    this.providerService = new ProviderService();
    this.appointmentTypeService = new AppointmentTypeService();
  }

  /**
   * Creates a new provider and associated user
   * @route POST /providers
   */
  createProvider = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user: userData, organizationId, ...providerData } = req.body as ICreateProviderRequest;
      
      // Validate organizationId exists
      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: 'organizationId is required'
        });
        return;
      }

      // Optionally: check if organization exists
      try {
        const OrganizationModel = mongoose.model('Organization');
        const organization = await OrganizationModel.findById(organizationId);
        if (!organization) {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            details: 'Organization not found'
          });
          return;
        }
      } catch (error) {
        // Handle potential error with organization check
      }
      
      const result = await this.providerService.createProviderWithUser(
        { ...providerData, organizationId }, 
        userData
      );

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      // Handle validation errors
      if (error.message.includes('Invalid') || error.message.includes('required') || error.message.includes('exists')) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: error.message
        });
        return;
      }

      // Handle duplicate email or phone error from MongoDB
      if (error.code === 11000) {
        const duplicateField = error.keyPattern?.email ? 'email' : 
                             error.keyPattern?.phone ? 'phone' : null;
        if (duplicateField) {
          res.status(409).json({
            success: false,
            error: 'Duplicate Error',
            details: `${duplicateField} already exists`
          });
          return;
        }
      }

      // Handle other errors
      res.status(500).json({
        success: false,
        error: 'Failed to create provider',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Gets available time slots for a provider on specific dates
   * @route GET /providers/:providerId/available-slots
   */
  getAvailableTimeSlots = async (req: Request, res: Response): Promise<void> => {
    try {
      const { providerId } = req.params;
      const { dates, appointmentTypeId, locationId } = req.query;
      
      // Validate providerId
      if (!providerId) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: 'Provider ID is required'
        });
        return;
      }
      
      // Process dates (can be single string or array)
      let dateArray: Date[] = [];
      if (Array.isArray(dates)) {
        // Handle array of dates
        for (const date of dates) {
          if (typeof date !== 'string' || !validateDateFormat(date)) {
            res.status(400).json({
              success: false,
              error: 'Validation Error',
              details: 'All dates must be in YYYY-MM-DD format'
            });
            return;
          }
          dateArray.push(new Date(date));
        }
      } else if (typeof dates === 'string') {
        // Handle single date
        if (!validateDateFormat(dates)) {
          res.status(400).json({
            success: false,
            error: 'Validation Error',
            details: 'Valid date in YYYY-MM-DD format is required'
          });
          return;
        }
        dateArray.push(new Date(dates));
      } else {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: 'At least one date is required'
        });
        return;
      }
      
      // Get duration from appointment type
      if (!appointmentTypeId) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: 'AppointmentTypeId is required'
        });
        return;
      }
      
      const appointmentType = await this.appointmentTypeService.getAppointmentTypeById(
        appointmentTypeId as string
      );
      
      if (!appointmentType) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          details: 'Appointment type not found'
        });
        return;
      }
      
      const durationMinutes = appointmentType.duration;
      
      // Get available slots for all dates
      const allAvailableSlots = await Promise.all(
        dateArray.map(date => 
          this.providerService.getAvailableTimeSlots(
            providerId,
            date,
            durationMinutes
          )
        )
      );
      
      // Flatten and format slots for response
      const formattedSlots = allAvailableSlots.flat().map(slot => ({
        startTime: slot.startTime.toISOString(),
        // endTime: slot.endTime.toISOString(),
        date: new Date(slot.startTime).toISOString().split('T')[0],
        locationId: slot.locationId
      }));
      
      // Sort by date and time
      formattedSlots.sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      
      res.status(200).json({
        success: true,
        data: formattedSlots
      });
    } catch (error: any) {
      if (error.name === 'ProviderNotFoundError') {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          details: error.message
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to get available time slots',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Deletes all providers - development only
   * @route DELETE /providers/delete-all
   */
  deleteAllProviders = async (req: Request, res: Response): Promise<void> => {
    try {
      if (process.env.NODE_ENV === 'production') {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          details: 'This operation is not allowed in production environment'
        });
        return;
      }

      await this.providerService.deleteAll();
      
      res.status(200).json({
        success: true,
        message: 'All providers and associated users deleted successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete providers',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}
