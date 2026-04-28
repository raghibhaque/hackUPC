-- Legacy CRM schema — Salesforce-style export with abbreviated names, mixed conventions.
-- Represents a real-world inherited CRM database before any naming standards existed.

CREATE TABLE SF_CNTCT (
    cntct_id    INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fnm         VARCHAR(80)  NOT NULL,
    lnm         VARCHAR(80)  NOT NULL,
    eml         VARCHAR(150) NOT NULL UNIQUE,
    ph          VARCHAR(40)  DEFAULT NULL,
    mbl         VARCHAR(40)  DEFAULT NULL,
    ttl         VARCHAR(100) DEFAULT NULL,
    dpt         VARCHAR(100) DEFAULT NULL,
    acct_id     INT          DEFAULT NULL,
    ownr_id     INT          DEFAULT NULL,
    is_del      TINYINT(1)   NOT NULL DEFAULT 0,
    cre_dt      DATETIME     NOT NULL,
    mod_dt      DATETIME     DEFAULT NULL,
    lst_act_dt  DATETIME     DEFAULT NULL,
    src         VARCHAR(50)  DEFAULT NULL,
    KEY idx_eml    (eml),
    KEY idx_acct   (acct_id),
    KEY idx_ownr   (ownr_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE SF_ACCT (
    acct_id     INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    acct_nm     VARCHAR(200)  NOT NULL,
    acct_typ    VARCHAR(50)   DEFAULT NULL,
    indsty      VARCHAR(100)  DEFAULT NULL,
    ann_rev     DECIMAL(15,2) DEFAULT NULL,
    emp_cnt     INT           DEFAULT NULL,
    ph          VARCHAR(40)   DEFAULT NULL,
    website     VARCHAR(255)  DEFAULT NULL,
    blng_st     VARCHAR(200)  DEFAULT NULL,
    blng_cty    VARCHAR(100)  DEFAULT NULL,
    blng_cntry  VARCHAR(50)   DEFAULT 'US',
    ownr_id     INT           DEFAULT NULL,
    prnt_acct   INT           DEFAULT NULL,
    is_del      TINYINT(1)    NOT NULL DEFAULT 0,
    cre_dt      DATETIME      NOT NULL,
    mod_dt      DATETIME      DEFAULT NULL,
    KEY idx_nm     (acct_nm),
    KEY idx_ownr   (ownr_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE SF_OPPTY (
    oppty_id    INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    oppty_nm    VARCHAR(200)  NOT NULL,
    acct_id     INT           DEFAULT NULL,
    stg         VARCHAR(50)   NOT NULL DEFAULT 'Prospecting',
    amt         DECIMAL(15,2) DEFAULT NULL,
    cls_dt      DATE          DEFAULT NULL,
    prob        TINYINT       NOT NULL DEFAULT 10,
    typ         VARCHAR(50)   DEFAULT NULL,
    src         VARCHAR(50)   DEFAULT NULL,
    fcast_cat   VARCHAR(50)   DEFAULT NULL,
    is_clos_won TINYINT(1)    NOT NULL DEFAULT 0,
    is_del      TINYINT(1)    NOT NULL DEFAULT 0,
    ownr_id     INT           DEFAULT NULL,
    cre_dt      DATETIME      NOT NULL,
    mod_dt      DATETIME      DEFAULT NULL,
    KEY idx_acct   (acct_id),
    KEY idx_stg    (stg),
    KEY idx_ownr   (ownr_id),
    FOREIGN KEY (acct_id) REFERENCES SF_ACCT(acct_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE SF_LD (
    ld_id       INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fnm         VARCHAR(80)  NOT NULL,
    lnm         VARCHAR(80)  NOT NULL,
    cmpny       VARCHAR(200) DEFAULT NULL,
    eml         VARCHAR(150) DEFAULT NULL,
    ph          VARCHAR(40)  DEFAULT NULL,
    ttl         VARCHAR(100) DEFAULT NULL,
    stat        VARCHAR(50)  NOT NULL DEFAULT 'Open',
    src         VARCHAR(50)  DEFAULT NULL,
    rtng        VARCHAR(20)  DEFAULT NULL,
    is_conv     TINYINT(1)   NOT NULL DEFAULT 0,
    conv_dt     DATETIME     DEFAULT NULL,
    conv_acct   INT          DEFAULT NULL,
    conv_cntct  INT          DEFAULT NULL,
    conv_oppty  INT          DEFAULT NULL,
    ownr_id     INT          DEFAULT NULL,
    is_del      TINYINT(1)   NOT NULL DEFAULT 0,
    cre_dt      DATETIME     NOT NULL,
    mod_dt      DATETIME     DEFAULT NULL,
    KEY idx_eml    (eml),
    KEY idx_stat   (stat),
    KEY idx_ownr   (ownr_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE SF_CAMP (
    camp_id     INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    camp_nm     VARCHAR(200)  NOT NULL,
    stat        VARCHAR(50)   NOT NULL DEFAULT 'Planned',
    typ         VARCHAR(50)   DEFAULT NULL,
    st_dt       DATE          DEFAULT NULL,
    end_dt      DATE          DEFAULT NULL,
    bdgt        DECIMAL(15,2) DEFAULT NULL,
    act_cost    DECIMAL(15,2) DEFAULT NULL,
    exp_resp    INT           DEFAULT NULL,
    act_resp    INT           NOT NULL DEFAULT 0,
    exp_rev     DECIMAL(15,2) DEFAULT NULL,
    act_rev     DECIMAL(15,2) DEFAULT NULL,
    is_actv     TINYINT(1)    NOT NULL DEFAULT 1,
    ownr_id     INT           DEFAULT NULL,
    cre_dt      DATETIME      NOT NULL,
    mod_dt      DATETIME      DEFAULT NULL,
    KEY idx_stat   (stat),
    KEY idx_typ    (typ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE SF_ACTV (
    actv_id     INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    subj        VARCHAR(255) NOT NULL,
    typ         VARCHAR(50)  NOT NULL DEFAULT 'Task',
    stat        VARCHAR(50)  NOT NULL DEFAULT 'Not Started',
    pri         VARCHAR(20)  NOT NULL DEFAULT 'Normal',
    due_dt      DATE         DEFAULT NULL,
    comp_dt     DATETIME     DEFAULT NULL,
    who_id      INT          DEFAULT NULL,
    who_typ     VARCHAR(20)  DEFAULT NULL,
    what_id     INT          DEFAULT NULL,
    what_typ    VARCHAR(50)  DEFAULT NULL,
    desc_txt    TEXT         DEFAULT NULL,
    is_del      TINYINT(1)   NOT NULL DEFAULT 0,
    ownr_id     INT          DEFAULT NULL,
    cre_dt      DATETIME     NOT NULL,
    mod_dt      DATETIME     DEFAULT NULL,
    KEY idx_who    (who_id),
    KEY idx_what   (what_id),
    KEY idx_due    (due_dt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE SF_OPPTY_CNTCT (
    oc_id       INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    oppty_id    INT         NOT NULL,
    cntct_id    INT         NOT NULL,
    role        VARCHAR(80) DEFAULT NULL,
    is_prim     TINYINT(1)  NOT NULL DEFAULT 0,
    cre_dt      DATETIME    NOT NULL,
    KEY idx_oppty  (oppty_id),
    KEY idx_cntct  (cntct_id),
    FOREIGN KEY (oppty_id) REFERENCES SF_OPPTY(oppty_id),
    FOREIGN KEY (cntct_id) REFERENCES SF_CNTCT(cntct_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
