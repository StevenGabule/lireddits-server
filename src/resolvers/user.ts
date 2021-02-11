import { EntityManager } from '@mikro-orm/core';
import { Arg, Ctx, Field, InputType, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { MyContext } from "../types";
import { hash, verify } from "argon2";
import { User } from "../entities/User";
import { COOKIE_NAME } from '../constants';

@InputType()
class UsernamePasswordInput {
    @Field()
    username: string
    @Field(() => String)
    password: string
}

@ObjectType()
class FieldError {
    @Field()
    field: string;

    @Field()
    message: string;
}

@ObjectType()
class UserResponse {
    @Field(() => [FieldError], { nullable: true })
    errors?: FieldError[];

    @Field(() => User, { nullable: true })
    user?: User;
}

@Resolver()
export class UserResolver {

    @Query(() => User, { nullable: true })
    async me(@Ctx() { req, em }: MyContext) {
        // you aren't logged in
        if (!req.session.userId) {
            return null;
        }
        const user = await em.findOne(User, { id: req.session.userId });
        return user;
    }

    @Mutation(() => UserResponse)
    async register(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { em, req }: MyContext): Promise<UserResponse> {

        if (options.username.length <= 2) {
            return {
                errors: [{
                    field: 'username',
                    message: "length must be greater than 2"
                }]
            }
        }

        if (options.password.length <= 2) {
            return {
                errors: [{
                    field: 'password',
                    message: "length must be greater than 2"
                }]
            }
        }

        const hashedPassword = await hash(options.password);
        // const user = em.create(User, {
        //     username: options.username,
        //     password: hashedPassword
        // });
        let user;
        try {
            // await em.persistAndFlush(user);
            const result = await (em as EntityManager)
                .createQueryBuilder(User)
                .getKnexQuery()
                .insert({
                    username: options.username,
                    password: hashedPassword,
                    created_at: new Date(),
                    updated_at: new Date(),
                }).returning("*");
            user = result[0];
        } catch (e) {
            // check for username duplication
            // e.code === "23505"
            if (e.detail.includes('already exists')) {
                return {
                    errors: [{
                        field: 'username',
                        message: "username is already taken"
                    }]
                }
            }
            console.log("err:", e.message)
        }

        req.session.userId = user.id;

        return { user };
    }

    @Mutation(() => UserResponse)
    async login(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {
        const user = await em.findOne(User, { username: options.username });
        if (!user) {
            return {
                errors: [{
                    field: "username",
                    message: "The username or password didn't match our system"
                },],
            };
        }

        // @ts-ignore
        const validPassword = await verify(user.password, options.password);

        if (!validPassword) {
            return {
                errors: [{
                    field: "password",
                    message: "The username or password didn't match our system"
                },],
            };
        }

        req.session.userId = user.id;

        return { user };
    }

    @Mutation(() => Boolean)
    logout(@Ctx() { req, res }: MyContext) {
        return new Promise(resolved =>
            req.session.destroy((err: any) => {
                res.clearCookie(COOKIE_NAME);
                if (err) {
                    console.log();
                    resolved(false)
                    return;
                }
                resolved(true);
            })
        );
    }
}
