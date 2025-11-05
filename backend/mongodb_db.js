const { MongoClient } = require('mongodb');

// MongoDB Cloud Atlas Connection String
// Replace with your actual connection string from MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority';

let mongoClient = null;
let db = null;

/**
 * Connect to MongoDB Cloud
 * Call this once when the server starts
 */
async function connectMongoDB() {
  try {
    if (mongoClient && mongoClient.topology && mongoClient.topology.isConnected()) {
      console.log('MongoDB already connected');
      return db;
    }

    console.log('Connecting to MongoDB Cloud...');
    mongoClient = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    await mongoClient.connect();
    
    // Get database name from URI or use default
    const dbName = process.env.MONGODB_DB_NAME || 'anime_hub_logs';
    db = mongoClient.db(dbName);
    
    console.log(`✓ Connected to MongoDB Cloud database: ${dbName}`);
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
}

/**
 * Get MongoDB database instance
 * @returns {Db} MongoDB database instance
 */
function getMongoDb() {
  if (!db) {
    throw new Error('MongoDB not connected. Call connectMongoDB() first.');
  }
  return db;
}

/**
 * Get a specific collection
 * @param {string} collectionName - Name of the collection
 * @returns {Collection} MongoDB collection
 */
function getCollection(collectionName) {
  return getMongoDb().collection(collectionName);
}

/**
 * Close MongoDB connection
 * Call this when shutting down the server
 */
async function closeMongoConnection() {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeMongoConnection();
  process.exit(0);
});

module.exports = {
  connectMongoDB,
  getMongoDb,
  getCollection,
  closeMongoConnection,
};
