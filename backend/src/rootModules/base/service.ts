import { DatabaseService } from '../database/database.services';
import { Document, Model } from 'mongoose';

export class BaseService<T extends Document> extends DatabaseService<T> {
  constructor(protected model: Model<T>) {
    super(model);
  }

  async findById(id: string): Promise<T | null> {
    return super.findById(id);
  }

  async create(data: Partial<T>): Promise<T> {
    return super.create(data);
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    return super.update({ _id: id }, { $set: data });
  }

  async delete(id: string): Promise<T | null> {
    return super.delete({ _id: id });
  }

  async find(filter = {}): Promise<T[]> {
    return super.find(filter);
  }

  async findOne(filter = {}): Promise<T | null> {
    return super.findOne(filter);
  }
} 