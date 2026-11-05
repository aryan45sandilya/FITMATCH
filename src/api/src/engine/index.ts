import { config } from "../config.js";
import { DeterministicEngine } from "./deterministic.js";
import type { EngineInput, EngineResult, RecommendationEngine } from "./types.js";

export * from "./types.js";
export { DeterministicEngine, ENGINE_VERSION, feedbackOffset, recommendSync } from "./deterministic.js";

/**
 * Adapter for an external recommendation service (e.g. Python/FastAPI).
 * Contract: POST {RECOMMENDER_URL}/recommend with an EngineInput JSON body,
 * respond with an EngineResult JSON body. Any failure falls back to the
 * deterministic engine, so the product never depends on the remote service.
 */
export class RemoteEngine implements RecommendationEngine {
  readonly name = "remote";
  constructor(
    private readonly url: string,
    private readonly fallback: RecommendationEngine = new DeterministicEngine(),
  ) {}

  async recommend(input: EngineInput): Promise<EngineResult> {
    try {
      const res = await fetch(`${this.url.replace(/\/$/, "")}/recommend`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(2500),
      });
      if (!res.ok) throw new Error(`remote engine responded ${res.status}`);
      const body = (await res.json()) as EngineResult;
      if (!body || typeof body !== "object" || !("status" in body)) throw new Error("malformed remote response");
      return body;
    } catch (err) {
      console.warn("[engine] remote failed, using deterministic fallback:", (err as Error).message);
      return this.fallback.recommend(input);
    }
  }
}

let engine: RecommendationEngine | undefined;
export function getEngine(): RecommendationEngine {
  if (!engine) {
    engine =
      config.engine.mode === "remote" && config.engine.remoteUrl
        ? new RemoteEngine(config.engine.remoteUrl)
        : new DeterministicEngine();
  }
  return engine;
}
