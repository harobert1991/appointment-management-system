import { Model, Document, FilterQuery, UpdateQuery, ClientSession } from 'mongoose';

export class DatabaseService<T extends Document> {
  constructor(private model: Model<T>) {}

  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOne(filter);
  }

  async find(filter: FilterQuery<T> = {}): Promise<T[]> {
    return this.model.find(filter);
  }

  /**
   * Starts a MongoDB session for transactions
   * @returns MongoDB session
   */
  async startSession(): Promise<ClientSession> {
    return await this.model.db.startSession();
  }

  /**
   * Creates a new document with optional session
   */
  async create(data: Partial<T>, options?: { session?: ClientSession }): Promise<T> {
    const docs = await this.model.create([data], options);
    return Array.isArray(docs) ? docs[0] : docs;
  }

  /**
   * Updates a document with optional session
   */
  async update(
    filter: FilterQuery<T>, 
    data: UpdateQuery<T>, 
    options?: { session?: ClientSession }
  ): Promise<T | null> {
    return this.model.findOneAndUpdate(filter, data, { new: true, ...options });
  }

  async delete(filter: FilterQuery<T>): Promise<T | null> {
    const doc = await this.model.findOneAndDelete(filter).lean();
    return doc as T | null;
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const count = await this.model.countDocuments(filter);
    return count > 0;
  }

  async findById(id: string): Promise<T | null> {
    return await this.model.findById(id);
  }

  /**
   * Deletes multiple documents matching the filter
   * Not available in production environment
   */
  async deleteMany(filter: FilterQuery<T>): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Bulk deletion is not available in production environment');
    }

    await this.model.deleteMany(filter);
  }
} 