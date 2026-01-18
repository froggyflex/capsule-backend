export type CapsuleKind = "url" | "text" | "file";
export type ClientType = "web" | "extension" | "mobile";
export type CapsuleMeta = {
    title?: string;
    description?: string;
    previewImage?: string;
};
export type FileRef = {
    storageKey: string;
    filename: string;
    mime: string;
    size: number;
};
export type CapsulePayload = {
    kind: "url";
    value: string;
    meta?: CapsuleMeta;
} | {
    kind: "text";
    value: string;
    meta?: CapsuleMeta;
} | {
    kind: "file";
    value: FileRef;
    meta?: CapsuleMeta;
};
export type Capsule = {
    _id: string;
    payload: CapsulePayload;
    createdAt: number;
    updatedAt: number;
    source: {
        deviceId: string;
        client: ClientType;
    };
    version: number;
};
