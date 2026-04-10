-- Safe alignment script for migrating legacy Project/Newsletter content
-- into bilingual columns before applying Prisma schema changes.

ALTER TABLE `Project`
  ADD COLUMN IF NOT EXISTS `title_en` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `title_am` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `summary_en` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `summary_am` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `body_en` LONGTEXT NULL,
  ADD COLUMN IF NOT EXISTS `body_am` LONGTEXT NULL;

ALTER TABLE `Newsletter`
  ADD COLUMN IF NOT EXISTS `title_en` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `title_am` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `body_en` LONGTEXT NULL,
  ADD COLUMN IF NOT EXISTS `body_am` LONGTEXT NULL;

UPDATE `Project`
SET
  `title_en` = COALESCE(NULLIF(`title_en`, ''), `title`),
  `title_am` = COALESCE(NULLIF(`title_am`, ''), `title`),
  `summary_en` = COALESCE(NULLIF(`summary_en`, ''), `summary`),
  `summary_am` = COALESCE(NULLIF(`summary_am`, ''), `summary`),
  `body_en` = COALESCE(`body_en`, `body`),
  `body_am` = COALESCE(`body_am`, `body`);

UPDATE `Project`
SET
  `title_en` = COALESCE(`title_en`, ''),
  `title_am` = COALESCE(`title_am`, ''),
  `summary_en` = COALESCE(`summary_en`, ''),
  `summary_am` = COALESCE(`summary_am`, '');

UPDATE `Newsletter`
SET
  `title_en` = COALESCE(NULLIF(`title_en`, ''), SUBSTRING_INDEX(COALESCE(`source`, `email`), ' | ', 1), `email`),
  `title_am` = COALESCE(NULLIF(`title_am`, ''), SUBSTRING_INDEX(COALESCE(`source`, `email`), ' | ', 1), `email`);

UPDATE `Newsletter`
SET
  `title_en` = COALESCE(`title_en`, `email`),
  `title_am` = COALESCE(`title_am`, `email`);

ALTER TABLE `Project`
  MODIFY COLUMN `title_en` VARCHAR(191) NOT NULL,
  MODIFY COLUMN `title_am` VARCHAR(191) NOT NULL,
  MODIFY COLUMN `summary_en` VARCHAR(191) NOT NULL,
  MODIFY COLUMN `summary_am` VARCHAR(191) NOT NULL;

ALTER TABLE `Newsletter`
  MODIFY COLUMN `title_en` VARCHAR(191) NOT NULL,
  MODIFY COLUMN `title_am` VARCHAR(191) NOT NULL;

ALTER TABLE `Project`
  DROP COLUMN IF EXISTS `title`,
  DROP COLUMN IF EXISTS `summary`,
  DROP COLUMN IF EXISTS `body`;

ALTER TABLE `Newsletter`
  DROP COLUMN IF EXISTS `title`,
  DROP COLUMN IF EXISTS `body`;
