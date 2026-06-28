export class InvalidFederalUnit extends Error {
  constructor(value: string) {
    super(`Invalid federal unit: ${value}`);
  }
}
