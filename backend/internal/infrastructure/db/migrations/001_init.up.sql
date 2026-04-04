-- locomotives
CREATE TABLE IF NOT EXISTS locomotives (
    id           SERIAL PRIMARY KEY,
    number       VARCHAR(20) NOT NULL UNIQUE,
    type         VARCHAR(20) NOT NULL,
    model        VARCHAR(50),
    power_type   VARCHAR(20),
    manufacturer VARCHAR(50),
    year_built   INT,
    depot        VARCHAR(50),
    status       VARCHAR(20) NOT NULL DEFAULT 'active'
);

-- telemetry_current: one row per locomotive, UPSERT on each Kafka message
CREATE UNLOGGED TABLE IF NOT EXISTS telemetry_current (
    locomotive_id            INT PRIMARY KEY REFERENCES locomotives(id),
    ts                       TIMESTAMP NOT NULL DEFAULT NOW(),

    speed                    DOUBLE PRECISION,
    traction_force           DOUBLE PRECISION,
    wheel_slip               DOUBLE PRECISION,

    engine_rpm               DOUBLE PRECISION,
    engine_temp              DOUBLE PRECISION,
    oil_pressure             DOUBLE PRECISION,
    oil_temp                 DOUBLE PRECISION,
    fuel_level               DOUBLE PRECISION,
    fuel_consumption         DOUBLE PRECISION,

    pantograph_voltage       DOUBLE PRECISION,
    traction_current         DOUBLE PRECISION,
    traction_voltage         DOUBLE PRECISION,
    inverter_temp            DOUBLE PRECISION,
    battery_voltage          DOUBLE PRECISION,

    brake_pipe_pressure      DOUBLE PRECISION,
    brake_cylinder_pressure  DOUBLE PRECISION,
    main_reservoir_pressure  DOUBLE PRECISION,

    ambient_temp             DOUBLE PRECISION,
    gps_lat                  DOUBLE PRECISION,
    gps_lon                  DOUBLE PRECISION,

    health                   DOUBLE PRECISION
);

-- telemetry_history: append-only time-series, partitioned by week
CREATE TABLE IF NOT EXISTS telemetry_history (
    id                       BIGSERIAL,
    locomotive_id            INT NOT NULL REFERENCES locomotives(id),
    ts                       TIMESTAMP NOT NULL DEFAULT NOW(),

    speed                    DOUBLE PRECISION,
    traction_force           DOUBLE PRECISION,
    wheel_slip               DOUBLE PRECISION,
    engine_rpm               DOUBLE PRECISION,
    engine_temp              DOUBLE PRECISION,
    oil_pressure             DOUBLE PRECISION,
    oil_temp                 DOUBLE PRECISION,
    fuel_level               DOUBLE PRECISION,
    fuel_consumption         DOUBLE PRECISION,
    pantograph_voltage       DOUBLE PRECISION,
    traction_current         DOUBLE PRECISION,
    traction_voltage         DOUBLE PRECISION,
    inverter_temp            DOUBLE PRECISION,
    battery_voltage          DOUBLE PRECISION,
    brake_pipe_pressure      DOUBLE PRECISION,
    brake_cylinder_pressure  DOUBLE PRECISION,
    main_reservoir_pressure  DOUBLE PRECISION,
    ambient_temp             DOUBLE PRECISION,
    gps_lat                  DOUBLE PRECISION,
    gps_lon                  DOUBLE PRECISION,
    health                   DOUBLE PRECISION,

    PRIMARY KEY (id, ts)
) PARTITION BY RANGE (ts);

CREATE TABLE IF NOT EXISTS telemetry_history_default
    PARTITION OF telemetry_history DEFAULT;

CREATE INDEX IF NOT EXISTS idx_th_loco_ts
    ON telemetry_history (locomotive_id, ts DESC);

-- telemetry_limits: normal operating ranges and alert thresholds per locomotive
CREATE TABLE IF NOT EXISTS telemetry_limits (
    id            SERIAL PRIMARY KEY,
    locomotive_id INT NOT NULL UNIQUE REFERENCES locomotives(id),

    speed_min DOUBLE PRECISION, speed_max DOUBLE PRECISION,
    speed_warning_min DOUBLE PRECISION, speed_warning_max DOUBLE PRECISION,
    speed_critical_min DOUBLE PRECISION, speed_critical_max DOUBLE PRECISION,

    traction_force_min DOUBLE PRECISION, traction_force_max DOUBLE PRECISION,
    traction_force_warning_min DOUBLE PRECISION, traction_force_warning_max DOUBLE PRECISION,
    traction_force_critical_min DOUBLE PRECISION, traction_force_critical_max DOUBLE PRECISION,

    wheel_slip_min DOUBLE PRECISION, wheel_slip_max DOUBLE PRECISION,
    wheel_slip_warning_min DOUBLE PRECISION, wheel_slip_warning_max DOUBLE PRECISION,
    wheel_slip_critical_min DOUBLE PRECISION, wheel_slip_critical_max DOUBLE PRECISION,

    engine_rpm_min DOUBLE PRECISION, engine_rpm_max DOUBLE PRECISION,
    engine_rpm_warning_min DOUBLE PRECISION, engine_rpm_warning_max DOUBLE PRECISION,
    engine_rpm_critical_min DOUBLE PRECISION, engine_rpm_critical_max DOUBLE PRECISION,

    engine_temp_min DOUBLE PRECISION, engine_temp_max DOUBLE PRECISION,
    engine_temp_warning_min DOUBLE PRECISION, engine_temp_warning_max DOUBLE PRECISION,
    engine_temp_critical_min DOUBLE PRECISION, engine_temp_critical_max DOUBLE PRECISION,

    oil_pressure_min DOUBLE PRECISION, oil_pressure_max DOUBLE PRECISION,
    oil_pressure_warning_min DOUBLE PRECISION, oil_pressure_warning_max DOUBLE PRECISION,
    oil_pressure_critical_min DOUBLE PRECISION, oil_pressure_critical_max DOUBLE PRECISION,

    oil_temp_min DOUBLE PRECISION, oil_temp_max DOUBLE PRECISION,
    oil_temp_warning_min DOUBLE PRECISION, oil_temp_warning_max DOUBLE PRECISION,
    oil_temp_critical_min DOUBLE PRECISION, oil_temp_critical_max DOUBLE PRECISION,

    fuel_level_min DOUBLE PRECISION, fuel_level_max DOUBLE PRECISION,
    fuel_level_warning_min DOUBLE PRECISION, fuel_level_warning_max DOUBLE PRECISION,
    fuel_level_critical_min DOUBLE PRECISION, fuel_level_critical_max DOUBLE PRECISION,

    fuel_consumption_min DOUBLE PRECISION, fuel_consumption_max DOUBLE PRECISION,
    fuel_consumption_warning_min DOUBLE PRECISION, fuel_consumption_warning_max DOUBLE PRECISION,
    fuel_consumption_critical_min DOUBLE PRECISION, fuel_consumption_critical_max DOUBLE PRECISION,

    pantograph_voltage_min DOUBLE PRECISION, pantograph_voltage_max DOUBLE PRECISION,
    pantograph_voltage_warning_min DOUBLE PRECISION, pantograph_voltage_warning_max DOUBLE PRECISION,
    pantograph_voltage_critical_min DOUBLE PRECISION, pantograph_voltage_critical_max DOUBLE PRECISION,

    traction_current_min DOUBLE PRECISION, traction_current_max DOUBLE PRECISION,
    traction_current_warning_min DOUBLE PRECISION, traction_current_warning_max DOUBLE PRECISION,
    traction_current_critical_min DOUBLE PRECISION, traction_current_critical_max DOUBLE PRECISION,

    traction_voltage_min DOUBLE PRECISION, traction_voltage_max DOUBLE PRECISION,
    traction_voltage_warning_min DOUBLE PRECISION, traction_voltage_warning_max DOUBLE PRECISION,
    traction_voltage_critical_min DOUBLE PRECISION, traction_voltage_critical_max DOUBLE PRECISION,

    inverter_temp_min DOUBLE PRECISION, inverter_temp_max DOUBLE PRECISION,
    inverter_temp_warning_min DOUBLE PRECISION, inverter_temp_warning_max DOUBLE PRECISION,
    inverter_temp_critical_min DOUBLE PRECISION, inverter_temp_critical_max DOUBLE PRECISION,

    battery_voltage_min DOUBLE PRECISION, battery_voltage_max DOUBLE PRECISION,
    battery_voltage_warning_min DOUBLE PRECISION, battery_voltage_warning_max DOUBLE PRECISION,
    battery_voltage_critical_min DOUBLE PRECISION, battery_voltage_critical_max DOUBLE PRECISION,

    brake_pipe_pressure_min DOUBLE PRECISION, brake_pipe_pressure_max DOUBLE PRECISION,
    brake_pipe_pressure_warning_min DOUBLE PRECISION, brake_pipe_pressure_warning_max DOUBLE PRECISION,
    brake_pipe_pressure_critical_min DOUBLE PRECISION, brake_pipe_pressure_critical_max DOUBLE PRECISION,

    brake_cylinder_pressure_min DOUBLE PRECISION, brake_cylinder_pressure_max DOUBLE PRECISION,
    brake_cylinder_pressure_warning_min DOUBLE PRECISION, brake_cylinder_pressure_warning_max DOUBLE PRECISION,
    brake_cylinder_pressure_critical_min DOUBLE PRECISION, brake_cylinder_pressure_critical_max DOUBLE PRECISION,

    main_reservoir_pressure_min DOUBLE PRECISION, main_reservoir_pressure_max DOUBLE PRECISION,
    main_reservoir_pressure_warning_min DOUBLE PRECISION, main_reservoir_pressure_warning_max DOUBLE PRECISION,
    main_reservoir_pressure_critical_min DOUBLE PRECISION, main_reservoir_pressure_critical_max DOUBLE PRECISION,

    ambient_temp_min DOUBLE PRECISION, ambient_temp_max DOUBLE PRECISION,
    ambient_temp_warning_min DOUBLE PRECISION, ambient_temp_warning_max DOUBLE PRECISION,
    ambient_temp_critical_min DOUBLE PRECISION, ambient_temp_critical_max DOUBLE PRECISION
);

-- alerts
CREATE TABLE IF NOT EXISTS alerts (
    id              BIGSERIAL PRIMARY KEY,
    locomotive_id   INT NOT NULL REFERENCES locomotives(id),
    ts              TIMESTAMP NOT NULL DEFAULT NOW(),
    parameter_name  VARCHAR(50) NOT NULL,
    value           DOUBLE PRECISION,
    threshold_value DOUBLE PRECISION,
    severity        VARCHAR(10) NOT NULL CHECK (severity IN ('warning', 'critical')),
    message         TEXT,
    is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_at TIMESTAMP,
    acknowledged_by VARCHAR(50),
    resolved_at     TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_active
    ON alerts (locomotive_id, is_acknowledged, ts DESC);

-- health_snapshots
CREATE TABLE IF NOT EXISTS health_snapshots (
    id            BIGSERIAL PRIMARY KEY,
    locomotive_id INT NOT NULL REFERENCES locomotives(id),
    ts            TIMESTAMP NOT NULL DEFAULT NOW(),
    health_score  DOUBLE PRECISION NOT NULL,
    top_factors   JSONB
);

CREATE INDEX IF NOT EXISTS idx_hs_loco_ts
    ON health_snapshots (locomotive_id, ts DESC);

-- events
CREATE TABLE IF NOT EXISTS events (
    id                 BIGSERIAL PRIMARY KEY,
    locomotive_id      INT NOT NULL REFERENCES locomotives(id),
    ts                 TIMESTAMP NOT NULL DEFAULT NOW(),
    event_type         VARCHAR(30) NOT NULL,
    description        TEXT,
    created_by         VARCHAR(50),
    telemetry_snapshot JSONB
);

CREATE INDEX IF NOT EXISTS idx_events_loco_ts
    ON events (locomotive_id, ts DESC);





-- MOCK DATA FOR PRESENTATION

-- seed default locomotives
INSERT INTO locomotives (number, type, model, power_type, manufacturer, year_built, depot, status)
VALUES
    ('KZ-001', 'cargo', 'KZ8A', 'electric', 'Alstom', 2018, 'Almaty', 'active'),
    ('TE-002', 'cargo', 'ТЭ33А', 'diesel', 'GMC', 2015, 'Astana', 'active'),
    ('KZ-003', 'passenger', 'KZ4AT', 'electric', 'Alstom', 2020, 'Almaty', 'active')
ON CONFLICT (number) DO NOTHING;

-- seed default limits for each locomotive
INSERT INTO telemetry_limits (
    locomotive_id,
    speed_min, speed_max, speed_warning_min, speed_warning_max, speed_critical_min, speed_critical_max,
    engine_temp_min, engine_temp_max, engine_temp_warning_min, engine_temp_warning_max, engine_temp_critical_min, engine_temp_critical_max,
    oil_pressure_min, oil_pressure_max, oil_pressure_warning_min, oil_pressure_warning_max, oil_pressure_critical_min, oil_pressure_critical_max,
    fuel_level_min, fuel_level_max, fuel_level_warning_min, fuel_level_warning_max, fuel_level_critical_min, fuel_level_critical_max,
    brake_pipe_pressure_min, brake_pipe_pressure_max, brake_pipe_pressure_warning_min, brake_pipe_pressure_warning_max, brake_pipe_pressure_critical_min, brake_pipe_pressure_critical_max,
    engine_rpm_min, engine_rpm_max, engine_rpm_warning_min, engine_rpm_warning_max, engine_rpm_critical_min, engine_rpm_critical_max,
    battery_voltage_min, battery_voltage_max, battery_voltage_warning_min, battery_voltage_warning_max, battery_voltage_critical_min, battery_voltage_critical_max
)
SELECT
    l.id,
    0, 120, 100, 115, 115, 999,
    60, 95, 90, 100, 100, 999,
    3.5, 6.0, 2.5, 3.5, 0, 2.5,
    20, 100, 15, 20, 0, 15,
    4.5, 5.5, 3.5, 4.5, 0, 3.5,
    600, 1800, 1600, 1800, 1800, 9999,
    22, 30, 20, 22, 0, 20
FROM locomotives l
ON CONFLICT (locomotive_id) DO NOTHING;
