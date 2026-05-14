-- AlterEnum: add new AuditEntityType values
ALTER TABLE `AuditLog` MODIFY `entityType` ENUM('Lead', 'Appointment', 'Client', 'User', 'Feedback', 'Payment', 'Expense', 'PresetCharge') NOT NULL;

-- CreateTable
CREATE TABLE `PresetCharge` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `amount` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PresetCharge_clientId_active_sortOrder_idx`(`clientId`, `active`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NULL,
    `appointmentId` VARCHAR(191) NULL,
    `patientName` VARCHAR(120) NULL,
    `patientPhone` VARCHAR(40) NULL,
    `amount` INTEGER NOT NULL,
    `discount` INTEGER NOT NULL DEFAULT 0,
    `finalAmount` INTEGER NOT NULL,
    `paymentMethod` ENUM('cash', 'upi', 'card', 'mixed', 'pending') NOT NULL,
    `notes` TEXT NOT NULL,
    `collectedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Payment_clientId_createdAt_idx`(`clientId`, `createdAt` DESC),
    INDEX `Payment_leadId_idx`(`leadId`),
    INDEX `Payment_appointmentId_idx`(`appointmentId`),
    INDEX `Payment_paymentMethod_idx`(`paymentMethod`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentItem` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `presetChargeId` VARCHAR(191) NULL,
    `title` VARCHAR(120) NOT NULL,
    `amount` INTEGER NOT NULL,

    INDEX `PaymentItem_paymentId_idx`(`paymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expense` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `category` ENUM('electricity', 'rent', 'staff_salary', 'medicines', 'cleaning', 'internet', 'marketing', 'miscellaneous') NOT NULL,
    `amount` INTEGER NOT NULL,
    `paymentMethod` ENUM('cash', 'upi', 'card', 'mixed', 'pending') NOT NULL,
    `notes` TEXT NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Expense_clientId_createdAt_idx`(`clientId`, `createdAt` DESC),
    INDEX `Expense_clientId_category_createdAt_idx`(`clientId`, `category`, `createdAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys (Cascade on tenant deletes, SetNull for soft references)
ALTER TABLE `PresetCharge` ADD CONSTRAINT `PresetCharge_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_collectedById_fkey` FOREIGN KEY (`collectedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `PaymentItem` ADD CONSTRAINT `PaymentItem_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PaymentItem` ADD CONSTRAINT `PaymentItem_presetChargeId_fkey` FOREIGN KEY (`presetChargeId`) REFERENCES `PresetCharge`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
