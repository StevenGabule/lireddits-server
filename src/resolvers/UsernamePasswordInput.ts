import { Field, InputType } from "type-graphql";


@InputType()
export class UsernamePasswordInput {
  @Field()
  username: string;

  @Field()
  email: string;

  @Field(() => String)
  password: string;
}
