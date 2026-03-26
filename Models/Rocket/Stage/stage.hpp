#pragma once
#ifndef STAGE_HPP
#define STAGE_HPP
#include "Engine/engine.hpp"
#include "Tank/tank.hpp"
#include <optional>

enum class SeparationMode 
{
    ByFuel,
    ByTime,
    ByAltitude
};

class Stage final
{
public:
    Stage(std::vector<Engine>&& engines, Tank&& tank, SeparationMode&& sep_mode, double structural_mass, double payload_mass, double cross_sectional_area, double sep_value);
    Stage() = delete;

    //getters
    double get_mass() const;
    double get_current_mass_flow(double time_since_ignition);
    double get_current_thrust(double time_since_ignition);
    Engine::ThrottlePoint::DataTypeEng get_throttle_value_type() const noexcept;
    void shutdown() noexcept { is_shutdown_ = true; }
    bool is_shutdown() const noexcept { return is_shutdown_; }

    constexpr double get_fuel_mass(double burned_fuel_mass) const noexcept { return tank_->get_fuel_mass() - burned_fuel_mass; }
    constexpr double get_full_thrust() const noexcept { return thrust_; }
    constexpr double get_full_mass_flow() const noexcept { return mass_flow_; }
    constexpr double get_cross_sectional_area() const noexcept { return cross_sectional_area_; }

    constexpr std::string get_name() const noexcept { return name_; }
    bool is_stage_complete(double time_since_ignition, double burned_fuel_mass, double alt) const noexcept;

private:
    std::string name_;
    std::optional<std::vector<Engine>> engines_;
    std::optional<Tank> tank_;
    SeparationMode sep_mode_;
    double structural_mass_;
    double payload_mass_;
    double thrust_;
    double mass_flow_;
    double cross_sectional_area_;
    double sep_value_;
    bool is_shutdown_ = false;
};

#endif // STAGE_HPP
