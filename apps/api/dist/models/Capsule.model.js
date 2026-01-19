"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapsuleModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CapsuleSchema = new mongoose_1.Schema({
    payload: {
        kind: {
            type: String,
            enum: ["url", "text", "file", "image"],
            required: true,
        },
        value: {
            type: mongoose_1.Schema.Types.Mixed,
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
}, {
    versionKey: false,
});
CapsuleSchema.index({
    "payload.kind": 1,
    "payload.value": 1,
    "source.client": 1,
    createdAt: -1
});
exports.CapsuleModel = mongoose_1.default.models.Capsule ||
    mongoose_1.default.model("Capsule", CapsuleSchema);
