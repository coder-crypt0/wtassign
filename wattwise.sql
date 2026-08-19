CREATE DATABASE IF NOT EXISTS wattwise CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wattwise;

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash CHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS meters (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    meter_number VARCHAR(50) NOT NULL UNIQUE,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(80) NOT NULL,
    connection_type VARCHAR(30) NOT NULL DEFAULT 'Domestic',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_meters_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS readings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    meter_id INT UNSIGNED NOT NULL,
    reading_date DATE NOT NULL,
    units DECIMAL(10,2) NOT NULL,
    bill_amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_readings_meter FOREIGN KEY (meter_id) REFERENCES meters(id) ON DELETE CASCADE,
    INDEX idx_readings_meter_date (meter_id, reading_date)
) ENGINE=InnoDB;
