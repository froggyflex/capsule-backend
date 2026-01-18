import Fastify from "fastify";
import cors from "@fastify/cors";
import { connectDB } from "./db";
import { capsuleRoutes } from "./routes/capsules";

const app = Fastify({ logger: true });

async function start() {
   await connectDB(process.env.MONGO_URL);

  // ✅ CORS — explicit and controlled
  await app.register(cors, {
    origin: (origin, cb) => {
      // allow server-to-server / curl / Postman
      if (!origin) return cb(null, true);

      // allow web app
      if (origin === "http://localhost:5173") {
        return cb(null, true);
      }

      // allow chrome extensions
      if (origin.startsWith("chrome-extension://")) {
        return cb(null, true);
      }

      // block everything else
      cb(new Error("Not allowed by CORS"), false);
    },
    methods: ["GET", "POST", "OPTIONS", "DELETE"]
  });


  app.register(capsuleRoutes);

  await app.listen({ port: 3000 });
}

start();
