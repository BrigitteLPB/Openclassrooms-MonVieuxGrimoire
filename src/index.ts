
import express, { Express, Request, Response } from 'express';
import { AddressInfo } from 'net';
const cors = require('cors');

const app: Express = express();

const cors_config = {
	origin: process.env.CORS_ORIGINS?.split(','),
	optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}


app.use(express.json());


app.use('/*', cors(cors_config), (req: Request, res: Response) => {
	console.log(req.header("Origin"));

	console.log(req.body);
	res.end(JSON.stringify(req.body));
})

const server = app.listen(process.env.API_PORT, () => {
	const server_info = (server.address() as AddressInfo);

	const host = server_info.address;
	const port = server_info.port;
	
	console.log("Example app listening at http://%s:%s", host, port)
})
