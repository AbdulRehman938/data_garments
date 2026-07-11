import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

interface DataGarmentsDB extends DBSchema {
  cache: {
    key: string;
    value: {
      data: any;
      timestamp: number;
    };
  };
}

const DB_NAME = 'data-garments-db';
const DB_VERSION = 1;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let dbPromise: Promise<IDBPDatabase<DataGarmentsDB>> | null = null;

export const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB<DataGarmentsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('cache');
      },
    });
  }
  return dbPromise;
};

export const setCache = async (key: string, data: any) => {
  const db = await getDb();
  await db.put('cache', {
    data,
    timestamp: Date.now(),
  }, key);
};

export const getCache = async (key: string) => {
  const db = await getDb();
  const cached = await db.get('cache', key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

export const clearCache = async () => {
  const db = await getDb();
  await db.clear('cache');
};

export const deleteCache = async (key: string) => {
  const db = await getDb();
  await db.delete('cache', key);
};
