#include "simulation.hpp"
#include "Configs/config.hpp"
#include <boost/numeric/odeint.hpp>
#include <boost/numeric/odeint/external/eigen/eigen.hpp>
#include <eigen3/Eigen/Core>
#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace
{
    constexpr double kMinStateMassKg = 1.0;
}

void Simulation::boost_odeint_integrate()
{
    namespace odeint = boost::numeric::odeint;
    const double tsi_now = tsi_;
    const double stage_tsi_now = stage_tsi_;
    
    Eigen::VectorXd state(5);
    state << state_[StateIndex::ALTITUDE], 
            state_[StateIndex::VERTICAL_VEL], 
            state_[StateIndex::HORIZONTAL_VEL], 
            state_[StateIndex::DOWNRANGE_DIST], 
            state_[StateIndex::MASS];

    using OdeStepper = odeint::runge_kutta_fehlberg78<
        Eigen::VectorXd,
        double,
        Eigen::VectorXd,
        double,
        odeint::vector_space_algebra
    >;
    auto stepper = odeint::make_controlled(1e-12, 1e-12, OdeStepper());

    odeint::integrate_adaptive(stepper,
        [this, tsi_now, stage_tsi_now](const Eigen::VectorXd& state_vec, Eigen::VectorXd& derivs, double t)
        {
            derivs = physics_.calculate_derivatives(state_vec, tsi_now + t, stage_tsi_now + t);
        },
        state, 0.0, cfg_.time_step_, cfg_.time_step_
    );
    
    state_[StateIndex::ALTITUDE] = state[0];
    state_[StateIndex::VERTICAL_VEL] = state[1];
    state_[StateIndex::HORIZONTAL_VEL] = state[2];
    state_[StateIndex::DOWNRANGE_DIST] = state[3];
    state_[StateIndex::MASS] = std::max(kMinStateMassKg, state[4]);
}

Simulation::Simulation(Rocket&& rocket) :
cfg_(Config::get()),
rocket_(std::move(rocket)),
physics_(rocket_),
state_(5),
burned_fuel_mass_(0.0),
ind_stage_now_(0),
tsi_(0.0),
stage_tsi_(0.0),
has_run_(false)
{
    state_[StateIndex::ALTITUDE] = 0.0;
    state_[StateIndex::VERTICAL_VEL] = 0.0;
    state_[StateIndex::HORIZONTAL_VEL] = 0.0;
    state_[StateIndex::DOWNRANGE_DIST] = 0.0;
    state_[StateIndex::MASS] = std::max(kMinStateMassKg, rocket_.get_mass());
}

void Simulation::run(double start_time, double end_time)
{
    if (has_run_) {
        throw std::runtime_error("Simulation::run can only be called once per Simulation instance.");
    }
    has_run_ = true;

    tsi_ = start_time;
    stage_tsi_ = 0.0;

    for (double t = start_time; t <= end_time; t += cfg_.time_step_)
    {
        if (!rocket_.is_fair_dropped() && rocket_.is_fair_complete(ind_stage_now_, tsi_, state_[StateIndex::ALTITUDE])) {
            rocket_.drop_fair();
            state_[StateIndex::MASS] = std::max(kMinStateMassKg, state_[StateIndex::MASS] - rocket_.get_fairing_mass());
        }

        if (rocket_.has_active_stage()) {
            Stage& active_stage = rocket_.get_active_stage();
            const double fuel_left = active_stage.get_fuel_mass(burned_fuel_mass_);
            if (!active_stage.is_shutdown() && fuel_left <= 0.0) {
                // Engines cannot keep producing thrust after tank depletion.
                active_stage.shutdown();
            }
        }

        if (rocket_.has_active_stage() && rocket_.get_active_stage().is_stage_complete(stage_tsi_, burned_fuel_mass_, state_[StateIndex::ALTITUDE]))
        {
            if (rocket_.can_separate_stage()) {
                rocket_.next_stage();
                const double new_mass = rocket_.get_mass();
                state_[StateIndex::MASS] = (new_mass > kMinStateMassKg) ? new_mass : std::max(state_[StateIndex::MASS], kMinStateMassKg);
                burned_fuel_mass_ = 0.0;
                stage_tsi_ = 0.0;
                ++ind_stage_now_;
            }
            else if (!rocket_.get_active_stage().is_shutdown()) {
                rocket_.shutdown_active_stage();
            }
        }

        const double mass_before_step = state_[StateIndex::MASS];
        const double available_fuel_before_step = rocket_.has_active_stage()
            ? std::max(0.0, rocket_.get_active_stage().get_fuel_mass(burned_fuel_mass_))
            : 0.0;
        boost_odeint_integrate();
        double burned_this_step = std::max(0.0, mass_before_step - state_[StateIndex::MASS]);

        if (rocket_.has_active_stage()) {
            burned_this_step = std::min(burned_this_step, available_fuel_before_step);
            const double min_mass_after_burn = std::max(kMinStateMassKg, mass_before_step - burned_this_step);
            if (state_[StateIndex::MASS] < min_mass_after_burn) {
                state_[StateIndex::MASS] = min_mass_after_burn;
            }
        }

        burned_fuel_mass_ += burned_this_step;
        tsi_ += cfg_.time_step_;
        stage_tsi_ += cfg_.time_step_;
        write_telemetry();
    }
    
}


double Simulation::get_stage_throttle_control_value()
{
    if (!rocket_.has_active_stage()) {
        return stage_tsi_;
    }

    const auto type = rocket_.get_active_stage().get_throttle_value_type();
    switch (type) {
    case Engine::ThrottlePoint::DataTypeEng::TIME:
        return stage_tsi_;
    case Engine::ThrottlePoint::DataTypeEng::ALTITUDE:
        return state_[StateIndex::ALTITUDE];
    case Engine::ThrottlePoint::DataTypeEng::SPEED:
        return std::sqrt(
            state_[StateIndex::VERTICAL_VEL] * state_[StateIndex::VERTICAL_VEL] +
            state_[StateIndex::HORIZONTAL_VEL] * state_[StateIndex::HORIZONTAL_VEL]
        );
    }
    return stage_tsi_;
}


void Simulation::write_telemetry()
{
    const AtmospherePoint atmosphere_point = physics_.get_last_atmosphere_point();
    const double total_velocity = std::sqrt(
        state_[StateIndex::VERTICAL_VEL] * state_[StateIndex::VERTICAL_VEL] +
        state_[StateIndex::HORIZONTAL_VEL] * state_[StateIndex::HORIZONTAL_VEL]
    );
    const double mach = (atmosphere_point.sound_speed > 0.0) ? (total_velocity / atmosphere_point.sound_speed) : 0.0;

    telemetry_points_.push_back
    (
        TelemetryPoint 
        {
            tsi_,
            state_[StateIndex::ALTITUDE],
            state_[StateIndex::VERTICAL_VEL],
            state_[StateIndex::HORIZONTAL_VEL],
            state_[StateIndex::DOWNRANGE_DIST],
            physics_.get_last_acceleration(),
            state_[StateIndex::MASS],
            rocket_.has_active_stage() ? rocket_.get_active_stage().get_current_thrust(get_stage_throttle_control_value()) : 0.0,
            mach,
            physics_.get_last_pitch_angle()
        }
    );
}
