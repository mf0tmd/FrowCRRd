#include "atmosphere.hpp"

#include <algorithm>
#include <cmath>
#include <fstream>
#include <stdexcept>
#include <utility>

namespace
{
    constexpr double kGammaAir = 1.4;
    constexpr double kGasConstantAir = 287.05;
    constexpr double kKelvinOffset = 273.15;

    constexpr double kSutherlandS = 110.4;
    constexpr double kSutherlandT0 = 273.15;
    constexpr double kSutherlandMu0 = 1.716e-5;

    double calculate_sound_speed(double temperature_c) noexcept
    {
        const double temperature_k = std::max(1.0, temperature_c + kKelvinOffset);
        return std::sqrt(kGammaAir * kGasConstantAir * temperature_k);
    }

    bool all_finite(const std::vector<double>& values)
    {
        return std::all_of(values.begin(), values.end(), [](double v) { return std::isfinite(v); });
    }

    double calculate_viscosity_sutherland_si(double temperature_c) noexcept
    {
        const double temperature_k = std::max(1.0, temperature_c + kKelvinOffset);
        const double ratio = temperature_k / kSutherlandT0;
        return kSutherlandMu0 * std::pow(ratio, 1.5) * (kSutherlandT0 + kSutherlandS) / (temperature_k + kSutherlandS);
    }
}

AtmosphereModel::AtmosphereModel(const std::string& filename)
{
    std::ifstream file(filename);
    if (!file) {
        throw std::runtime_error("Cannot open atmosphere file: " + filename);
    }

    AtmospherePoint point;
    while (file >>
        point.altitude >>
        point.temperature >>
        point.gravity >>
        point.pressure >>
        point.density >>
        point.viscosity)
    {
        point.sound_speed = calculate_sound_speed(point.temperature);
        data_atmosphere_.push_back(point);
    }

    if (file.bad() || (!file.eof() && file.fail())) {
        throw std::runtime_error("Failed while reading atmosphere file: " + filename);
    }

    if (data_atmosphere_.size() < 4) {
        throw std::runtime_error("Atmosphere file must contain at least 4 rows with 6 numeric columns.");
    }

    std::sort(data_atmosphere_.begin(), data_atmosphere_.end());

    for (std::size_t i = 1; i < data_atmosphere_.size(); ++i) {
        if (data_atmosphere_[i].altitude <= data_atmosphere_[i - 1].altitude) {
            throw std::runtime_error("Atmosphere altitude points must be strictly increasing.");
        }
    }

    min_altitude_ = data_atmosphere_.front().altitude;
    max_altitude_ = data_atmosphere_.back().altitude;

    load_and_prepare_data();
}

void AtmosphereModel::load_and_prepare_data()
{
    std::vector<double> alt;
    std::vector<double> temp;
    std::vector<double> grav;
    std::vector<double> press;
    std::vector<double> den;
    std::vector<double> visc;
    std::vector<double> snd;

    const std::size_t size = data_atmosphere_.size();
    alt.reserve(size);
    temp.reserve(size);
    grav.reserve(size);
    press.reserve(size);
    den.reserve(size);
    visc.reserve(size);
    snd.reserve(size);

    for (const auto& p : data_atmosphere_) {
        alt.push_back(p.altitude);
        temp.push_back(p.temperature);
        grav.push_back(p.gravity);
        press.push_back(p.pressure);
        den.push_back(p.density);
        visc.push_back(p.viscosity);
        snd.push_back(p.sound_speed);
    }

    if (!all_finite(temp) || !all_finite(grav) || !all_finite(press) || !all_finite(den) || !all_finite(visc) || !all_finite(snd)) {
        throw std::runtime_error("Atmosphere table contains non-finite values.");
    }

    std::vector<double> alt_for_temp = alt;
    std::vector<double> alt_for_grav = alt;
    std::vector<double> alt_for_press = alt;
    std::vector<double> alt_for_den = alt;
    std::vector<double> alt_for_visc = alt;

    temperature_interpolator_.emplace(std::move(alt_for_temp), std::move(temp));
    gravity_interpolator_.emplace(std::move(alt_for_grav), std::move(grav));
    pressure_interpolator_.emplace(std::move(alt_for_press), std::move(press));
    density_interpolator_.emplace(std::move(alt_for_den), std::move(den));
    viscosity_interpolator_.emplace(std::move(alt_for_visc), std::move(visc));
    sound_speed_interpolator_.emplace(std::move(alt), std::move(snd));
    has_table_gravity_ = true;
}

AtmospherePoint AtmosphereModel::calculate_atmosphere(double altitude) const
{
    if (altitude >= min_altitude_ && altitude <= max_altitude_) {
        return calculate_table_atmosphere(altitude);
    }
    return calculate_extrapolated_atmosphere(altitude);
}

AtmospherePoint AtmosphereModel::calculate_table_atmosphere(double altitude) const
{
    AtmospherePoint point;
    point.altitude = altitude;

    if (temperature_interpolator_) {
        point.temperature = temperature_interpolator_.value()(altitude);
    }

    if (density_interpolator_) {
        point.density = std::max(0.0, density_interpolator_.value()(altitude));
    }

    if (sound_speed_interpolator_) {
        point.sound_speed = std::max(1.0, sound_speed_interpolator_.value()(altitude));
    }
    else {
        point.sound_speed = calculate_sound_speed(point.temperature);
    }

    if (pressure_interpolator_) {
        point.pressure = std::max(0.0, pressure_interpolator_.value()(altitude));
    }

    if (viscosity_interpolator_) {
        point.viscosity = std::max(0.0, viscosity_interpolator_.value()(altitude));
    }

    if (has_table_gravity_for_altitude(altitude) && gravity_interpolator_) {
        point.gravity = gravity_interpolator_.value()(altitude);
    }

    return point;
}

AtmospherePoint AtmosphereModel::calculate_extrapolated_atmosphere(double altitude) const
{
    const bool upper_extrapolation = altitude > max_altitude_;
    const std::size_t base_idx = upper_extrapolation ? data_atmosphere_.size() - 1 : 0;
    const std::size_t neighbor_idx = upper_extrapolation ? data_atmosphere_.size() - 2 : 1;

    const AtmospherePoint& base = data_atmosphere_[base_idx];
    const AtmospherePoint& neighbor = data_atmosphere_[neighbor_idx];

    const double dh_ref = base.altitude - neighbor.altitude;
    const double safe_dh_ref = (std::abs(dh_ref) > 1e-9) ? dh_ref : 1.0;
    const double dh = altitude - base.altitude;

    const double temperature_lapse = (base.temperature - neighbor.temperature) / safe_dh_ref;
    const double gravity_lapse =
        (std::isfinite(base.gravity) && std::isfinite(neighbor.gravity))
            ? ((base.gravity - neighbor.gravity) / safe_dh_ref)
            : 0.0;

    AtmospherePoint point;
    point.altitude = altitude;
    point.temperature = base.temperature + temperature_lapse * dh;

    const double base_temperature_k = std::max(1.0, base.temperature + kKelvinOffset);
    const double temperature_k = std::max(1.0, point.temperature + kKelvinOffset);
    const double gravity_for_pressure = std::isfinite(base.gravity) ? base.gravity : 9.80665;

    const double base_pressure_from_state_kpa =
        (std::isfinite(base.density) && base.density > 0.0)
            ? (base.density * kGasConstantAir * base_temperature_k / 1000.0)
            : 0.0;

    // Prefer table pressure for continuity at table edge; fallback to state-derived if table pressure is unavailable.
    double base_pressure_kpa =
        (std::isfinite(base.pressure) && base.pressure > 0.0) ? base.pressure : base_pressure_from_state_kpa;

    if (base_pressure_kpa > 0.0) {
        if (std::abs(temperature_lapse) > 1e-9) {
            const double ratio = std::max(1e-9, temperature_k / base_temperature_k);
            const double exponent = -gravity_for_pressure / (kGasConstantAir * temperature_lapse);
            point.pressure = std::max(0.0, base_pressure_kpa * std::pow(ratio, exponent));
        }
        else {
            point.pressure = std::max(
                0.0,
                base_pressure_kpa * std::exp(-gravity_for_pressure * dh / (kGasConstantAir * base_temperature_k))
            );
        }
    }
    else {
        point.pressure = 0.0;
    }

    if (point.pressure > 0.0) {
        if (std::isfinite(base.density) && base.density > 0.0 && base_pressure_kpa > 0.0) {
            // Keep density continuous even if table pressure uses a scaled convention.
            point.density = std::max(
                0.0,
                base.density * (point.pressure / base_pressure_kpa) * (base_temperature_k / temperature_k)
            );
        }
        else {
            point.density = std::max(0.0, point.pressure * 1000.0 / (kGasConstantAir * temperature_k));
        }
    }
    else {
        point.density = 0.0;
    }

    point.sound_speed = calculate_sound_speed(point.temperature);

    const double base_viscosity_si = calculate_viscosity_sutherland_si(base.temperature);
    const double viscosity_scale =
        (std::isfinite(base.viscosity) && base_viscosity_si > 0.0)
            ? (base.viscosity / base_viscosity_si)
            : 1.0;
    point.viscosity = std::max(0.0, calculate_viscosity_sutherland_si(point.temperature) * viscosity_scale);

    if (std::isfinite(base.gravity)) {
        point.gravity = std::max(0.0, base.gravity + gravity_lapse * dh);
    }

    return point;
}

AtmospherePoint AtmosphereModel::get_atmosphere(double altitude) const
{
    double precision = 1.0;
    if (altitude < 1000.0) {
        precision = 1.0;
    }
    else if (altitude < 10000.0) {
        precision = 10.0;
    }
    else {
        precision = 100.0;
    }

    const double rounded_alt = std::round(altitude / precision) * precision;

    const auto it = cache_.find(rounded_alt);
    if (it != cache_.end()) {
        return it->second;
    }

    AtmospherePoint point = calculate_atmosphere(rounded_alt);

    cache_[rounded_alt] = point;

    return point;
}
