// Run only by the migration role after prisma migrate deploy.
// Runtime role needs business DML, never access to migration bookkeeping.
import {database} from './db.js';
const db=database();
try {await db.$executeRawUnsafe('REVOKE ALL ON TABLE "_prisma_migrations" FROM taskflow_app');}
finally {await db.$disconnect();}
