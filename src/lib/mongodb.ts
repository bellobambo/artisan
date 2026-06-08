import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri) {
  throw new Error("MONGODB_URI is not configured");
}

if (!dbName) {
  throw new Error("MONGODB_DB is not configured");
}

const mongoUri = uri;
const mongoDbName = dbName;

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

export function getMongoClient() {
  if (!globalForMongo.mongoClientPromise) {
    const client = new MongoClient(mongoUri);
    globalForMongo.mongoClientPromise = client.connect();
  }

  return globalForMongo.mongoClientPromise;
}

export async function getMongoDb() {
  const client = await getMongoClient();
  return client.db(mongoDbName);
}
