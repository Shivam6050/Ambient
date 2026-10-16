import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'node:dns/promises';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.log('Temporary memory mode: MONGODB_URI is not configured. Data resets on API restart.');
} else {
  try {
    const parsed = new URL(uri);
    if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)) throw new Error('InvalidProtocol');
    if (parsed.protocol === 'mongodb+srv:') {
      const records = await dns.resolveSrv('_mongodb._tcp.' + parsed.hostname);
      console.log('DNS SRV: OK (' + records.length + ' endpoints)');
    }
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 5000 });
    await mongoose.connection.db.admin().ping();
    console.log('Database connection and ping: OK. Write permissions have not been tested.');
  } catch (error) {
    const causes = [...(error.reason?.servers?.values() || [])].map(s => s.error?.cause?.code).filter(Boolean);
    console.error('Database check failed:', error.name);
    if (causes.some(code => code.startsWith('ERR_SSL') || code.startsWith('ERR_TLS'))) {
      console.error('TLS handshake rejected. Check Atlas Network Access for your current IP, cluster availability, and VPN/firewall TLS interference.');
    } else if (error.code === 18) {
      console.error('Authentication rejected. Check the database user and URI credentials.');
    } else {
      console.error('Check the URI, DNS, Atlas IP access list, and outbound network connectivity.');
    }
    console.error('No application records were changed. Connection strings and credentials are intentionally omitted.');
    process.exitCode = 1;
  } finally { await mongoose.disconnect(); }
}
