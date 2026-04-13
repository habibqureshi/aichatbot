-- Run against your MySQL DB (adjust if using another engine).
-- Adds optional link from conversations to customers (order / restaurant calls).

ALTER TABLE conversations
  ADD COLUMN customer_id INT NULL,
  ADD CONSTRAINT fk_conversations_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id);

CREATE INDEX ix_conversations_customer_id ON conversations (customer_id);
