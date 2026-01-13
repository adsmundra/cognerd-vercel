import { MongoClient, Db, Collection } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not set. Please add it to your .env.local file.');
}
const dbName = process.env.MONGODB_DB || 'welzin';
const collectionName = process.env.MONGODB_COLLECTION || 'files';

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

async function getClient(): Promise<MongoClient> {
  if (client && (client as any).topology && (client as any).topology.isConnected()) return client;
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect().then(c => {
      client = c;
      return c;
    });
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const c = await getClient();
  return c.db(dbName);
}

export async function getFilesCollection<T = any>(): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(collectionName);
}

export type VirtualFileName = 'llm.txt' | 'robots.txt' | 'schema.org' | 'faq.txt';

export function mapNameToField(name: VirtualFileName): keyof any {
  switch (name) {
    case 'llm.txt': return 'llm';
    case 'robots.txt': return 'robots';
    case 'schema.org': return 'schema';
    case 'faq.txt': return 'faq';
  }
}
