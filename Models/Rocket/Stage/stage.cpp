#include "stage.hpp"
#include <stdexcept>

namespace
{
    void validate_engine_control_types(const std::vector<Engine>& engines)
    {
        if (engines.empty()) { return; }

        const auto expected_type = engines.front().get_throttle_value_type();
        for (const auto& engine : engines) {
            if (engine.get_throttle_value_type() != expected_type) {
                throw std::runtime_error("All engines in a stage must use the same throttle data type.");
            }
        }
    }
}

Stage::Stage(std::vector<Engine>&& engines, Tank&& tank, SeparationMode&& separation_mode, double structural_mass, double payload_mass, double cross_sectional_area, double separation_value) :
    engines_(std::move(engines)), 
    tank_(std::move(tank)),
    sep_mode_(std::move(separation_mode)),
    structural_mass_(structural_mass), 
    payload_mass_(payload_mass),
    thrust_(0),
    mass_flow_(0),
    cross_sectional_area_(cross_sectional_area),
    sep_value_(separation_value) 
{
    validate_engine_control_types(*engines_);

    for (Engine &item : *engines_)
    { 
        thrust_ += item.get_full_thrust();
        mass_flow_ += item.get_full_second_lose();
    }
}


double Stage::get_mass() const {
    double total = structural_mass_ + payload_mass_ + tank_->get_dry_mass() + tank_->get_fuel_mass();
    for (const auto& item : *engines_) { total += item.get_mass(); }
    return total;
}

double Stage::get_current_mass_flow(double value) {
    if (is_shutdown_) { return 0.0; }

    double current_mf = 0;
    for (auto& item : *engines_) {current_mf += item.get_current_second_lose(value); }
    return current_mf;
}

double Stage::get_current_thrust(double value) {
    if (is_shutdown_) { return 0.0; }

    double current_th = 0;
    for (auto& item : *engines_) { current_th += item.get_current_thrust(value); }
    return current_th;
}

Engine::ThrottlePoint::DataTypeEng Stage::get_throttle_value_type() const noexcept {
    if (!engines_ || engines_->empty()) {
        return Engine::ThrottlePoint::DataTypeEng::TIME;
    }
    return engines_->front().get_throttle_value_type();
}

bool Stage::is_stage_complete(double time_since_ignition, double burned_fuel_mass, double alt) const noexcept {
    switch (sep_mode_) {
    case SeparationMode::ByFuel: return get_fuel_mass(burned_fuel_mass) <= 0.0;
    case SeparationMode::ByTime: return time_since_ignition >= sep_value_;
    case SeparationMode::ByAltitude: return alt >= sep_value_;
    default: return false;
    }
}
