import { MongoMemoryServer } from 'mongodb-memory-server';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const dbPath = fileURLToPath(new URL('../.local-mongo/', import.meta.url));
await mkdir(dbPath, { recursive: true });
const mongo = await MongoMemoryServer.create({ binary: { version: '8.0.12' }, instance: { port: 27017, ip: '127.0.0.1', dbPath, storageEngine: 'wiredTiger' } });
console.log('Persistent local MongoDB ready at mongodb://127.0.0.1:27017/ambient');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await mongo.stop({ doCleanup: false }); process.exit(0); });
