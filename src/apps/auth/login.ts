import { UserModel } from 'models/user';
import { Hasher } from 'utils/hasher';
import { Authorizer } from 'utils/jwt';
import { ExpressMiddleware, HTTPMethod } from 'utils/managers/api';

export const LoginMiddleware: ExpressMiddleware = {
    method: HTTPMethod.POST,
    uri: '/auth/login',
    middelware: [
        async (req, res, next) => {
            const { email, password } = req.body;

            if (!email || !password) {
                res.status(400);
                return res.json({
                    error: 'bad values for email or password. Expects not null strings.',
                });
            }

            try {
                const user = await UserModel.findOne({ email: email });

                if (
                    user == null ||
                    !(await Hasher.validateHash(password, user.password))
                ) {
                    res.status(401);
                    return res.json({
                        error: 'can not connect with those credentials. Try again.',
                    });
                }

                res.locals.body = {
                    ...res.locals.body,
                    ...{
                        userId: user._id,
                    },
                };

                return next();
            } catch (e: any) {
                console.log('Error:', e);
                res.status(500);

                return res.json({
                    error: 'can not create the user',
                });
            }
        },
        Authorizer.GenerateAuthMiddleWare,
    ],
};
