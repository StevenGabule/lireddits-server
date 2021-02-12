import { User } from './../entities/User';
import { FORGET_PASSWORRD_PREFIX } from './../constants';
import { validateRegister } from './../utils/validateRegister';
import { EntityManager } from '@mikro-orm/postgresql';
import { Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { MyContext } from "../types";
import { hash, verify } from "argon2";
import { COOKIE_NAME } from '../constants';
import { UsernamePasswordInput } from './UsernamePasswordInput';
import { v4 } from 'uuid';
import { sendEmail } from '../utils/sendEmail';

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


    @Mutation(() => UserResponse)
    async register(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { em, req }: MyContext): Promise<UserResponse> {

        const errors = validateRegister(options);
        if (errors) {
            return { errors };
        }

        const hashedPassword = await hash(options.password);

        let user;
        try {
            // await em.persistAndFlush(user);
            const result = await (em as EntityManager)
                .createQueryBuilder(User)
                .getKnexQuery()
                .insert({
                    username: options.username,
                    email: options.email,
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
        @Arg('usernameOrEmail') usernameOrEmail: string,
        @Arg('password') password: string,
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {
        const user = await em.findOne(User,
            usernameOrEmail.includes('@')
                ? { email: usernameOrEmail }
                : { username: usernameOrEmail });
        if (!user) {
            return {
                errors: [{
                    field: "usernameOrEmail",
                    message: "The username or password didn't match our system"
                },],
            };
        }

        // @ts-ignore
        const validPassword = await verify(user.password, password);

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

    @Query(() => User, { nullable: true })
    async me(@Ctx() { req, em }: MyContext) {
        // you aren't logged in
        if (!req.session.userId) {
            return null;
        }
        const user = await em.findOne(User, { id: req.session.userId });
        return user;
    }


    @Mutation(() => Boolean)
    async forgotPassword(@Arg("email") email: string, @Ctx() { em, redis }: MyContext) {
        const user = await em.findOne(User, { email });
        if (!user) {
            return true;
        }

        const token = v4();

        await redis.set(
            FORGET_PASSWORRD_PREFIX + token,
            user.id, 'ex', 1000 * 60 * 60 * 24 * 3);

        await sendEmail(
            email,
            `<a href="http://localhost:3000/change-password/${token}">Reset Password</a>`)

        return true;
    }

    @Mutation(() => UserResponse)
    async changePassword(
        @Arg("token") token: string,
        @Arg("newPassword") newPassword: string,
        @Ctx() { redis, em, req }: MyContext
    ): Promise<UserResponse> {
        if (newPassword.length <= 2) {
            return {
                errors: [
                    {
                        field: "newPassword",
                        message: "Length must be greater than 2"
                    }
                ]
            };
        }
        const key = FORGET_PASSWORRD_PREFIX + token;
        const userId = await redis.get(key);
        if (!userId) {
            return {
                errors: [
                    {
                        field: "token",
                        message: "Token expired",
                    }
                ]
            }
        }

        const user = await em.findOne(User, { id: parseInt(userId) });
        if (!user) {
            return {
                errors: [
                    {
                        field: "token",
                        message: "User no longer exists"
                    }
                ]
            }
        }

        user.password = await hash(newPassword);

        await em.persistAndFlush(user);

        await redis.del(key);

        req.session.userId = user.id;

        return { user };
    }
}
