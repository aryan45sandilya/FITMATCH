import { BODY_MEASUREMENT_KEYS } from "./types.js";

/** Body keys plus garment-only keys, for validating admin garment/chart input. */
export const MEASUREMENT_KEYS_ALL = [...BODY_MEASUREMENT_KEYS, "body_length"] as const;
