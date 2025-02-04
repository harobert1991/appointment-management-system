import { DatabaseService } from './databaseService';
import { Event, IEvent } from '../models/event';

export class EventService extends DatabaseService<IEvent> {
  constructor() {
    super(Event);
  }

  // Add Event-specific methods here
  async findByTitle(title: string): Promise<IEvent | null> {
    return this.findOne({ title });
  }
} 