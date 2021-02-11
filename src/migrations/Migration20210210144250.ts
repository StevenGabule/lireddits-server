import { Migration } from '@mikro-orm/migrations';

export class Migration20210210144250 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "user" drop constraint "user_email_unique";');
    this.addSql('alter table "user" drop column "email";');
  }

}
