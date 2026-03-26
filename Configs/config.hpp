#pragma once
#ifndef CONFIG_HPP
#define CONFIG_HPP

#include "common_inl.hpp"

#include <string>
#include <stdexcept>
#include <unordered_map>
#include <boost/property_tree/ptree.hpp>
#include <boost/property_tree/json_parser.hpp>

struct AtmosphereProfile final
{
    std::string data_path_;
    double planet_radius_ = 0.0;
    double surface_gravity_ = 0.0;
};

class Config final
{
public:
    static const Config& get() 
    {
        static Config instance = load();
        return instance;
    }

    // static constexpr double ignore_val_ = -1e100;
    
    double time_step_;
    double planet_radius_;
    double surface_gravity_;
    std::string atmosphere_path_;
    std::string active_atmosphere_profile_;
    std::unordered_map<std::string, AtmosphereProfile> atmosphere_profiles_;
    std::string fair_drag_table_path_;
    std::string bottom_drag_table_path_;
    std::string main_parachute_;
    std::string drogue_parachute_;

    ALWAYS_INLINE const std::string& get_active_atmosphere_path() const noexcept { return atmosphere_path_; }
    ALWAYS_INLINE bool has_atmosphere_profile(const std::string& profile_name) const noexcept
    {
        return atmosphere_profiles_.find(profile_name) != atmosphere_profiles_.end();
    }
    ALWAYS_INLINE const AtmosphereProfile& get_atmosphere_profile(const std::string& profile_name) const
    {
        const auto it = atmosphere_profiles_.find(profile_name);
        if (it == atmosphere_profiles_.end()) {
            throw std::runtime_error("Unknown atmosphere profile: " + profile_name);
        }
        return it->second;
    }

private:
    Config() noexcept {};
    
    static Config load(const std::string& filename = "Configs/config.json");
};

#endif // CONFIG_HPP
