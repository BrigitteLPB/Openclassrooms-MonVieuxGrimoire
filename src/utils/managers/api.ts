import cors, { CorsOptions } from 'cors';
import express, { Express, RequestHandler } from 'express';
import { Server } from 'http';
import multer, { Multer } from 'multer';
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
    useImage?: boolean;
    middelware: RequestHandler | Array<RequestHandler>;
};

export class ApiManager {
    readonly baseUrl: string | null;
    readonly app: Express;
    readonly multerUploads: Multer;
    readonly corsMiddleware: any;
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

        // express
        this.app = express();

        // multer
        this.multerUploads = multer({
            storage: multer.memoryStorage(),
        });

        // cors
        this.corsMiddleware = cors(corsConfig || {});

        // all custom middlewares
        this.addMiddlewares(middlewares || []);
    }

    /**
     * Add all middlewares to express
     * @param middlewares
     */
    public addMiddlewares(middlewares: Array<ExpressMiddleware>) {
        middlewares.forEach((e) => {
            // get all middlewares
            const middleware_funcs: Array<RequestHandler> = [
                express.json(),
                this.corsMiddleware,
            ];

            // Image support with multer. Added before express.json
            if (e.useImage) {
                middleware_funcs.unshift(this.multerUploads.single('image'));
            }

            // JWT check
            if (e.needAuth) {
                middleware_funcs.push(Authorizer.VerifyAuthMiddleWare);
            }

            // all custom middlewares
            if (e.middelware instanceof Array) {
                middleware_funcs.push.apply(middleware_funcs, e.middelware);
            } else {
                middleware_funcs.push(e.middelware);
            }

            // add the last middleware for sending req.locals.body
            middleware_funcs.push((_, res) => {
                return res.json(res.locals.body || {});
            });

            // get express function
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

            // add the middleware to express
            if (func) {
                func(
                    this.baseUrl ? this.baseUrl + e.uri : e.uri,
                    ...middleware_funcs
                );
            }
        });
    }

    /**
     * start the express server
     * @param port
     */
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
