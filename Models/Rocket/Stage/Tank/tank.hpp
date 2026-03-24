#pragma once
#ifndef TANK_HPP
#define TANK_HPP
#include <string>

class Tank final
{
public:
    Tank(std::string name, double dry_mass, double fuel_mass) noexcept;

    //setters
    void set_name(std::string name) noexcept { name_ = name; };

    //getters
    constexpr std::string get_name() const noexcept { return name_; }
    constexpr double get_dry_mass() const noexcept { return dry_mass_; }
    constexpr double get_fuel_mass() const noexcept { return fuel_mass_; }
private:
    std::string name_;
    double dry_mass_;
    double fuel_mass_;
};

#endif // TANK_HPP