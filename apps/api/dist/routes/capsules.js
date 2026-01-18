"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capsuleRoutes = capsuleRoutes;
const zod_1 = require("zod");
const Capsule_model_1 = require("../models/Capsule.model");
const fetchUrlMetadata_1 = require("../utils/fetchUrlMetadata");
const createCapsuleSchema = zod_1.z.object({
    payload: zod_1.z.object({
        kind: zod_1.z.enum(["url", "text", "file"]),
        value: zod_1.z.any(),
        meta: zod_1.z
            .object({
            title: zod_1.z.string().optional(),
            description: zod_1.z.string().optional(),
            previewImage: zod_1.z.string().optional(),
        })
            .optional(),
    }),
    source: zod_1.z.object({
        deviceId: zod_1.z.string(),
        client: zod_1.z.enum(["web", "extension", "mobile"]),
    }),
});
async function capsuleRoutes(app) {
    app.post("/capsules", async (request, reply) => {
        const parsed = createCapsuleSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send(parsed.error);
        }
        const now = Date.now();
        const DUPLICATE_WINDOW_MS = 60_000; // 60 seconds
        let meta = parsed.data.payload.meta ?? {};
        // 1️⃣ Duplicate check FIRST
        if (parsed.data.payload.kind === "url") {
            const since = now - DUPLICATE_WINDOW_MS;
            const existing = await Capsule_model_1.CapsuleModel.findOne({
                "payload.kind": "url",
                "payload.value": parsed.data.payload.value,
                "source.client": parsed.data.source.client,
                createdAt: { $gte: since }
            });
            if (existing) {
                return reply.status(200).send(existing);
            }
            // 2️⃣ Only now fetch metadata
            const fetched = await (0, fetchUrlMetadata_1.fetchUrlMetadata)(parsed.data.payload.value);
            meta = {
                ...fetched,
                ...meta // user-provided meta wins
            };
        }
        // 3️⃣ Create capsule
        const capsule = await Capsule_model_1.CapsuleModel.create({
            ...parsed.data,
            payload: {
                ...parsed.data.payload,
                meta
            },
            createdAt: now,
            updatedAt: now,
            version: 1
        });
        return capsule;
    });
    app.get("/capsules", async (request) => {
        const { since } = request.query;
        const query = since
            ? { createdAt: { $gt: Number(since) } }
            : {};
        return Capsule_model_1.CapsuleModel.find(query).sort({ createdAt: -1 }).limit(100);
    });
    app.delete("/capsules/:id", async (request, reply) => {
        const { id } = request.params;
        if (!id) {
            return reply.status(400).send({ error: "Capsule id is required" });
        }
        const deleted = await Capsule_model_1.CapsuleModel.findByIdAndDelete(id);
        if (!deleted) {
            return reply.status(404).send({ error: "Capsule not found" });
        }
        return reply.status(204).send();
    });
}
