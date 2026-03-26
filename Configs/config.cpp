#include "config.hpp"
#include <cmath>
#include <stdexcept>
#include <utility>

Config Config::load(const std::string& filename) 
{
    Config cfg;
    
    try {
        boost::property_tree::ptree pt;
        boost::property_tree::read_json(filename, pt);
        
        cfg.time_step_ = pt.get<double>("simulation.time_step");
        if (!std::isfinite(cfg.time_step_) || cfg.time_step_ <= 0.0) {
            throw std::runtime_error("simulation.time_step must be a finite positive value.");
        }
        cfg.active_atmosphere_profile_ = pt.get<std::string>("atmosphere.active_profile", "");

        if (const auto profiles = pt.get_child_optional("atmosphere.profiles")) {
            for (const auto& [name, node] : *profiles) {
                AtmosphereProfile profile;
                profile.data_path_ = node.get<std::string>("data_path");
                profile.planet_radius_ = node.get<double>("planet_radius");
                profile.surface_gravity_ = node.get<double>("surface_gravity");
                cfg.atmosphere_profiles_.emplace(name, std::move(profile));
            }
        }

        if (cfg.active_atmosphere_profile_.empty()) {
            throw std::runtime_error("atmosphere.active_profile must be set.");
        }

        const auto active_it = cfg.atmosphere_profiles_.find(cfg.active_atmosphere_profile_);
        if (active_it == cfg.atmosphere_profiles_.end()) {
            throw std::runtime_error(
                "Unknown active atmosphere profile: " + cfg.active_atmosphere_profile_);
        }

        cfg.atmosphere_path_ = active_it->second.data_path_;
        cfg.planet_radius_ = active_it->second.planet_radius_;
        cfg.surface_gravity_ = active_it->second.surface_gravity_;

        if (cfg.atmosphere_path_.empty()) {
            throw std::runtime_error("Active atmosphere profile has empty data_path.");
        }
        if (cfg.planet_radius_ <= 0.0) {
            throw std::runtime_error("Active atmosphere profile has invalid planet_radius.");
        }
        if (cfg.surface_gravity_ <= 0.0) {
            throw std::runtime_error("Active atmosphere profile has invalid surface_gravity.");
        }

        cfg.fair_drag_table_path_ = pt.get<std::string>("files.fair_drag_table");
        cfg.bottom_drag_table_path_ = pt.get<std::string>("files.bottom_drag_table");
        cfg.main_parachute_ = pt.get<std::string>("files.main_parachute_drag_table");
        cfg.drogue_parachute_ = pt.get<std::string>("files.drogue_parachute_drag_table");
        
    } 
    catch (const std::exception& ex) 
    {
        throw std::runtime_error("Failed to load config: " + std::string(ex.what()));
    }
    
    return cfg;
}
