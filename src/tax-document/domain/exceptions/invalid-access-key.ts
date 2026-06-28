export class InvalidAccessKey extends Error {
  constructor(value: string) {
    super(`Invalid NF-e access key: ${value}`);
  }
}
