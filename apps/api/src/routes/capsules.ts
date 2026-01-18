import { FastifyInstance } from "fastify";
import { z } from "zod";
import { CapsuleModel } from "../models/Capsule.model";
import { fetchUrlMetadata } from "../utils/fetchUrlMetadata";

const createCapsuleSchema = z.object({
  payload: z.object({
    kind: z.enum(["url", "text", "file"]),
    value: z.any(),
    meta: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        previewImage: z.string().optional(),
      })
      .optional(),
  }),
  source: z.object({
    deviceId: z.string(),
    client: z.enum(["web", "extension", "mobile"]),
  }),
});

export async function capsuleRoutes(app: FastifyInstance) {

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

    const existing = await CapsuleModel.findOne({
      "payload.kind": "url",
      "payload.value": parsed.data.payload.value,
      "source.client": parsed.data.source.client,
      createdAt: { $gte: since }
    });

    if (existing) {
      return reply.status(200).send(existing);
    }

    // 2️⃣ Only now fetch metadata
    const fetched = await fetchUrlMetadata(parsed.data.payload.value);

    meta = {
      ...fetched,
      ...meta // user-provided meta wins
    };
  }

  // 3️⃣ Create capsule
  const capsule = await CapsuleModel.create({
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
    const { since } = request.query as { since?: string };

    const query = since
      ? { createdAt: { $gt: Number(since) } }
      : {};

    return CapsuleModel.find(query).sort({ createdAt: -1 }).limit(100);
  });


  app.delete("/capsules/:id", async (request, reply) => {
  const { id } = request.params as { id: string };

  if (!id) {
    return reply.status(400).send({ error: "Capsule id is required" });
  }

  const deleted = await CapsuleModel.findByIdAndDelete(id);

  if (!deleted) {
    return reply.status(404).send({ error: "Capsule not found" });
  }

  return reply.status(204).send();
});

}
