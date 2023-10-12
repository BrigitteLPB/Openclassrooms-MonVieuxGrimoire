import { ExpressMiddleware, HTTPMethod } from 'utils/managers/api';

export const LoginMiddleware: ExpressMiddleware = {
    method: HTTPMethod.POST,
    uri: '/books',
    middelware: [
        async (req, res, next) => {
            const { email, password } = req.body;

            if (!email || !password) {
                res.statusCode = 400;
                return res.json({
                    error: 'bad values for email or password. Expects not null strings.',
                });
            }
        },
    ],
};
