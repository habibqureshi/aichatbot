-- Migrate appointments to use customer_id instead of patient_id
ALTER TABLE appointments ADD COLUMN customer_id INT NULL,
    ADD CONSTRAINT fk_appointment_customer FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Backfill: map existing patient records to customers by phone+tenant
UPDATE appointments a
JOIN patients p ON p.id = a.patient_id
JOIN customers c ON c.phone_number = p.phone_number AND c.tenant_id = p.tenant_id
SET a.customer_id = c.id
WHERE a.patient_id IS NOT NULL;
