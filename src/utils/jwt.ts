import jwt from "jsonwebtoken";
import { Response, Request, NextFunction } from "express";

export class Authorizer {
  private static private_key: string = process.env.JWT_PRIVATE_SIGN_KEY || "";

  protected static generateToken(id: object) {
    console.log("payload:", id);
    return jwt.sign(id || {}, Authorizer.private_key, {
      expiresIn: "24h",
    });
  }

  protected static verifyToken(token: string) {
    try {
      return jwt.verify(token, Authorizer.private_key);
    } catch (e) {
      return false;
    }
  }

  public static VerifyAuthMiddleWare(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const token = req.headers.authorization?.split(" ")[1] || "";
    const checked_token = Authorizer.verifyToken(token);
    if (!checked_token) {
      res.status(401);
      res.end();
    }

    console.log("checked_token:", checked_token);
    console.log("req.body:", req.body);

    res.locals.auth = checked_token;
    next();
  }

  public static GenerateAuthMiddleWare(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    res.send({
      token: Authorizer.generateToken(req.body || {}),
    });
    next();
  }
}
