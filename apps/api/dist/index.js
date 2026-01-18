"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};

Object.defineProperty(exports, "__esModule", { value: true });

const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));

import { connectDB } from "./db";
import { capsuleRoutes } from "./routes/capsules";

const app = (0, fastify_1.default)({ logger: true });

async function start() {
  await (0, connectDB)(process.env.MONGO_URL);

  await app.register(cors_1.default, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);

      if (origin === "http://localhost:5173") return cb(null, true);
      if (origin === "https://capsule.app") return cb(null, true);
      if (origin === "https://www.capsule.app") return cb(null, true);
      if (origin.startsWith("chrome-extension://")) return cb(null, true);

      cb(new Error("Not allowed by CORS"), false);
    },
    methods: ["GET", "POST", "OPTIONS", "DELETE"]
  });

  app.register(capsuleRoutes);

  await app.listen({
    port: Number(process.env.PORT) || 3000,
    host: "0.0.0.0"
  });
}

start();
