import bcrypt from "bcrypt";

export class Hasher {
  public static async getHash(str: string) {
    return await bcrypt.hash(str, 10);
  }

  public static async validateHash(str: string, hash: string) {
    return await bcrypt.compare(str, hash);
  }
}
