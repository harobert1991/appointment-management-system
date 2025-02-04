import { DatabaseService } from '../../rootModules/database/database.services';
import { Event, IEvent } from './event.schema';

export class EventService extends DatabaseService<IEvent> {
  constructor() {
    super(Event);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<IEvent[]> {
    return this.find({
      startDate: { $gte: startDate },
      endDate: { $lte: endDate }
    });
  }

  async findByTitle(title: string): Promise<IEvent[]> {
    return this.find({
      title: { $regex: title, $options: 'i' }
    });
  }
} 