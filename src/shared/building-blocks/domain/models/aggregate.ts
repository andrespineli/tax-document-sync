import type { Entity } from "./entity";
import type { Creation } from "./creation";

export abstract class Aggregate implements Entity {
  private aggregateVersion: number;

  protected constructor(
    readonly id: { readonly value: string },
    readonly creation: Creation,
    version = 0,
  ) {
    this.aggregateVersion = version;
  }

  get version(): number {
    return this.aggregateVersion;
  }

  protected bump(): void {
    this.aggregateVersion += 1;
  }
}
