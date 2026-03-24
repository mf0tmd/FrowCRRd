#pragma once
#ifndef ROCKET_HPP
#define ROCKET_HPP
#include "Configs/common_inl.hpp"
#include "Stage/stage.hpp"
#include "parachute_sys.hpp"
#include <list>
#include <optional>
#include <stdexcept>

enum class fSeparationMode
{
    ByStage,
    ByTime,
    ByAltitude
};

class Rocket final
{
public:
    class PitchAnglePoint
    {
    private:
        double value_;
        double angle_;
    public:
        enum struct DataTypePitch
        {
            TIME,
            ALTITUDE,
            SPEED
        };

        PitchAnglePoint(DataTypePitch type, double angle, double value) noexcept :
        value_(value),
        angle_(angle),
        type_(type) {}
         
        constexpr double get_value() const noexcept { return value_; }
        constexpr double get_angle() const noexcept { return angle_; }
        DataTypePitch type_;

        bool operator<(const PitchAnglePoint& other) const {
            return value_ < other.value_;
        }
    };

    Rocket(std::list<Stage>&& stages, fSeparationMode&& fsep_mode, double fairing_mass, double fsep_value, std::vector<PitchAnglePoint>&& angle_graph);

    void next_stage() { if (!stages_.empty()) { stages_.pop_front(); } }
    void add_parachute(Parachute parachute);
    void shutdown_active_stage();
    bool can_separate_stage() const noexcept { return stages_.size() > 1; }

    ALWAYS_INLINE void drop_fair() noexcept { fair_has_dropped_ = true; }
    const Parachute* get_active_parachute(double value) const noexcept;

    //setters
    void set_angle_graph(std::vector<PitchAnglePoint> angle_graph);
    void set_basic_angle_graph();

    //getters
    double get_mass() const;
    bool has_active_stage() const noexcept { return !stages_.empty(); }
    bool has_parachute() const noexcept { return !parachutes_.empty(); }
    Stage& get_active_stage();
    double get_current_cross_sectional_area() const;
    bool is_fair_complete(int ind_stage_now, double time_since_ignition, double alt) const noexcept;
    constexpr PitchAnglePoint::DataTypePitch get_pitch_value_type() const noexcept { return angle_graph_.empty() ? PitchAnglePoint::DataTypePitch::TIME : angle_graph_.front().type_; }
    double get_current_pitch_angle(double value);
    Parachute::DataTypePar get_parachute_value_type() const noexcept { return parachutes_.empty() ? Parachute::DataTypePar::TIME : parachutes_.front().value_type_; }
    constexpr double get_fairing_mass() const noexcept { return fairing_mass_; }
    constexpr bool is_fair_dropped() const noexcept { return fair_has_dropped_; }
    
private:
    std::list<Stage> stages_;
    double fairing_mass_;
    double fsep_value_ = 0.0;
    bool fair_has_dropped_ = false;
    fSeparationMode fsep_mode_;
    std::list<Parachute> parachutes_;
    std::vector<PitchAnglePoint> angle_graph_;
    bool interpolator_dirty_;
    std::optional<makima_inter> interpolator_;

    void build_interpolator();
};

#endif // ROCKET_HPP
