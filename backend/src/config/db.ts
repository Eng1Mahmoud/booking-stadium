import mongoose from 'mongoose';

/**
 * Opens the one connection the app uses.
 *
 * No retry loop here: the driver already retries internally for the whole of
 * `serverSelectionTimeoutMS`, so a Mongo that is merely slow to come up (a
 * container still starting, say) needs no help from us. Still unreachable
 * after that window means it is down rather than slow, and exiting hands the
 * decision to whatever supervises the process — nodemon, Docker, systemd —
 * rather than sitting here in a broken state.
 */
export default async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(process.env.MONGO_URI!, { serverSelectionTimeoutMS: 15000 });
    // eslint-disable-next-line no-console
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error(
      '❌ MongoDB connection failed:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }

  // Past the initial handshake the driver reconnects on its own, so this is
  // only for visibility — a transient blip should not take the API down with it.
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected — the driver will keep retrying.');
  });
}
