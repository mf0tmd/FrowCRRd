#include "engine.hpp"
#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace
{
    void validate_throttle_graph_types(const std::vector<Engine::ThrottlePoint>& points)
    {
        if (points.empty()) { return; }

        const auto expected_type = points.front().type_;
        for (const auto& point : points) {
            if (point.type_ != expected_type) {
                throw std::runtime_error("Engine throttle points must use a single data type.");
            }
        }
    }
}

Engine::Engine(std::string name, double thrust, double second_lose, double mass, std::vector<ThrottlePoint>&& throttle_graph) :
    name_(std::move(name)),
    thrust_(thrust),
    second_lose_(second_lose),
    mass_(mass),
    interpolator_dirty_(true),
    throttle_graph_(std::move(throttle_graph))
{
    validate_throttle_graph_types(throttle_graph_);
    std::sort(throttle_graph_.begin(), throttle_graph_.end());
}

void Engine::set_throttle_graph(std::vector<ThrottlePoint> throttle_graph)
{
    validate_throttle_graph_types(throttle_graph);
    throttle_graph_ = std::move(throttle_graph);
    std::sort(throttle_graph_.begin(), throttle_graph_.end());
    interpolator_dirty_ = true;
}

void Engine::set_basic_throttle_graph()
{
    throttle_graph_.clear();
    throttle_graph_.push_back(ThrottlePoint(ThrottlePoint::DataTypeEng::TIME, 1.0, 0.0));
    interpolator_dirty_ = true;
}

//getters


double Engine::get_current_thrust(double value)
{    
    if (throttle_graph_.empty()) { return std::max(0.0, thrust_); }

    if (throttle_graph_.size() < 4) {
        if (throttle_graph_.size() == 1) {
            return std::max(0.0, thrust_ * throttle_graph_.front().get_throttle());
        }

        if (value <= throttle_graph_.front().get_value()) {
            return std::max(0.0, thrust_ * throttle_graph_.front().get_throttle());
        }
        if (value >= throttle_graph_.back().get_value()) {
            return std::max(0.0, thrust_ * throttle_graph_.back().get_throttle());
        }

        for (std::size_t i = 1; i < throttle_graph_.size(); ++i) {
            if (value <= throttle_graph_[i].get_value()) {
                const double x0 = throttle_graph_[i - 1].get_value();
                const double x1 = throttle_graph_[i].get_value();
                const double y0 = throttle_graph_[i - 1].get_throttle();
                const double y1 = throttle_graph_[i].get_throttle();
                const double alpha = (x1 > x0) ? ((value - x0) / (x1 - x0)) : 0.0;
                return std::max(0.0, thrust_ * (y0 + alpha * (y1 - y0)));
            }
        }
    }

    build_interpolator();
    if (!interpolator_) {
        throw std::runtime_error("Engine throttle interpolator is not initialized.");
    }

    const double min_value = throttle_graph_.front().get_value();
    const double max_value = throttle_graph_.back().get_value();
    const double safe_value = std::isfinite(value) ? value : min_value;
    const double clamped_value = std::clamp(safe_value, min_value, max_value);

    return std::max(0.0, thrust_ * interpolator_.value()(clamped_value));
}

double Engine::get_current_second_lose(double value)
{
    if (get_full_thrust() <= 0.0) { return 0.0; }
    return get_current_thrust(value) * get_full_second_lose() / get_full_thrust();
}


void Engine::build_interpolator()
{
    if (!interpolator_dirty_ || throttle_graph_.size() < 4) return;

    for (std::size_t i = 1; i < throttle_graph_.size(); ++i) {
        if (throttle_graph_[i].get_value() <= throttle_graph_[i - 1].get_value()) {
            throw std::runtime_error("Engine throttle control points must be strictly increasing.");
        }
    }

    std::vector<double> values, levels;
    for (const auto& poi : throttle_graph_) 
    {
        values.push_back(poi.get_value());
        levels.push_back(poi.get_throttle());
    }

    interpolator_.emplace(std::move(values), std::move(levels));
    interpolator_dirty_ = false;
}
