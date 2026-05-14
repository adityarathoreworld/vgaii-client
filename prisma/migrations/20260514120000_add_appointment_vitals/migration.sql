-- Optional vitals captured at appointment completion. All nullable since
-- the receptionist fills them in only when the patient was measured.
ALTER TABLE `Appointment`
  ADD COLUMN `weightKg` DOUBLE NULL,
  ADD COLUMN `sugarMgDl` DOUBLE NULL,
  ADD COLUMN `bpSystolic` INT NULL,
  ADD COLUMN `bpDiastolic` INT NULL;
