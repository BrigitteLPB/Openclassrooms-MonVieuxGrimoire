import { LoginMiddleware } from 'apps/auth/login';
import { SignupMiddleware } from 'apps/auth/signup';
import { CreateMiddleware } from 'apps/books/create';
import { DeleteMiddleware } from 'apps/books/delete';
import { ListMiddleware } from 'apps/books/list';
import { CreateRatingMiddleware } from 'apps/books/ratings/create_rating';
import { ListBestRatingRatingMiddleware } from 'apps/books/ratings/list_best_ratings';
import { RetrieveMiddleware } from 'apps/books/retrieve';
import { UpdateMiddleware } from 'apps/books/update';
import { ApiManager } from 'utils/managers/api';
import { mongoManager } from 'utils/managers/mongo';

// init express
const api_manager = new ApiManager({
    baseUrl: '/api',
    corsConfig: {
        origin: process.env.CORS_ORIGINS?.split(','),
        methods: ['GET', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    },

    // all custom middlewares
    middlewares: [
        SignupMiddleware,
        LoginMiddleware,
        CreateMiddleware,
        ListBestRatingRatingMiddleware,
        RetrieveMiddleware,
        DeleteMiddleware,
        UpdateMiddleware,
        CreateRatingMiddleware,
        ListMiddleware,
    ],
});

// Run the app
(async () => {
    await mongoManager.connect(process.env.MONGO_DB_NAME || '');
    api_manager.run(process.env.API_PORT || 4000);
})();
