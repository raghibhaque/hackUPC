-- Modern CRM schema — HubSpot-style with verbose names, consistent snake_case, UUID-friendly keys.
-- The reconciler maps the messy Salesforce legacy schema above onto this clean structure.

CREATE TABLE contacts (
    contact_id       BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    first_name       VARCHAR(80)  NOT NULL,
    last_name        VARCHAR(80)  NOT NULL,
    email_address    VARCHAR(150) NOT NULL UNIQUE,
    phone_number     VARCHAR(40)  DEFAULT NULL,
    mobile_number    VARCHAR(40)  DEFAULT NULL,
    job_title        VARCHAR(100) DEFAULT NULL,
    department       VARCHAR(100) DEFAULT NULL,
    company_id       BIGINT       DEFAULT NULL,
    owner_id         BIGINT       DEFAULT NULL,
    is_deleted       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP    DEFAULT NULL,
    lead_source      VARCHAR(50)  DEFAULT NULL,
    lifecycle_stage  VARCHAR(50)  NOT NULL DEFAULT 'subscriber',
    KEY idx_email    (email_address),
    KEY idx_company  (company_id),
    KEY idx_owner    (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE companies (
    company_id       BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_name     VARCHAR(200)  NOT NULL,
    company_type     VARCHAR(50)   DEFAULT NULL,
    industry         VARCHAR(100)  DEFAULT NULL,
    annual_revenue   DECIMAL(15,2) DEFAULT NULL,
    employee_count   INT           DEFAULT NULL,
    phone_number     VARCHAR(40)   DEFAULT NULL,
    website_url      VARCHAR(255)  DEFAULT NULL,
    billing_street   VARCHAR(200)  DEFAULT NULL,
    billing_city     VARCHAR(100)  DEFAULT NULL,
    billing_country  VARCHAR(50)   NOT NULL DEFAULT 'US',
    owner_id         BIGINT        DEFAULT NULL,
    parent_company_id BIGINT       DEFAULT NULL,
    is_deleted       BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP     DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_name     (company_name),
    KEY idx_owner    (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE deals (
    deal_id          BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    deal_name        VARCHAR(200)  NOT NULL,
    company_id       BIGINT        DEFAULT NULL,
    deal_stage       VARCHAR(50)   NOT NULL DEFAULT 'appointmentscheduled',
    amount           DECIMAL(15,2) DEFAULT NULL,
    close_date       DATE          DEFAULT NULL,
    probability      TINYINT       NOT NULL DEFAULT 10,
    deal_type        VARCHAR(50)   DEFAULT NULL,
    lead_source      VARCHAR(50)   DEFAULT NULL,
    forecast_category VARCHAR(50)  DEFAULT NULL,
    is_closed_won    BOOLEAN       NOT NULL DEFAULT FALSE,
    is_deleted       BOOLEAN       NOT NULL DEFAULT FALSE,
    owner_id         BIGINT        DEFAULT NULL,
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP     DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_company  (company_id),
    KEY idx_stage    (deal_stage),
    KEY idx_owner    (owner_id),
    FOREIGN KEY (company_id) REFERENCES companies(company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
