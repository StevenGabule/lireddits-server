import "reflect-metadata";
import {MikroORM} from "@mikro-orm/core";
import microConfig from './mikro-orm.config';
import express from 'express';
import {ApolloServer} from "apollo-server-express";
import {buildSchema} from "type-graphql";
import {PostResolver} from "./resolvers/post";

const main = async () => {
    const orm = await MikroORM.init(microConfig);
    const app = express();

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [PostResolver],
            validate: false,
        }),
        context: () => ({em: orm.em})
    })

    apolloServer.applyMiddleware({app});

    app.listen(4000, () => {
        console.log('server load in localhost:4000');
    })
}

main().catch((err) => console.error(err));
