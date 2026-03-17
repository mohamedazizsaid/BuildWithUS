import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE templates (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        subject VARCHAR(500),
        content TEXT NOT NULL,
        variables TEXT[] DEFAULT '{}',
        version INTEGER DEFAULT 0,

        -- Multi-channel support
        channel_contents JSONB DEFAULT NULL,
        variants JSONB DEFAULT '{}'::jsonb,
        channels JSONB DEFAULT NULL,

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP,
        usage_count INTEGER DEFAULT 0
      );
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX idx_templates_type ON templates(type) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX idx_templates_created ON templates(created_at DESC) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX idx_templates_deleted ON templates(deleted_at)`);

    // Full text search index on name
    await queryRunner.query(`CREATE INDEX idx_templates_name_search ON templates USING GIN(to_tsvector('english', name)) WHERE deleted_at IS NULL`);

    // Usage count index
    await queryRunner.query(`CREATE INDEX idx_templates_usage_count ON templates(usage_count DESC) WHERE deleted_at IS NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_templates_usage_count`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_templates_name_search`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_templates_deleted`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_templates_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_templates_type`);
    await queryRunner.query(`DROP TABLE IF EXISTS templates`);
  }
}
