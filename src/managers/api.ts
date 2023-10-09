import express, {
  Express,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import { Server } from "http";
import { AddressInfo } from "net";
import cors, { CorsOptions } from "cors";
import { Authorizer } from "utils/jwt";

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
  needAuth?: boolean;
  middelware: RequestHandler | Array<RequestHandler>;
};

export class ApiManager {
  protected app: Express;
  protected cors_middleware: any;
  protected server: Server | undefined = undefined;

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
      const middleware_funcs = [this.cors_middleware];
      if (e.needAuth) {
        middleware_funcs.push(Authorizer.VerifyAuthMiddleWare);
      }

      if (e.middelware instanceof Array) {
        middleware_funcs.push.apply(middleware_funcs, e.middelware);
      } else {
        middleware_funcs.push(e.middelware);
      }

      var func;
      switch (e.method) {
        case HTTPMethod.ALL:
          func = this.app.use(e.uri, ...middleware_funcs);
          break;
        case HTTPMethod.GET:
          func = this.app.get(e.uri, ...middleware_funcs);
          break;
        case HTTPMethod.DELETE:
          func = this.app.delete(e.uri, ...middleware_funcs);
          break;
        case HTTPMethod.PATCH:
          func = this.app.patch(e.uri, ...middleware_funcs);
          break;
        case HTTPMethod.POST:
          func = this.app.post(e.uri, ...middleware_funcs);
          break;
        case HTTPMethod.PUT:
          func = this.app.put;
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

        console.log("Example app listening at http://%s:%s", host, port);
      }
    });
  }
}
