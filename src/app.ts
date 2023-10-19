import { LoginMiddleware } from 'apps/auth/login';
import { SignupMiddleware } from 'apps/auth/signup';
import { CreateMiddleware } from 'apps/books/create';
import { DeleteMiddleware } from 'apps/books/delete';
import { RetrieveMiddleware } from 'apps/books/retrieve';
import { Request, Response } from 'express';
import { ApiManager, HTTPMethod } from 'utils/managers/api';
import { mongoManager } from 'utils/managers/mongo';

// init express
const api_manager = new ApiManager({
    baseUrl: '/api',
    corsConfig: {
        origin: process.env.CORS_ORIGINS?.split(','),
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    },

    // all custom middlewares
    middlewares: [
        SignupMiddleware,
        LoginMiddleware,
        CreateMiddleware,
        RetrieveMiddleware,
        DeleteMiddleware,
        {
            method: HTTPMethod.GET,
            uri: '/*',
            middelware: (req: Request, res: Response) => {
                console.log('all endpoint'); // DEBUG

                console.log(req.body);
                res.end(JSON.stringify(req.body));
            },
        },
    ],
});

// Run the app
(async () => {
    await mongoManager.connect(process.env.MONGO_DB_NAME || '');
    api_manager.run(process.env.API_PORT || 4000);
})();
