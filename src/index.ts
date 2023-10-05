
import { Request, Response } from 'express';
import { ApiManager, HTTPMethod } from 'utils/api_manager';

const api_manager = new ApiManager(
	{
		origin: process.env.CORS_ORIGINS?.split(','),
		optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
	},
	[
		{
			method: HTTPMethod.GET,
			uri: "/*",
			middelware: (req: Request, res: Response) => {
				console.log(req.header("Origin"));

				console.log(req.body);
				res.end(JSON.stringify(req.body));
			}
		}
	]
)

api_manager.run(process.env.API_PORT || 4000);
