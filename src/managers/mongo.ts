import mongoose, { Mongoose } from "mongoose";
import { Url } from "url";

export class MongoManager {
  private host: string;
  private username: string;
  private password: string;

  protected _client: Mongoose | null = null;

  constructor(args: { host: string; username: string; password: string }) {
    const { host, username, password } = args;

    this.host = host;
    this.username = username;
    this.password = password;
  }

  public async connect() {
    try {
      this._client = await mongoose.connect(`mongodb://${this.host}`, {
        auth: {
          username: this.username,
          password: this.password,
        },
        authSource: "admin",
        readPreference: "primary",
        ssl: false,
        directConnection: true,
      });

      console.log(`Succesfully connected to MongoDB at ${this.host}`);
    } catch (err) {
      console.log("Failed connection to mongoDB", err);
    }
  }

  public client() {
    return this._client;
  }
}
