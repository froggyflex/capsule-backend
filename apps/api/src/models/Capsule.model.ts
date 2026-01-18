import mongoose, { Schema } from "mongoose";
import type { Capsule } from "@capsule/contract";

const CapsuleSchema = new Schema<Capsule>(
  {
    payload: {
      kind: {
        type: String,
        enum: ["url", "text", "file"],
        required: true,
      },
      value: {
        type: Schema.Types.Mixed,
        required: true,
      },
      meta: {
        title: String,
        description: String,
        previewImage: String,
      },
    },

    createdAt: {
      type: Number,
      required: true,
    },

    updatedAt: {
      type: Number,
      required: true,
    },

    source: {
      deviceId: {
        type: String,
        required: true,
      },
      client: {
        type: String,
        enum: ["web", "extension", "mobile"],
        required: true,
      },
    },

    version: {
      type: Number,
      required: true,
    },
  },
  {
    versionKey: false,
  }
);

CapsuleSchema.index(
  {
    "payload.kind": 1,
    "payload.value": 1,
    "source.client": 1,
    createdAt: -1
  }
);


export const CapsuleModel =
  mongoose.models.Capsule ||
  mongoose.model<Capsule>("Capsule", CapsuleSchema);
