import Fastify from "fastify";
import cors from "@fastify/cors";
import { connectDB } from "./db";
import { capsuleRoutes } from "./routes/capsules";
import { MONGO_URL } from "./config";

const app = Fastify({ logger: true });
const port = Number(process.env.PORT) || 3000;

async function start() {
   await connectDB(MONGO_URL);

  // ✅ CORS — explicit and controlled
 await app.register(cors, {
  origin: (origin, cb) => {
    // allow server-to-server, curl, Postman
    if (!origin) return cb(null, true);

    // local dev
    if (origin === "http://localhost:5173") {
      return cb(null, true);
    }

    // Vercel frontend (ADD THIS)
    if (origin === "https://capsule-frontend-seven.vercel.app") {
      return cb(null, true);
    }

    // custom domain (future-proof)
    if (origin === "https://capsule.app") {
      return cb(null, true);
    }

    // chrome extension
    if (origin.startsWith("chrome-extension://")) {
      return cb(null, true);
    }

    // block everything else
    cb(new Error("Not allowed by CORS"), false);
  },
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
});


  app.register(capsuleRoutes);

  await app.listen({ port, host: "0.0.0.0" });
}

start();



