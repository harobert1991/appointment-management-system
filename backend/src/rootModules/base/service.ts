import { DatabaseService } from '../database/database.services';
import { Document, Model, FilterQuery, UpdateQuery, ClientSession } from 'mongoose';


export class BaseService<T extends Document> extends DatabaseService<T> {
  constructor(model: Model<T>) {
    super(model);
  }

  async findById(id: string): Promise<T | null> {
    return super.findById(id);
  }

  async create(data: Partial<T>): Promise<T> {
    return super.create(data);
  }

  async updateById(id: string, data: Partial<T>): Promise<T | null> {
    const filter: FilterQuery<T> = { _id: id };
    const update: UpdateQuery<T> = { $set: data };
    return super.update(filter, update);
  }

  async deleteById(id: string): Promise<T | null> {
    const filter: FilterQuery<T> = { _id: id };
    return super.delete(filter);
  }

  update(filter: FilterQuery<T>, data: UpdateQuery<T>, options?: { session?: ClientSession }): Promise<T | null> {
    return super.update(filter, data, options);
  }

  delete(filter: FilterQuery<T>): Promise<T | null> {
    return super.delete(filter);
  }

  async find(filter = {}): Promise<T[]> {
    return super.find(filter);
  }

  async findOne(filter = {}): Promise<T | null> {
    return super.findOne(filter);
  }
} 