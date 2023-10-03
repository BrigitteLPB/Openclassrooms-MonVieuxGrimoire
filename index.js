const express = require('express');
const cors = require('cors');

const app = express();

const cors_config = {
	origin: process.env.CORS_ORIGINS.split(','),
	optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}


app.use(express.json());


app.use('/*', cors(cors_config), (req, res) => {
	console.log(req.header("Origin"));

	console.log(req.body);
	res.end(JSON.stringify(req.body));
})

var server = app.listen(process.env.API_PORT, () => {
	var host = server.address().address
	var port = server.address().port
	console.log("Example app listening at http://%s:%s", host, port)
})
