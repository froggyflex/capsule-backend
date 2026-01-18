// apps/web/src/contracts/capsule.ts

export type CapsulePayload =
  | {
      kind: "text";
      value: string;
    }
  | {
      kind: "url";
      value: string;
      meta?: {
        title?: string;
        description?: string;
        previewImage?: string;
      };
    }
  | {
      kind: "file";
      value: {
        id: string;
        name: string;
        size: number;
      };
    };

export type CapsuleSource = {
  deviceId: string;
  client: "web" | "extension" | "mobile";
};

export type Capsule = {
  _id: string;
  payload: CapsulePayload;
  source: CapsuleSource;
  createdAt: number;
  updatedAt: number;
  version: number;
};
