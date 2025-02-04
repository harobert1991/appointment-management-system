import { EventService } from '../services/eventService';

export class EventController {
  private eventService: EventService;

  constructor() {
    this.eventService = new EventService();
  }

  async createEvent(req: Request, res: Response) {
    try {
      const event = await this.eventService.create(req.body);
      res.json(event);
    } catch (error) {
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
      res.status(500).json({ error: 'Failed to get event' });
    }
  }
} 