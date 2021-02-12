import { Connection, EntityManager, IDatabaseDriver } from "@mikro-orm/core";
import { Request, Response } from "express";
import { Redis } from "ioredis";
import { Session } from "express-session";
export type MyContext = {
    em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>;
    req: Request & {
        session?: Session & { userId?: number }
    };
    redis: Redis;
    res: Response;
}
