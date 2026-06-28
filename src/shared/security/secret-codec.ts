export interface SecretCodec {
  encrypt(value: string): string;
  decrypt(value: string): string;
}
