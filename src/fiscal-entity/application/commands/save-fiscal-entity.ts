export class SaveFiscalEntity {
  constructor(
    readonly id: string | undefined,
    readonly legalName: string,
    readonly cnpj: string,
    readonly uf: string,
    readonly certificateContentBase64: string | undefined,
    readonly certificatePassword: string | undefined,
  ) {}
}
