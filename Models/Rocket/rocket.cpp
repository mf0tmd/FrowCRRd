#include "rocket.hpp"

#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace
{
    void validate_pitch_graph_types(const std::vector<Rocket::PitchAnglePoint>& points)
    {
        if (points.empty()) { return; }

        const auto expected_type = points.front().type_;
        for (const auto& point : points) {
            if (point.type_ != expected_type) {
                throw std::runtime_error("Pitch control points must use a single data type.");
            }
        }
    }

    bool is_increasing_range(const std::pair<double, double>& range) noexcept
    {
        return range.first <= range.second;
    }

    bool should_cut_parachute(double value, const std::pair<double, double>& range) noexcept
    {
        return is_increasing_range(range) ? (value >= range.second) : (value <= range.second);
    }

    bool should_deploy_parachute(double value, const std::pair<double, double>& range) noexcept
    {
        return is_increasing_range(range) ? (value >= range.first) : (value <= range.first);
    }
}

Rocket::Rocket(std::list<Stage>&& stages, fSeparationMode&& fsep_mode, double fairing_mass, double fsep_value, std::vector<PitchAnglePoint>&& angle_graph) :
    stages_(std::move(stages)),
    fairing_mass_(fairing_mass),
    fsep_value_(fsep_value),
    fair_has_dropped_(false),
    fsep_mode_(std::move(fsep_mode)),
    angle_graph_(std::move(angle_graph)),
    interpolator_dirty_(true)
{
    validate_pitch_graph_types(angle_graph_);
    std::sort(angle_graph_.begin(), angle_graph_.end());
}

void Rocket::add_parachute(Parachute parachute)
{
    if (!parachutes_.empty() && parachutes_.front().value_type_ != parachute.value_type_) {
        throw std::runtime_error("All parachutes must use the same control data type.");
    }
    parachutes_.push_back(std::move(parachute));
}

void Rocket::shutdown_active_stage()
{
    if (!stages_.empty()) {
        stages_.front().shutdown();
    }
}

void Rocket::set_angle_graph(std::vector<PitchAnglePoint> angle_graph)
{
    validate_pitch_graph_types(angle_graph);
    angle_graph_ = std::move(angle_graph);
    std::sort(angle_graph_.begin(), angle_graph_.end());
    interpolator_dirty_ = true;
}

void Rocket::set_basic_angle_graph()
{
    angle_graph_.clear();
    angle_graph_.push_back(PitchAnglePoint(PitchAnglePoint::DataTypePitch::TIME, 90, 0.0));
    interpolator_dirty_ = true;
}

double Rocket::get_current_pitch_angle(double value)
{
    if (angle_graph_.empty()) { return 90.0; }

    if (angle_graph_.size() < 4) {
        if (angle_graph_.size() == 1) {
            return angle_graph_.front().get_angle();
        }

        if (value <= angle_graph_.front().get_value()) {
            return angle_graph_.front().get_angle();
        }
        if (value >= angle_graph_.back().get_value()) {
            return angle_graph_.back().get_angle();
        }

        for (std::size_t i = 1; i < angle_graph_.size(); ++i) {
            if (value <= angle_graph_[i].get_value()) {
                const double x0 = angle_graph_[i - 1].get_value();
                const double x1 = angle_graph_[i].get_value();
                const double y0 = angle_graph_[i - 1].get_angle();
                const double y1 = angle_graph_[i].get_angle();
                const double alpha = (x1 > x0) ? ((value - x0) / (x1 - x0)) : 0.0;
                return y0 + alpha * (y1 - y0);
            }
        }
    }

    build_interpolator();
    if (!interpolator_) {
        throw std::runtime_error("Pitch angle interpolator is not initialized.");
    }

    const double min_value = angle_graph_.front().get_value();
    const double max_value = angle_graph_.back().get_value();
    const double safe_value = std::isfinite(value) ? value : min_value;
    const double clamped_value = std::clamp(safe_value, min_value, max_value);

    return interpolator_.value()(clamped_value);
}

double Rocket::get_mass() const
{
    double total = fair_has_dropped_ ? 0.0 : fairing_mass_;
    for (const auto& item : stages_) {
        total += item.get_mass();
    }

    return total;
}

Stage& Rocket::get_active_stage()
{
    if (stages_.empty()) {
        throw std::runtime_error("No active stages");
    }
    return stages_.front();
}

double Rocket::get_current_cross_sectional_area() const
{
    if (stages_.empty()) return 0.0;

    auto max_it = std::max_element(
        stages_.begin(),
        stages_.end(),
        [](const Stage& a, const Stage& b) {
            return a.get_cross_sectional_area() < b.get_cross_sectional_area();
        }
    );

    return (max_it != stages_.end()) ? max_it->get_cross_sectional_area() : 0.0;
}

bool Rocket::is_fair_complete(int ind_stage_now, double time_since_ignition, double alt) const noexcept
{
    switch (fsep_mode_) {
    case fSeparationMode::ByStage: return ind_stage_now >= fsep_value_;
    case fSeparationMode::ByTime: return time_since_ignition >= fsep_value_;
    case fSeparationMode::ByAltitude: return alt >= fsep_value_;
    default: return false;
    }
}

const Parachute* Rocket::get_active_parachute(double value) const noexcept
{
    for (const auto& parachute : parachutes_) {
        const auto range = parachute.get_deploy_range();
        if (should_cut_parachute(value, range)) {
            continue;
        }
        if (should_deploy_parachute(value, range)) {
            return &parachute;
        }
    }

    return nullptr;
}

void Rocket::build_interpolator()
{
    if (!interpolator_dirty_ || angle_graph_.size() < 4) return;

    for (std::size_t i = 1; i < angle_graph_.size(); ++i) {
        if (angle_graph_[i].get_value() <= angle_graph_[i - 1].get_value()) {
            throw std::runtime_error("Pitch control points must be strictly increasing.");
        }
    }

    std::vector<double> values;
    std::vector<double> angles;
    values.reserve(angle_graph_.size());
    angles.reserve(angle_graph_.size());

    for (const auto& p : angle_graph_) {
        values.push_back(p.get_value());
        angles.push_back(p.get_angle());
    }

    interpolator_.emplace(std::move(values), std::move(angles));
    interpolator_dirty_ = false;
}
