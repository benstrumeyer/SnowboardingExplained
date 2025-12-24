const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/meshes?authSource=admin';

console.log('Testing MongoDB connection...');
console.log('Connection string:', mongoUri);

const client = new MongoClient(mongoUri, {
  maxPoolSize: 10,
  minPoolSize: 2,
});

(async () => {
  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db('meshes');
    const result = await db.admin().ping();
    console.log('✓ Ping successful:', result);
    
    const collections = await db.listCollections().toArray();
    console.log('✓ Collections:', collections.map(c => c.name));
    
    await client.close();
    console.log('✓ Connection closed');
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    process.exit(1);
  }
})();
