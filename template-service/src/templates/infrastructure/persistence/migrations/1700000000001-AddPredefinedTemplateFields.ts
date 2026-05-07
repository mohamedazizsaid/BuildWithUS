import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPredefinedTemplateFields1700000000001 implements MigrationInterface {
  name = 'AddPredefinedTemplateFields1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "templates"
        ADD COLUMN IF NOT EXISTS "is_predefined_override" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "predefined_template_id" varchar(100) NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_templates_is_predefined_override"
        ON "templates" ("is_predefined_override")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_templates_is_predefined_override"`);
    await queryRunner.query(`
      ALTER TABLE "templates"
        DROP COLUMN IF EXISTS "predefined_template_id",
        DROP COLUMN IF EXISTS "is_predefined_override"
    `);
  }
}
