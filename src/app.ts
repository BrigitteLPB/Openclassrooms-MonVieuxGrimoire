import { Request, Response } from "express";
import { ApiManager, HTTPMethod } from "managers/api";
import { MongoManager } from "managers/mongo";

// setup all managers
const mongo_manager = new MongoManager({
  host: process.env.MONGO_DB_HOST || "",
  username: process.env.MONGO_DB_USER || "",
  password: process.env.MONGO_DB_PASSWORD || "",
});

const api_manager = new ApiManager({
  cors_config: {
    origin: process.env.CORS_ORIGINS?.split(","),
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  },
  middlewares: [
    {
      method: HTTPMethod.GET,
      uri: "/*",
      middelware: (req: Request, res: Response) => {
        console.log(req.header("Origin"));

        console.log(req.body);
        res.end(JSON.stringify(req.body));
      },
    },
  ],
});

// Run the app
(async () => {
  await mongo_manager.connect();
  api_manager.run(process.env.API_PORT || 4000);
})();
