import { NextFunction, Request, Response } from 'express'
import { ApiManager, HTTPMethod } from 'utils/managers/api'
import { MongoManager } from 'utils/managers/mongo'
import { UserModel } from 'models/user'
import { Authorizer } from 'utils/jwt'
import { SignupMiddleware } from 'apps/auth/signup'
import { LoginMiddleware } from 'apps/auth/login'

// setup all managers
const mongo_manager = new MongoManager({
    host: process.env.MONGO_DB_HOST || '',
    username: process.env.MONGO_DB_USER || '',
    password: process.env.MONGO_DB_PASSWORD || '',
})

const api_manager = new ApiManager({
    baseUrl: '/api',
    corsConfig: {
        origin: process.env.CORS_ORIGINS?.split(','),
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    },
    middlewares: [
        SignupMiddleware,
        LoginMiddleware,
        {
            method: HTTPMethod.GET,
            uri: '/hello',
            needAuth: true,
            middelware: (req: Request, res: Response) => {
                console.log('hello endpoint') // DEBUG

                console.log('req.body:', req.body)
                res.end(JSON.stringify(req.body))
            },
        },
        {
            method: HTTPMethod.GET,
            uri: '/sign',
            middelware: [
                (req: Request, res: Response, next: NextFunction) => {
                    console.log('sign endpoint') // DEBUG
                    console.log('req.body:', req.body) // DEBUG
                    next()
                },
                Authorizer.GenerateAuthMiddleWare,
            ],
        },
        {
            method: HTTPMethod.GET,
            uri: '/*',
            middelware: (req: Request, res: Response) => {
                console.log('all endpoint') // DEBUG

                console.log(req.body)
                res.end(JSON.stringify(req.body))
            },
        },
    ],
})

// Run the app
;(async () => {
    await mongo_manager.connect()
    api_manager.run(process.env.API_PORT || 4000)

    // const my_user = new UserModel({
    //     email: "test@test.test",
    //     password: "uwu"
    // })
    // // my_user.save();

    const data = await UserModel.find({})
    console.log(data)
})()
