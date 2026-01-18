import axios from "axios";
import type { Capsule } from "@capsule/contract";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}`,
});

export async function fetchCapsules(
  since?: number
): Promise<Capsule[]> {
  const res = await api.get<Capsule[]>("/capsules", {
    params: since ? { since } : undefined,
  });
  return res.data;
}
