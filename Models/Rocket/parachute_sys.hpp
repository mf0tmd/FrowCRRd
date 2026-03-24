#pragma once
#ifndef PARACHUTE_SYS_HPP
#define PARACHUTE_SYS_HPP

#include <string>
#include <vector>
#include <limits>
#include <utility>

class Parachute final
{
public:
    enum struct DataTypePar
    {
        TIME,
        ALTITUDE,
        SPEED
    };
    
    Parachute(DataTypePar value_type, bool isDrogue, double area, std::pair<double, double> deploy_range);

    DataTypePar value_type_;
    constexpr std::pair<double, double> get_deploy_range() const noexcept { return deploy_range_; }
    constexpr bool get_isDrogue() const noexcept { return isDrogue_; }
    constexpr double get_area() const noexcept { return area_; }
private:
    bool isDrogue_;
    std::pair<double, double> deploy_range_;

    double area_;
};

#endif // PARACHUTE_SYS_HPP
