"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capsuleRoutes = capsuleRoutes;
const zod_1 = require("zod");
const Capsule_model_1 = require("../models/Capsule.model");
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
        const capsule = await Capsule_model_1.CapsuleModel.create({
            ...parsed.data,
            createdAt: now,
            updatedAt: now,
            version: 1,
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
}
