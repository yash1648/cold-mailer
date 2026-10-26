import mongoose from "mongoose";

let connectionPromise = null;

const createConnection = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error("MONGODB_URI is not defined in environment variables");
    }

    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000,
        maxPoolSize: 5,
        retryWrites: true,
    });

    console.log("MongoDB Connected...");
};

/**
 * Reuses the connection across serverless invocations and prevents concurrent
 * cold starts from opening several pools. A failed attempt is not cached.
 */
const connectDB = async () => {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    // Reuse an in-flight connection (concurrent cold-start requests).
    if (mongoose.connection.readyState === 2 && connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = createConnection().catch(async (error) => {
        connectionPromise = null;
        console.error("Error connecting to MongoDB:", error.message);
        try {
            await mongoose.disconnect();
        } catch {
            // Ignore disconnect errors on a failed connection.
        }
        throw error;
    });

    return connectionPromise;
};

export default connectDB;
