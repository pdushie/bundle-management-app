import { neonClient } from './src/lib/db.ts';

(async () => {
  try {
    console.log('Checking for announcements table...');
    const tables = await neonClient`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'announcements'`;
    console.log('Announcements table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      console.log('Table found! Checking columns...');
      const columns = await neonClient`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'announcements'`;
      console.log('Table structure:');
      columns.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('Table does not exist. Need to create it.');
    }
  } catch (error) {
    console.error('Database error:', error.message);
  }
  process.exit(0);
})();