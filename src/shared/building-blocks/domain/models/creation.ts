export class Creation {
  private constructor(readonly value: Date) {}

  static now(): Creation {
    return new Creation(new Date());
  }

  static fromDate(value: Date): Creation {
    return new Creation(value);
  }

  toISOString(): string {
    return this.value.toISOString();
  }
}
