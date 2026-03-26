#pragma once
#ifndef ENGINE_HPP
#define ENGINE_HPP
#include <string>
#include <vector>
#include <optional>
#include <utility>
#include <boost/math/interpolators/makima.hpp>

using makima_inter = boost::math::interpolators::makima<std::vector<double>>;

class Engine final
{
public:
    class ThrottlePoint
    {
    private:
        double value_;
        double throttle_;
    public:
        enum struct DataTypeEng
        {
            TIME,
            ALTITUDE,
            SPEED
        };

        ThrottlePoint(DataTypeEng type, double throttle, double value) noexcept :
        value_(value),
        throttle_(throttle),
        type_(type) {}
         
        constexpr double get_value() const noexcept { return value_; }
        constexpr double get_throttle() const noexcept { return throttle_; }
        DataTypeEng type_;

        bool operator<(const ThrottlePoint& other) const {
            return value_ < other.value_;
        }
    };

    Engine(std::string name, double thrust, double second_lose, double mass, std::vector<ThrottlePoint>&& throttle_graph);

    //setters
    void set_throttle_graph(std::vector<ThrottlePoint> throttle_graph);
    void set_basic_throttle_graph();
    void set_name(std::string name) noexcept { name_ = name; }

    //getters
    constexpr std::string get_name() const noexcept { return name_; }
    constexpr double get_full_thrust() const noexcept { return thrust_; }
    constexpr double get_mass() const noexcept { return mass_; }
    constexpr double get_full_second_lose() const noexcept { return second_lose_; }
    constexpr ThrottlePoint::DataTypeEng get_throttle_value_type() const noexcept { return throttle_graph_.empty() ? ThrottlePoint::DataTypeEng::TIME : throttle_graph_.front().type_; }

    double get_current_thrust(double value);
    double get_current_second_lose(double value);

private:
    std::string name_;
    double thrust_;
    double second_lose_;
    double mass_;
    bool interpolator_dirty_;

    std::vector<ThrottlePoint> throttle_graph_;
    std::optional<makima_inter> interpolator_;
    
    void build_interpolator();
};

#endif // ENGINE_HPP
