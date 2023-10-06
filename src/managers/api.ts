import express, { Express, RequestHandler } from "express";
import { Server } from "http";
import { AddressInfo } from "net";
import cors, { CorsOptions } from "cors";

export enum HTTPMethod {
  ALL,
  GET,
  POST,
  PATCH,
  PUT,
  DELETE,
}
export type ExpressMiddleware = {
  method: HTTPMethod;
  uri: string;
  middelware: RequestHandler;
};

export class ApiManager {
  protected app: Express;
  protected cors_middleware: any;
  protected server: Server | undefined = undefined;

  public constructor();
  public constructor(args: { cors_config: CorsOptions });
  public constructor(args: {
    cors_config: CorsOptions;
    middlewares: Array<ExpressMiddleware>;
  });
  public constructor(
    args: {
      cors_config?: CorsOptions;
      middlewares?: Array<ExpressMiddleware>;
    } = {},
  ) {
    const { cors_config, middlewares } = args;

    this.app = express();
    this.cors_middleware = cors(cors_config || {});

    this.addMiddlewares(middlewares || []);
    this.app.use(express.json());
  }

  public addMiddlewares(middlewares: Array<ExpressMiddleware>) {
    middlewares.forEach((e) => {
      switch (e.method) {
        case HTTPMethod.ALL:
          this.app.use(e.uri, this.cors_middleware, e.middelware);
          break;
        case HTTPMethod.GET:
          this.app.get(e.uri, this.cors_middleware, e.middelware);
          break;
        case HTTPMethod.DELETE:
          this.app.delete(e.uri, this.cors_middleware, e.middelware);
          break;
        case HTTPMethod.PATCH:
          this.app.patch(e.uri, this.cors_middleware, e.middelware);
          break;
        case HTTPMethod.POST:
          this.app.post(e.uri, this.cors_middleware, e.middelware);
          break;
        case HTTPMethod.PUT:
          this.app.put(e.uri, this.cors_middleware, e.middelware);
          break;
        default:
          break;
      }
    });
  }

  public run(port: number | string) {
    this.server = this.app.listen(port, () => {
      if (this.server) {
        const server_info = this.server.address() as AddressInfo;

        const host = server_info.address;
        const port = server_info.port;

        console.log("App listening at http://%s:%s", host, port);
      }
    });
  }
}
