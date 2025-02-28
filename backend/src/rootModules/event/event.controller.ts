import { Request, Response } from 'express';
import { EventService } from './event.services';
import { logger } from '../../utils';

export class EventController {
  private eventService: EventService;

  constructor() {
    this.eventService = new EventService();
  }

  async createEvent(req: Request, res: Response) {
    try {
      const event = await this.eventService.create(req.body);
      res.status(201).json(event);
    } catch (error) {
      logger.error('Error creating event:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  }

  async getEvent(req: Request, res: Response) {
    try {
      const event = await this.eventService.findOne({ _id: req.params.id });
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      res.json(event);
    } catch (error) {
      logger.error('Error getting event:', error);
      res.status(500).json({ error: 'Failed to get event' });
    }
  }

  async updateEvent(req: Request, res: Response) {
    try {
      const event = await this.eventService.update(
        { _id: req.params.id },
        req.body
      );
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      res.json(event);
    } catch (error) {
      logger.error('Error updating event:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }

  async deleteEvent(req: Request, res: Response) {
    try {
      const event = await this.eventService.delete({ _id: req.params.id });
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      res.json({ message: 'Event deleted successfully' });
    } catch (error) {
      logger.error('Error deleting event:', error);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  }

  async listEvents(req: Request, res: Response) {
    try {
      const events = await this.eventService.find();
      res.json(events);
    } catch (error) {
      logger.error('Error listing events:', error);
      res.status(500).json({ error: 'Failed to list events' });
    }
  }
} 