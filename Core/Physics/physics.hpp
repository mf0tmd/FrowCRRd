#pragma once
#ifndef PHYSICS_HPP
#define PHYSICS_HPP
#include "Models/Rocket/rocket.hpp"
#include "Models/Atmosphere/atmosphere.hpp"
#include "Models/Aerodynamics/drag_table.hpp"
#include <eigen3/Eigen/Core>

struct Cache
{
    mutable AtmospherePoint last_atmosphere_point_;
    mutable double last_alt_ = 0.0;
    mutable double last_precision_ = 1.0;
    mutable double last_gravity_accel_ = 0.0;
    mutable bool is_initialized_ = false;
};

class Physics final
{
public:
    Physics(Rocket& rocket);

    Eigen::VectorXd calculate_derivatives(const Eigen::VectorXd& state, double tsi, double stage_tsi);
    constexpr double get_last_acceleration() const noexcept { return last_acceleration_; }
    constexpr double get_last_pitch_angle() const noexcept { return last_pitch_angle_; }
    ALWAYS_INLINE AtmospherePoint get_last_atmosphere_point() const noexcept { return cache_.last_atmosphere_point_; }

private:
    const Config& cfg_;
    Rocket& rocket_;
    const AtmosphereModel atmosphere_model_;
    const DragModel fair_drag_model_; // можно сделать эти 3 поля ссылками но тогда разные physics будут с взаимосвязанными атмосферами и драг моделями
    const DragModel bottom_drag_model_;
    const DragModel main_parachute_drag_model_;
    const DragModel drogue_parachute_drag_model_;
    Cache cache_;
    bool isAscending_;
    mutable double last_acceleration_ = 0.0; // для телеметрии метода write_telemetry() класса Simulation
    mutable double last_pitch_angle_ = 90.0; // для телеметрии ориентации корпуса на графике

    void update_cache_and_values(double h, AtmospherePoint &atmosphere_point, double &gravity_accel) const;
};

#endif // PHYSICS_HPP

