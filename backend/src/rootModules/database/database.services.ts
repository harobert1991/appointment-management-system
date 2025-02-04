import { Model, Document, FilterQuery, UpdateQuery } from 'mongoose';

export class DatabaseService<T extends Document> {
  constructor(private model: Model<T>) {}

  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOne(filter);
  }

  async find(filter: FilterQuery<T> = {}): Promise<T[]> {
    return this.model.find(filter);
  }

  async create(data: Partial<T>): Promise<T> {
    return this.model.create(data);
  }

  async update(filter: FilterQuery<T>, data: UpdateQuery<T>): Promise<T | null> {
    return this.model.findOneAndUpdate(filter, data, { new: true });
  }

  async delete(filter: FilterQuery<T>): Promise<T | null> {
    const doc = await this.model.findOneAndDelete(filter).lean();
    return doc as T | null;
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const count = await this.model.countDocuments(filter);
    return count > 0;
  }
} 