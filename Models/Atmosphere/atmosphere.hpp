#pragma once
#ifndef ATMOSPHERE_HPP
#define ATMOSPHERE_HPP

#include "Configs/config.hpp"

#include <boost/math/interpolators/makima.hpp>
#include <limits>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

using makima_inter = boost::math::interpolators::makima<std::vector<double>>;

struct AtmospherePoint
{
    double altitude = 0.0;
    double temperature = 0.0; // Celsius
    double gravity = std::numeric_limits<double>::quiet_NaN(); // m/s^2
    double pressure = std::numeric_limits<double>::quiet_NaN(); // kPa
    double density = 0.0; // kg/m^3
    double viscosity = std::numeric_limits<double>::quiet_NaN(); // Pa*s
    double sound_speed = 0.0; // m/s

    bool operator<(const AtmospherePoint& other) const
    {
        return altitude < other.altitude;
    }
};

class AtmosphereModel final
{
public:
    explicit AtmosphereModel(const std::string& filename);
    AtmospherePoint get_atmosphere(double altitude) const;

    ALWAYS_INLINE bool has_table_gravity_for_altitude(double altitude) const noexcept
    {
        return has_table_gravity_ && altitude >= min_altitude_ && altitude <= max_altitude_;
    }

private:
    std::vector<AtmospherePoint> data_atmosphere_;
    std::optional<makima_inter> temperature_interpolator_;
    std::optional<makima_inter> gravity_interpolator_;
    std::optional<makima_inter> pressure_interpolator_;
    std::optional<makima_inter> density_interpolator_;
    std::optional<makima_inter> viscosity_interpolator_;
    std::optional<makima_inter> sound_speed_interpolator_;

    mutable std::unordered_map<double, AtmospherePoint> cache_;
    bool has_table_gravity_ = false;
    double min_altitude_ = 0.0;
    double max_altitude_ = 0.0;

    void load_and_prepare_data();
    AtmospherePoint calculate_atmosphere(double altitude) const;
    AtmospherePoint calculate_table_atmosphere(double altitude) const;
    AtmospherePoint calculate_extrapolated_atmosphere(double altitude) const;
};

#endif // ATMOSPHERE_HPP
