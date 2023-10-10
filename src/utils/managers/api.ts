import cors, { CorsOptions } from 'cors';
import express, { Express, RequestHandler } from 'express';
import { Server } from 'http';
import { AddressInfo } from 'net';
import { Authorizer } from 'utils/jwt';

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
    protected baseUrl: string | null;
    protected app: Express;
    protected corsMiddleware: any;
    protected server: Server | undefined = undefined;

    public constructor(
        args: {
            baseUrl?: string;
            corsConfig?: CorsOptions;
            middlewares?: Array<ExpressMiddleware>;
        } = {}
    ) {
        const { baseUrl, corsConfig, middlewares } = args;
        this.baseUrl = baseUrl || null;

        this.app = express();
        this.corsMiddleware = cors(corsConfig || {});

        this.addMiddlewares(middlewares || []);
    }

    public addMiddlewares(middlewares: Array<ExpressMiddleware>) {
        middlewares.forEach((e) => {
            // get all middlewares
            const middleware_funcs: Array<RequestHandler> = [
                express.json(),
                this.corsMiddleware,
            ];
            if (e.needAuth) {
                middleware_funcs.push(Authorizer.VerifyAuthMiddleWare);
            }

            if (e.middelware instanceof Array) {
                middleware_funcs.push.apply(middleware_funcs, e.middelware);
            } else {
                middleware_funcs.push(e.middelware);
            }

            // get function
            var func;
            switch (e.method) {
                case HTTPMethod.ALL:
                    func = this.app.use.bind(this.app);
                    break;
                case HTTPMethod.GET:
                    func = this.app.get.bind(this.app);
                    break;
                case HTTPMethod.DELETE:
                    func = this.app.delete.bind(this.app);
                    break;
                case HTTPMethod.PATCH:
                    func = this.app.patch.bind(this.app);
                    break;
                case HTTPMethod.POST:
                    func = this.app.post.bind(this.app);
                    break;
                case HTTPMethod.PUT:
                    func = this.app.put.bind(this.app);
                    break;
                default:
                    break;
            }

            // add middleware to express
            if (func) {
                console.log(
                    'baseUrl:',
                    this.baseUrl ? this.baseUrl + e.uri : e.uri
                ); // DEBUG
                func(
                    this.baseUrl ? this.baseUrl + e.uri : e.uri,
                    ...middleware_funcs
                );
            }
        });
    }

    public run(port: number | string) {
        this.server = this.app.listen(port, () => {
            if (this.server) {
                const server_info = this.server.address() as AddressInfo;

                const host = server_info.address;
                const port = server_info.port;

                console.log(
                    'Example app listening at http://%s:%s',
                    host,
                    port
                );
            }
        });
    }
}
