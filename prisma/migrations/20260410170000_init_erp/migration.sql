-- CreateTable
CREATE TABLE `Project` (
    `id` VARCHAR(191) NOT NULL,
    `title_en` VARCHAR(191) NOT NULL,
    `title_am` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `summary_en` VARCHAR(191) NOT NULL,
    `summary_am` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'COMPLETED') NOT NULL DEFAULT 'ACTIVE',
    `body_en` VARCHAR(191) NULL,
    `body_am` VARCHAR(191) NULL,
    `coverImage` VARCHAR(191) NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Project_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Newsletter` (
    `id` VARCHAR(191) NOT NULL,
    `title_en` VARCHAR(191) NOT NULL,
    `title_am` VARCHAR(191) NOT NULL,
    `body_en` VARCHAR(191) NULL,
    `body_am` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
    `subscribed` BOOLEAN NOT NULL DEFAULT true,
    `source` VARCHAR(191) NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `subscribedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Newsletter_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BoardMember` (
    `id` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `bio` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GovernanceMember` (
    `id` VARCHAR(191) NOT NULL,
    `name_en` VARCHAR(191) NOT NULL,
    `name_am` VARCHAR(191) NOT NULL,
    `role_en` VARCHAR(191) NOT NULL,
    `role_am` VARCHAR(191) NOT NULL,
    `bio_en` VARCHAR(191) NULL,
    `bio_am` VARCHAR(191) NULL,
    `imagePath` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isBoardMember` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GovernanceMember_order_idx`(`order`),
    INDEX `GovernanceMember_isBoardMember_idx`(`isBoardMember`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Donation` (
    `id` VARCHAR(191) NOT NULL,
    `donorName` VARCHAR(191) NULL,
    `donorEmail` VARCHAR(191) NULL,
    `donorPhone` VARCHAR(191) NULL,
    `tx_ref` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'ETB',
    `paymentProvider` VARCHAR(191) NOT NULL DEFAULT 'chapa',
    `paymentStatus` ENUM('PENDING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `chapaCheckoutId` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `centerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Donation_tx_ref_key`(`tx_ref`),
    INDEX `Donation_tx_ref_idx`(`tx_ref`),
    INDEX `Donation_paymentStatus_idx`(`paymentStatus`),
    INDEX `Donation_createdAt_idx`(`createdAt`),
    INDEX `Donation_centerId_idx`(`centerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactMessage` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `status` ENUM('UNREAD', 'READ') NOT NULL DEFAULT 'UNREAD',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContactMessage_status_idx`(`status`),
    INDEX `ContactMessage_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SchoolCenter` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Staff` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('TEACHER', 'ADMIN', 'SUPPORT') NOT NULL,
    `baseSalary` DECIMAL(12, 2) NOT NULL,
    `pensionNumber` VARCHAR(191) NULL,
    `photoUrl` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `centerId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Staff_centerId_idx`(`centerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PayrollRecord` (
    `id` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `grossSalary` DECIMAL(12, 2) NOT NULL,
    `netSalary` DECIMAL(12, 2) NOT NULL,
    `incomeTax` DECIMAL(12, 2) NOT NULL,
    `pensionContribution` DECIMAL(12, 2) NOT NULL,
    `employerPensionContribution` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PayrollRecord_staffId_idx`(`staffId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItem` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` ENUM('STATIONERY', 'UNIFORM', 'TEXTBOOK', 'ASSET') NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `minStock` INTEGER NOT NULL DEFAULT 0,
    `centerId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InventoryItem_centerId_idx`(`centerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryLog` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `centerId` VARCHAR(191) NOT NULL,
    `performedBy` VARCHAR(191) NOT NULL,
    `logType` ENUM('RESTOCK', 'ISSUE') NOT NULL,
    `quantityDelta` INTEGER NOT NULL,
    `quantityAfter` INTEGER NOT NULL,
    `recipientName` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InventoryLog_itemId_createdAt_idx`(`itemId`, `createdAt`),
    INDEX `InventoryLog_centerId_createdAt_idx`(`centerId`, `createdAt`),
    INDEX `InventoryLog_performedBy_createdAt_idx`(`performedBy`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SchoolExpense` (
    `id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `category` ENUM('FOOD_PROGRAM', 'UTILITIES', 'MAINTENANCE', 'CONSTRUCTION', 'SUPPLIES') NOT NULL,
    `description` VARCHAR(191) NULL,
    `centerId` VARCHAR(191) NULL,
    `performedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SchoolExpense_centerId_idx`(`centerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Student` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `gradeLevel` VARCHAR(191) NOT NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
    `dateOfBirth` DATETIME(3) NOT NULL,
    `enrollmentDate` DATETIME(3) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'ALUMNI', 'DROPPED') NOT NULL DEFAULT 'ACTIVE',
    `guardianId` VARCHAR(191) NOT NULL,
    `centerId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Student_centerId_idx`(`centerId`),
    INDEX `Student_guardianId_idx`(`guardianId`),
    INDEX `Student_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attendance` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `centerId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `status` ENUM('PRESENT', 'ABSENT', 'TARDY', 'EXCUSED') NOT NULL DEFAULT 'PRESENT',
    `notes` VARCHAR(191) NULL,
    `performedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Attendance_centerId_date_idx`(`centerId`, `date`),
    INDEX `Attendance_status_date_idx`(`status`, `date`),
    UNIQUE INDEX `Attendance_studentId_date_key`(`studentId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Guardian` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `relationship` ENUM('MOTHER', 'FATHER', 'LEGAL_GUARDIAN') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentInteraction` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `centerId` VARCHAR(191) NOT NULL,
    `interactionType` ENUM('PARENT_MEETING', 'DISCIPLINARY_NOTE', 'ATTENDANCE_FOLLOWUP', 'UNIFORM_SUPPORT', 'GENERAL_NOTE') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NOT NULL,
    `interactionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `performedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StudentInteraction_studentId_interactionDate_idx`(`studentId`, `interactionDate`),
    INDEX `StudentInteraction_centerId_interactionDate_idx`(`centerId`, `interactionDate`),
    INDEX `StudentInteraction_performedBy_interactionDate_idx`(`performedBy`, `interactionDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffAccount` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPERADMIN', 'DIRECTOR', 'FINANCE', 'ADMIN', 'STAFF') NOT NULL DEFAULT 'STAFF',
    `staffId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StaffAccount_email_key`(`email`),
    UNIQUE INDEX `StaffAccount_staffId_key`(`staffId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SealedFinanceMonth` (
    `id` VARCHAR(191) NOT NULL,
    `centerId` VARCHAR(191) NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `sealedBy` VARCHAR(191) NOT NULL,
    `sealedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SealedFinanceMonth_centerId_sealedAt_idx`(`centerId`, `sealedAt`),
    UNIQUE INDEX `SealedFinanceMonth_centerId_month_year_key`(`centerId`, `month`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `actionType` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    INDEX `AuditLog_actorId_createdAt_idx`(`actorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Donation` ADD CONSTRAINT `Donation_centerId_fkey` FOREIGN KEY (`centerId`) REFERENCES `SchoolCenter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_centerId_fkey` FOREIGN KEY (`centerId`) REFERENCES `SchoolCenter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollRecord` ADD CONSTRAINT `PayrollRecord_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_centerId_fkey` FOREIGN KEY (`centerId`) REFERENCES `SchoolCenter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryLog` ADD CONSTRAINT `InventoryLog_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `InventoryItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryLog` ADD CONSTRAINT `InventoryLog_centerId_fkey` FOREIGN KEY (`centerId`) REFERENCES `SchoolCenter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SchoolExpense` ADD CONSTRAINT `SchoolExpense_centerId_fkey` FOREIGN KEY (`centerId`) REFERENCES `SchoolCenter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student` ADD CONSTRAINT `Student_guardianId_fkey` FOREIGN KEY (`guardianId`) REFERENCES `Guardian`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student` ADD CONSTRAINT `Student_centerId_fkey` FOREIGN KEY (`centerId`) REFERENCES `SchoolCenter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_centerId_fkey` FOREIGN KEY (`centerId`) REFERENCES `SchoolCenter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentInteraction` ADD CONSTRAINT `StudentInteraction_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentInteraction` ADD CONSTRAINT `StudentInteraction_centerId_fkey` FOREIGN KEY (`centerId`) REFERENCES `SchoolCenter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffAccount` ADD CONSTRAINT `StaffAccount_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SealedFinanceMonth` ADD CONSTRAINT `SealedFinanceMonth_centerId_fkey` FOREIGN KEY (`centerId`) REFERENCES `SchoolCenter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

