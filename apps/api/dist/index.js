"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const db_1 = require("./db");
const capsules_1 = require("./routes/capsules");
const config_1 = require("./config");
const app = (0, fastify_1.default)({ logger: true });
const port = Number(process.env.PORT) || 3000;
async function start() {
    await (0, db_1.connectDB)(config_1.MONGO_URL);
    // ✅ CORS — explicit and controlled
    await app.register(cors_1.default, {
        origin: (origin, cb) => {
            // allow server-to-server, curl, Postman
            if (!origin)
                return cb(null, true);
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
    app.register(capsules_1.capsuleRoutes);
    await app.listen({ port, host: "0.0.0.0" });
}
start();
