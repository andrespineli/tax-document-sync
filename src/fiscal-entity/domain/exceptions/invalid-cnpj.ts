export class InvalidCnpj extends Error {
  constructor(value: string) {
    super(`Invalid CNPJ: ${value}`);
  }
}
