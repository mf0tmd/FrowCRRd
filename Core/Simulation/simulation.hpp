#pragma once
#ifndef SIMULATION_HPP
#define SIMULATION_HPP

#include "Physics/physics.hpp"
#include "Models/Rocket/rocket.hpp"
#include "Physics/consts_ind.hpp"
#include <vector>
#include <eigen3/Eigen/Core>

struct TelemetryPoint 
{
public:
    double time;
    double altitude;
    double vert_velocity;
    double hor_velocity;
    double downrange_distance;
    double acceleration;
    double mass;
    double thrust;
    double mach;
    double pitch;
};

class Simulation final
{
public:
    Simulation(Rocket&& rocket);
    void run(double start_time, double end_time);

    constexpr double get_tsi() { return tsi_; }
    constexpr double get_burned_fuel_mass() { return burned_fuel_mass_; }
    const std::vector<TelemetryPoint>& get_telemetry_points() const noexcept { return telemetry_points_; }

private:
    const Config& cfg_;
    Rocket rocket_;
    Physics physics_;
    Eigen::VectorXd state_;
    double burned_fuel_mass_;
    int ind_stage_now_;
    double tsi_; // time since ignition
    double stage_tsi_; // time since current stage ignition
    bool has_run_;
    
    std::vector<TelemetryPoint> telemetry_points_;
    
    void boost_odeint_integrate();
    double get_stage_throttle_control_value();
    void write_telemetry();
};

#endif // SIMULATION_HPP
