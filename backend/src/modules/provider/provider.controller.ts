import { Request, Response } from 'express';
import { ProviderService } from './provider.service';
import { DateUtils } from './utils/dateUtils';
import { AvailabilityProcessor } from './utils/availabilityProcessor';
import { logger } from '../../utils';

export class ProviderController {
  private service: ProviderService;
  private availabilityProcessor: AvailabilityProcessor;

  constructor() {
    const dateUtils = new DateUtils();
    this.availabilityProcessor = new AvailabilityProcessor(dateUtils);
    this.service = new ProviderService(this.availabilityProcessor);
  }

  /**
   * Get provider availability for a specific date and duration
   */
  getAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { providerId } = req.params;
      const { date, duration } = req.query;

      const availability = await this.service.getAvailability(
        providerId,
        new Date(date as string),
        Number(duration)
      );

      res.json(availability);
    } catch (error) {
      logger.error('Failed to get availability:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Failed to get availability' 
      });
    }
  };

  /**
   * Get provider availability for a specific date
   */
  getSpecificDateAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { providerId, date } = req.params;

      const availability = await this.service.getSpecificDateAvailability(
        providerId,
        new Date(date)
      );

      res.json(availability);
    } catch (error) {
      logger.error('Failed to get specific date availability:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Failed to get specific date availability' 
      });
    }
  };

  /**
   * Update provider availability
   */
  updateAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { providerId } = req.params;
      const { availability } = req.body;

      await this.service.updateAvailability(providerId, availability);

      res.json({ message: 'Availability updated successfully' });
    } catch (error) {
      logger.error('Failed to update availability:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Failed to update availability' 
      });
    }
  };

  /**
   * Get available time slots for a specific date, duration and location
   */
  getTimeSlots = async (req: Request, res: Response): Promise<void> => {
    try {
      const { providerId } = req.params;
      const { date, duration, locationId } = req.query;

      const slots = await this.service.getAvailableTimeSlots(
        providerId,
        new Date(date as string),
        Number(duration),
        locationId as string
      );

      res.json(slots);
    } catch (error) {
      logger.error('Failed to get time slots:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Failed to get time slots' 
      });
    }
  };
} 