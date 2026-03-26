#include "physics.hpp"
#include "consts_ind.hpp"
#include "Configs/config.hpp"
#include <algorithm>
#include <eigen3/Eigen/Core>
#include <cmath>

namespace
{
    constexpr double kMinDynamicMassKg = 1.0;
}

Physics::Physics(Rocket& rocket) :
cfg_(Config::get()),
rocket_(rocket),
atmosphere_model_(cfg_.get_active_atmosphere_path()),
fair_drag_model_(cfg_.fair_drag_table_path_),
bottom_drag_model_(cfg_.bottom_drag_table_path_),
main_parachute_drag_model_(cfg_.main_parachute_),
drogue_parachute_drag_model_(cfg_.drogue_parachute_),
isAscending_(true) {}

Eigen::VectorXd Physics::calculate_derivatives(const Eigen::VectorXd& state, double tsi, double stage_tsi)
{
    Eigen::VectorXd deriv(5);
    deriv.setZero();

    const double h = std::isfinite(state[StateIndex::ALTITUDE]) ? state[StateIndex::ALTITUDE] : 0.0;
    const double v_vert = std::isfinite(state[StateIndex::VERTICAL_VEL]) ? state[StateIndex::VERTICAL_VEL] : 0.0;
    const double v_hor = std::isfinite(state[StateIndex::HORIZONTAL_VEL]) ? state[StateIndex::HORIZONTAL_VEL] : 0.0;
    const double m = std::isfinite(state[StateIndex::MASS]) ? state[StateIndex::MASS] : 0.0;
    const double effective_mass = std::max(m, kMinDynamicMassKg);
    const double total_velocity = std::sqrt(v_vert * v_vert + v_hor * v_hor);

    deriv[DerivIndex::DH_DT] = v_vert;
    deriv[DerivIndex::DDN_DT] = v_hor;

    double throttle_control_value = stage_tsi;
    if (rocket_.has_active_stage()) {
        switch (rocket_.get_active_stage().get_throttle_value_type()) {
        case Engine::ThrottlePoint::DataTypeEng::TIME:
            throttle_control_value = stage_tsi;
            break;
        case Engine::ThrottlePoint::DataTypeEng::ALTITUDE:
            throttle_control_value = h;
            break;
        case Engine::ThrottlePoint::DataTypeEng::SPEED:
            throttle_control_value = total_velocity;
            break;
        }
    }

    const double current_mass_flow =
        rocket_.has_active_stage() ? rocket_.get_active_stage().get_current_mass_flow(throttle_control_value) : 0.0;
    deriv[DerivIndex::DM_DT] = -current_mass_flow;
    if (m <= kMinDynamicMassKg) {
        deriv[DerivIndex::DM_DT] = 0.0;
    }

    AtmospherePoint atmosphere_point;
    double gravity_accel;
    double air_drag_force;
    double parachute_drag_force = 0;

    update_cache_and_values(h, atmosphere_point, gravity_accel);

    if (v_vert < -1.0) {
        isAscending_ = false;
    } else if (v_vert > 1.0) {
        isAscending_ = true;
    }

    double mach = (atmosphere_point.sound_speed > 0.0) ? (total_velocity / atmosphere_point.sound_speed) : 0.0;
    if (!std::isfinite(mach)) { mach = 0.0; }

    if (isAscending_)
    {
        air_drag_force = 0.5 * atmosphere_point.density * total_velocity * total_velocity * fair_drag_model_.get_drag_coefficient(mach) * rocket_.get_current_cross_sectional_area();
    }
    else
    {
        air_drag_force = 0.5 * atmosphere_point.density * total_velocity * total_velocity * bottom_drag_model_.get_drag_coefficient(mach) * rocket_.get_current_cross_sectional_area();
    }

    const bool is_descending = (v_vert < 0.0) || !isAscending_;
    if (rocket_.has_parachute() && is_descending)
    {
        double parachute_control_value = tsi;
        switch (rocket_.get_parachute_value_type())
        {
        case Parachute::DataTypePar::TIME:
            parachute_control_value = tsi;
            break;
        case Parachute::DataTypePar::ALTITUDE:
            parachute_control_value = h;
            break;
        case Parachute::DataTypePar::SPEED:
            parachute_control_value = total_velocity;
            break;
        }

        const Parachute* active_parachute = rocket_.get_active_parachute(parachute_control_value);
        if (active_parachute != nullptr)
        {
            const DragModel& parachute_drag_model =
                active_parachute->get_isDrogue() ? drogue_parachute_drag_model_ : main_parachute_drag_model_;
            parachute_drag_force = 0.5 * atmosphere_point.density * total_velocity * total_velocity *
                parachute_drag_model.get_drag_coefficient(mach) * active_parachute->get_area();
        }
    }

    double pitch_control_value = tsi;
    switch (rocket_.get_pitch_value_type()) {
    case Rocket::PitchAnglePoint::DataTypePitch::TIME:
        pitch_control_value = tsi;
        break;
    case Rocket::PitchAnglePoint::DataTypePitch::ALTITUDE:
        pitch_control_value = h;
        break;
    case Rocket::PitchAnglePoint::DataTypePitch::SPEED:
        pitch_control_value = total_velocity;
        break;
    }
    double pitch_angle = rocket_.get_current_pitch_angle(pitch_control_value);
    last_pitch_angle_ = pitch_angle;

    double thrust =
        rocket_.has_active_stage() ? rocket_.get_active_stage().get_current_thrust(throttle_control_value) : 0.0;
    double thrust_vertical = thrust * std::sin(pitch_angle * std::numbers::pi / 180.0);
    double thrust_horizontal = thrust * std::cos(pitch_angle * std::numbers::pi / 180.0);

    double drag_vertical = 0;
    double drag_horizontal = 0;

    if (total_velocity > 0)
    {
        double total_drag_force = air_drag_force + parachute_drag_force;
        drag_vertical = total_drag_force * (v_vert / total_velocity);
        drag_horizontal = total_drag_force * (v_hor / total_velocity);
    }

    deriv[DerivIndex::DVVERT_DT] = (thrust_vertical - drag_vertical - (effective_mass * gravity_accel)) / effective_mass;
    deriv[DerivIndex::DVHOR_DT] = (thrust_horizontal - drag_horizontal) / effective_mass;
    last_acceleration_ = std::sqrt(deriv[DerivIndex::DVVERT_DT] * deriv[DerivIndex::DVVERT_DT] + deriv[DerivIndex::DVHOR_DT] * deriv[DerivIndex::DVHOR_DT]);

    return deriv;
}

void Physics::update_cache_and_values(double h, AtmospherePoint &atmosphere_point, double &gravity_accel) const
{
    if (cache_.is_initialized_ && std::abs(h - cache_.last_alt_) < cache_.last_precision_)
    {
        atmosphere_point = cache_.last_atmosphere_point_;
        gravity_accel = cache_.last_gravity_accel_;
    }
    else
    {
        double precision;
        if (h < 1000.0) { precision = 1.0; }
        else if (h < 10000.0 && h >= 1000) { precision = 10.0; }
        else { precision = 100.0; }

        double rounded_h = std::round(h / precision) * precision;
        cache_.last_alt_ = rounded_h;
        cache_.last_atmosphere_point_ = atmosphere_model_.get_atmosphere(rounded_h);
        cache_.last_precision_ = precision;

        const bool should_use_table_gravity =
            atmosphere_model_.has_table_gravity_for_altitude(rounded_h) &&
            std::isfinite(cache_.last_atmosphere_point_.gravity);

        if (should_use_table_gravity) {
            gravity_accel = cache_.last_atmosphere_point_.gravity;
        }
        else {
            double r_over_r_plus_h = cfg_.planet_radius_ / (cfg_.planet_radius_ + rounded_h);
            gravity_accel = cfg_.surface_gravity_ * r_over_r_plus_h * r_over_r_plus_h;
        }

        cache_.is_initialized_ = true;
        cache_.last_gravity_accel_ = gravity_accel;
        atmosphere_point = cache_.last_atmosphere_point_;
    }
}
