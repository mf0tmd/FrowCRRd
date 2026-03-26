#include "Core/Simulation/simulation.hpp"
#include "Core/Physics/physics.hpp"
#include "Core/Physics/consts_ind.hpp"
#include "Configs/config.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <exception>
#include <iomanip>
#include <iostream>
#include <list>
#include <random>
#include <sstream>
#include <string>
#include <vector>

namespace
{
    struct AuditContext
    {
        std::uint64_t checks = 0;
        std::uint64_t failures = 0;
        std::vector<std::string> messages;

        void check(bool condition, const std::string& message)
        {
            ++checks;
            if (!condition) {
                ++failures;
                if (messages.size() < 100) {
                    messages.push_back(message);
                }
            }
        }
    };

    bool finite(double value) noexcept
    {
        return std::isfinite(value);
    }

    bool finite_telemetry(const TelemetryPoint& p) noexcept
    {
        return finite(p.time) &&
            finite(p.altitude) &&
            finite(p.vert_velocity) &&
            finite(p.hor_velocity) &&
            finite(p.downrange_distance) &&
            finite(p.acceleration) &&
            finite(p.mass) &&
            finite(p.thrust) &&
            finite(p.mach);
    }

    std::vector<Engine::ThrottlePoint> make_throttle_graph(
        Engine::ThrottlePoint::DataTypeEng type,
        const std::array<double, 4>& levels)
    {
        std::array<double, 4> values{};
        switch (type) {
        case Engine::ThrottlePoint::DataTypeEng::TIME:
            values = { 0.0, 1.0, 2.0, 3.0 };
            break;
        case Engine::ThrottlePoint::DataTypeEng::ALTITUDE:
            values = { 0.0, 1000.0, 5000.0, 12000.0 };
            break;
        case Engine::ThrottlePoint::DataTypeEng::SPEED:
            values = { 0.0, 120.0, 450.0, 1200.0 };
            break;
        }

        std::vector<Engine::ThrottlePoint> graph;
        graph.reserve(values.size());
        for (std::size_t i = 0; i < values.size(); ++i) {
            graph.emplace_back(type, levels[i], values[i]);
        }
        return graph;
    }

    std::vector<Rocket::PitchAnglePoint> make_pitch_graph(
        Rocket::PitchAnglePoint::DataTypePitch type,
        const std::array<double, 4>& angles)
    {
        std::array<double, 4> values{};
        switch (type) {
        case Rocket::PitchAnglePoint::DataTypePitch::TIME:
            values = { 0.0, 5.0, 15.0, 30.0 };
            break;
        case Rocket::PitchAnglePoint::DataTypePitch::ALTITUDE:
            values = { 0.0, 1000.0, 7000.0, 20000.0 };
            break;
        case Rocket::PitchAnglePoint::DataTypePitch::SPEED:
            values = { 0.0, 150.0, 600.0, 1800.0 };
            break;
        }

        std::vector<Rocket::PitchAnglePoint> graph;
        graph.reserve(values.size());
        for (std::size_t i = 0; i < values.size(); ++i) {
            graph.emplace_back(type, angles[i], values[i]);
        }
        return graph;
    }

    Stage make_stage(
        const std::string& name_prefix,
        Engine::ThrottlePoint::DataTypeEng throttle_type,
        double thrust,
        double mass_flow,
        double engine_mass,
        double tank_dry_mass,
        double tank_fuel_mass,
        double structural_mass,
        double payload_mass,
        double cross_section_area,
        SeparationMode sep_mode,
        double sep_value,
        const std::array<double, 4>& throttle_levels)
    {
        std::vector<Engine> engines;
        engines.emplace_back(
            name_prefix + "_eng",
            thrust,
            mass_flow,
            engine_mass,
            make_throttle_graph(throttle_type, throttle_levels));

        Tank tank(name_prefix + "_tank", tank_dry_mass, tank_fuel_mass);
        return Stage(
            std::move(engines),
            std::move(tank),
            std::move(sep_mode),
            structural_mass,
            payload_mass,
            cross_section_area,
            sep_value);
    }

    void verify_telemetry(const std::vector<TelemetryPoint>& telemetry, AuditContext& ctx, const std::string& tag)
    {
        ctx.check(!telemetry.empty(), tag + ": telemetry is empty");
        if (telemetry.empty()) {
            return;
        }

        for (std::size_t i = 0; i < telemetry.size(); ++i) {
            const auto& p = telemetry[i];
            ctx.check(finite_telemetry(p), tag + ": non-finite telemetry at i=" + std::to_string(i));
            ctx.check(p.mass >= 1.0 - 1e-9, tag + ": mass below floor at i=" + std::to_string(i));
            ctx.check(p.thrust >= -1e-9, tag + ": negative thrust at i=" + std::to_string(i));
            ctx.check(p.mach >= -1e-9, tag + ": negative mach at i=" + std::to_string(i));
            ctx.check(std::abs(p.altitude) < 1e9, tag + ": altitude exploded at i=" + std::to_string(i));
            ctx.check(std::abs(p.vert_velocity) < 2e6, tag + ": vertical velocity exploded at i=" + std::to_string(i));
            ctx.check(std::abs(p.hor_velocity) < 2e6, tag + ": horizontal velocity exploded at i=" + std::to_string(i));
            ctx.check(std::abs(p.acceleration) < 2e6, tag + ": acceleration exploded at i=" + std::to_string(i));

            if (i > 0) {
                const auto& prev = telemetry[i - 1];
                ctx.check(p.time > prev.time, tag + ": non-increasing time at i=" + std::to_string(i));
                ctx.check(p.mass <= prev.mass + 1e-8, tag + ": mass increased at i=" + std::to_string(i));
            }
        }
    }

    void atmosphere_and_drag_checks(AuditContext& ctx)
    {
        const Config& cfg = Config::get();
        AtmosphereModel atmosphere(cfg.get_active_atmosphere_path());
        DragModel fair(cfg.fair_drag_table_path_);
        DragModel bottom(cfg.bottom_drag_table_path_);
        DragModel main_chute(cfg.main_parachute_);
        DragModel drogue_chute(cfg.drogue_parachute_);

        double prev_density = std::numeric_limits<double>::quiet_NaN();
        double prev_pressure = std::numeric_limits<double>::quiet_NaN();

        for (double altitude = -1000.0; altitude <= 150000.0; altitude += 250.0) {
            AtmospherePoint p = atmosphere.get_atmosphere(altitude);
            ctx.check(finite(p.temperature), "Atmosphere: non-finite temperature at h=" + std::to_string(altitude));
            ctx.check(finite(p.gravity), "Atmosphere: non-finite gravity at h=" + std::to_string(altitude));
            ctx.check(finite(p.pressure), "Atmosphere: non-finite pressure at h=" + std::to_string(altitude));
            ctx.check(finite(p.density), "Atmosphere: non-finite density at h=" + std::to_string(altitude));
            ctx.check(finite(p.viscosity), "Atmosphere: non-finite viscosity at h=" + std::to_string(altitude));
            ctx.check(finite(p.sound_speed), "Atmosphere: non-finite sound speed at h=" + std::to_string(altitude));

            ctx.check(p.density >= 0.0, "Atmosphere: negative density at h=" + std::to_string(altitude));
            ctx.check(p.pressure >= 0.0, "Atmosphere: negative pressure at h=" + std::to_string(altitude));
            ctx.check(p.viscosity >= 0.0, "Atmosphere: negative viscosity at h=" + std::to_string(altitude));
            ctx.check(p.sound_speed > 0.0, "Atmosphere: non-positive sound speed at h=" + std::to_string(altitude));
            ctx.check(p.gravity > 0.0, "Atmosphere: non-positive gravity at h=" + std::to_string(altitude));

            if (altitude >= 0.0 && altitude <= 80000.0) {
                if (finite(prev_density)) {
                    ctx.check(
                        p.density <= prev_density * 1.05 + 1e-12,
                        "Atmosphere: density increases too much at h=" + std::to_string(altitude));
                }
                if (finite(prev_pressure)) {
                    ctx.check(
                        p.pressure <= prev_pressure * 1.05 + 1e-12,
                        "Atmosphere: pressure increases too much at h=" + std::to_string(altitude));
                }
                prev_density = p.density;
                prev_pressure = p.pressure;
            }
        }

        for (double mach = -1.0; mach <= 8.0; mach += 0.02) {
            const double cd_fair = fair.get_drag_coefficient(mach);
            const double cd_bottom = bottom.get_drag_coefficient(mach);
            const double cd_main = main_chute.get_drag_coefficient(mach);
            const double cd_drogue = drogue_chute.get_drag_coefficient(mach);

            ctx.check(finite(cd_fair) && cd_fair >= 0.0, "Drag: invalid fair Cd at mach=" + std::to_string(mach));
            ctx.check(finite(cd_bottom) && cd_bottom >= 0.0, "Drag: invalid bottom Cd at mach=" + std::to_string(mach));
            ctx.check(finite(cd_main) && cd_main >= 0.0, "Drag: invalid main chute Cd at mach=" + std::to_string(mach));
            ctx.check(finite(cd_drogue) && cd_drogue >= 0.0, "Drag: invalid drogue Cd at mach=" + std::to_string(mach));
        }
    }

    void physics_consistency_checks(AuditContext& ctx)
    {
        {
            std::list<Stage> stages;
            stages.push_back(make_stage(
                "freefall",
                Engine::ThrottlePoint::DataTypeEng::TIME,
                0.0,
                0.0,
                50.0,
                100.0,
                0.0,
                100.0,
                0.0,
                0.0,
                SeparationMode::ByTime,
                1e9,
                { 0.0, 0.0, 0.0, 0.0 }));

            Rocket rocket(
                std::move(stages),
                fSeparationMode::ByTime,
                0.0,
                1e9,
                make_pitch_graph(Rocket::PitchAnglePoint::DataTypePitch::TIME, { 90.0, 90.0, 90.0, 90.0 }));

            Physics physics(rocket);
            Eigen::VectorXd state(5);
            state << 0.0, 0.0, 0.0, 0.0, 1000.0;
            auto deriv = physics.calculate_derivatives(state, 0.0, 0.0);
            ctx.check(std::abs(deriv[DerivIndex::DVVERT_DT] + 9.80665) < 0.8, "Physics: free-fall g mismatch");
            ctx.check(std::abs(deriv[DerivIndex::DVHOR_DT]) < 1e-8, "Physics: free-fall horizontal acceleration mismatch");
        }

        {
            std::list<Stage> stages;
            stages.push_back(make_stage(
                "thrustcheck",
                Engine::ThrottlePoint::DataTypeEng::TIME,
                12000.0,
                0.0,
                50.0,
                100.0,
                0.0,
                100.0,
                0.0,
                0.0,
                SeparationMode::ByTime,
                1e9,
                { 1.0, 1.0, 1.0, 1.0 }));

            Rocket rocket(
                std::move(stages),
                fSeparationMode::ByTime,
                0.0,
                1e9,
                make_pitch_graph(Rocket::PitchAnglePoint::DataTypePitch::TIME, { 90.0, 90.0, 90.0, 90.0 }));

            Physics physics(rocket);
            Eigen::VectorXd state(5);
            state << 0.0, 0.0, 0.0, 0.0, 1000.0;
            auto deriv = physics.calculate_derivatives(state, 0.0, 0.0);
            ctx.check(deriv[DerivIndex::DVVERT_DT] > -0.5, "Physics: thrust should counter gravity at launch");
        }

        {
            std::list<Stage> stages_a;
            stages_a.push_back(make_stage(
                "par_no",
                Engine::ThrottlePoint::DataTypeEng::TIME,
                0.0,
                0.0,
                10.0,
                100.0,
                0.0,
                100.0,
                0.0,
                1.0,
                SeparationMode::ByTime,
                1e9,
                { 0.0, 0.0, 0.0, 0.0 }));

            std::list<Stage> stages_b;
            stages_b.push_back(make_stage(
                "par_yes",
                Engine::ThrottlePoint::DataTypeEng::TIME,
                0.0,
                0.0,
                10.0,
                100.0,
                0.0,
                100.0,
                0.0,
                1.0,
                SeparationMode::ByTime,
                1e9,
                { 0.0, 0.0, 0.0, 0.0 }));

            Rocket rocket_no(
                std::move(stages_a),
                fSeparationMode::ByTime,
                0.0,
                1e9,
                make_pitch_graph(Rocket::PitchAnglePoint::DataTypePitch::TIME, { 90.0, 90.0, 90.0, 90.0 }));

            Rocket rocket_yes(
                std::move(stages_b),
                fSeparationMode::ByTime,
                0.0,
                1e9,
                make_pitch_graph(Rocket::PitchAnglePoint::DataTypePitch::TIME, { 90.0, 90.0, 90.0, 90.0 }));
            rocket_yes.add_parachute(Parachute(Parachute::DataTypePar::ALTITUDE, false, 20.0, { 3000.0, 0.0 }));

            Physics p_no(rocket_no);
            Physics p_yes(rocket_yes);

            Eigen::VectorXd state(5);
            state << 1000.0, 50.0, 0.0, 0.0, 500.0;
            const auto up_no = p_no.calculate_derivatives(state, 0.0, 0.0);
            const auto up_yes = p_yes.calculate_derivatives(state, 0.0, 0.0);
            ctx.check(
                std::abs(up_no[DerivIndex::DVVERT_DT] - up_yes[DerivIndex::DVVERT_DT]) < 1e-10,
                "Physics: parachute affects ascent (should not)");

            state[StateIndex::VERTICAL_VEL] = -50.0;
            const auto down_no = p_no.calculate_derivatives(state, 0.0, 0.0);
            const auto down_yes = p_yes.calculate_derivatives(state, 0.0, 0.0);
            ctx.check(
                down_yes[DerivIndex::DVVERT_DT] > down_no[DerivIndex::DVVERT_DT],
                "Physics: parachute does not reduce descent rate");
        }
    }

    Rocket make_reference_rocket_case(int id)
    {
        if (id == 0) {
            std::list<Stage> stages;
            stages.push_back(make_stage(
                "ref0_s1",
                Engine::ThrottlePoint::DataTypeEng::TIME,
                280000.0,
                85.0,
                600.0,
                900.0,
                8500.0,
                1200.0,
                300.0,
                2.4,
                SeparationMode::ByFuel,
                0.0,
                { 1.0, 1.0, 1.0, 1.0 }));

            Rocket rocket(
                std::move(stages),
                fSeparationMode::ByTime,
                120.0,
                15.0,
                make_pitch_graph(Rocket::PitchAnglePoint::DataTypePitch::TIME, { 90.0, 88.0, 82.0, 70.0 }));
            return rocket;
        }

        if (id == 1) {
            std::list<Stage> stages;
            stages.push_back(make_stage(
                "ref1_s1",
                Engine::ThrottlePoint::DataTypeEng::TIME,
                260000.0,
                90.0,
                550.0,
                850.0,
                9000.0,
                1000.0,
                250.0,
                2.6,
                SeparationMode::ByFuel,
                0.0,
                { 1.0, 1.0, 0.9, 0.85 }));

            stages.push_back(make_stage(
                "ref1_s2",
                Engine::ThrottlePoint::DataTypeEng::TIME,
                100000.0,
                26.0,
                280.0,
                300.0,
                2500.0,
                450.0,
                180.0,
                1.3,
                SeparationMode::ByTime,
                60.0,
                { 1.0, 1.0, 0.95, 0.9 }));

            Rocket rocket(
                std::move(stages),
                fSeparationMode::ByStage,
                90.0,
                1.0,
                make_pitch_graph(Rocket::PitchAnglePoint::DataTypePitch::TIME, { 90.0, 86.0, 74.0, 60.0 }));
            return rocket;
        }

        if (id == 2) {
            std::list<Stage> stages;
            stages.push_back(make_stage(
                "ref2_s1",
                Engine::ThrottlePoint::DataTypeEng::SPEED,
                220000.0,
                75.0,
                420.0,
                700.0,
                6200.0,
                820.0,
                180.0,
                1.9,
                SeparationMode::ByTime,
                80.0,
                { 1.0, 0.95, 0.75, 0.45 }));

            Rocket rocket(
                std::move(stages),
                fSeparationMode::ByAltitude,
                60.0,
                12000.0,
                make_pitch_graph(Rocket::PitchAnglePoint::DataTypePitch::SPEED, { 90.0, 86.0, 76.0, 62.0 }));
            rocket.add_parachute(Parachute(Parachute::DataTypePar::ALTITUDE, false, 18.0, { 3000.0, 0.0 }));
            rocket.add_parachute(Parachute(Parachute::DataTypePar::ALTITUDE, true, 6.0, { 8000.0, 3000.0 }));
            return rocket;
        }

        std::list<Stage> stages;
        stages.push_back(make_stage(
            "ref3_s1",
            Engine::ThrottlePoint::DataTypeEng::TIME,
            0.0,
            0.0,
            200.0,
            900.0,
            0.0,
            600.0,
            150.0,
            2.0,
            SeparationMode::ByTime,
            1e9,
            { 0.0, 0.0, 0.0, 0.0 }));

        Rocket rocket(
            std::move(stages),
            fSeparationMode::ByTime,
            0.0,
            1e9,
            make_pitch_graph(Rocket::PitchAnglePoint::DataTypePitch::TIME, { 90.0, 90.0, 90.0, 90.0 }));
        rocket.add_parachute(Parachute(Parachute::DataTypePar::ALTITUDE, false, 16.0, { 2500.0, 100.0 }));
        return rocket;
    }

    void simulation_reference_checks(AuditContext& ctx)
    {
        const std::array<double, 4> durations = { 20.0, 30.0, 25.0, 20.0 };
        for (int i = 0; i < 4; ++i) {
            Simulation sim(make_reference_rocket_case(i));
            sim.run(0.0, durations[static_cast<std::size_t>(i)]);
            const auto& telemetry = sim.get_telemetry_points();
            verify_telemetry(telemetry, ctx, "reference_case_" + std::to_string(i));

            if (!telemetry.empty()) {
                ctx.check(
                    std::abs(telemetry.back().time - durations[static_cast<std::size_t>(i)]) < 0.02,
                    "reference_case_" + std::to_string(i) + ": unexpected final time");
            }

            if (i == 3 && !telemetry.empty()) {
                for (const auto& p : telemetry) {
                    ctx.check(std::abs(p.thrust) < 1e-9, "reference_case_3: thrust should stay at zero");
                }
            }
        }

        try {
            Simulation sim(make_reference_rocket_case(0));
            sim.run(0.0, 0.5);
            bool thrown = false;
            try {
                sim.run(0.0, 0.5);
            }
            catch (const std::runtime_error&) {
                thrown = true;
            }
            ctx.check(thrown, "Simulation: second run() call must throw");
        }
        catch (const std::exception& ex) {
            ctx.check(false, std::string("Simulation run-twice check threw unexpectedly: ") + ex.what());
        }
    }

    Engine::ThrottlePoint::DataTypeEng random_engine_type(std::mt19937_64& rng)
    {
        std::uniform_int_distribution<int> d(0, 2);
        const int v = d(rng);
        if (v == 0) return Engine::ThrottlePoint::DataTypeEng::TIME;
        if (v == 1) return Engine::ThrottlePoint::DataTypeEng::ALTITUDE;
        return Engine::ThrottlePoint::DataTypeEng::SPEED;
    }

    Rocket::PitchAnglePoint::DataTypePitch random_pitch_type(std::mt19937_64& rng)
    {
        std::uniform_int_distribution<int> d(0, 2);
        const int v = d(rng);
        if (v == 0) return Rocket::PitchAnglePoint::DataTypePitch::TIME;
        if (v == 1) return Rocket::PitchAnglePoint::DataTypePitch::ALTITUDE;
        return Rocket::PitchAnglePoint::DataTypePitch::SPEED;
    }

    SeparationMode random_sep_mode(std::mt19937_64& rng)
    {
        std::uniform_int_distribution<int> d(0, 2);
        const int v = d(rng);
        if (v == 0) return SeparationMode::ByFuel;
        if (v == 1) return SeparationMode::ByTime;
        return SeparationMode::ByAltitude;
    }

    fSeparationMode random_fair_sep_mode(std::mt19937_64& rng)
    {
        std::uniform_int_distribution<int> d(0, 2);
        const int v = d(rng);
        if (v == 0) return fSeparationMode::ByStage;
        if (v == 1) return fSeparationMode::ByTime;
        return fSeparationMode::ByAltitude;
    }

    Rocket make_random_rocket(std::mt19937_64& rng, int index)
    {
        std::uniform_int_distribution<int> stages_count_dist(1, 3);
        std::uniform_real_distribution<double> thrust_dist(0.0, 550000.0);
        std::uniform_real_distribution<double> massflow_dist(0.0, 180.0);
        std::uniform_real_distribution<double> engine_mass_dist(50.0, 1500.0);
        std::uniform_real_distribution<double> tank_dry_dist(100.0, 2500.0);
        std::uniform_real_distribution<double> tank_fuel_dist(100.0, 12000.0);
        std::uniform_real_distribution<double> structural_dist(80.0, 2500.0);
        std::uniform_real_distribution<double> payload_dist(0.0, 800.0);
        std::uniform_real_distribution<double> area_dist(0.4, 5.5);
        std::uniform_real_distribution<double> sep_time_dist(0.5, 30.0);
        std::uniform_real_distribution<double> sep_alt_dist(500.0, 30000.0);
        std::uniform_real_distribution<double> fair_mass_dist(0.0, 400.0);
        std::uniform_real_distribution<double> throttle_level_dist(0.0, 1.0);
        std::uniform_real_distribution<double> angle_dist(35.0, 90.0);

        const int stages_count = stages_count_dist(rng);
        std::list<Stage> stages;
        for (int s = 0; s < stages_count; ++s) {
            const auto throttle_type = random_engine_type(rng);
            const auto sep_mode = random_sep_mode(rng);
            double sep_value = 0.0;
            if (sep_mode == SeparationMode::ByTime) {
                sep_value = sep_time_dist(rng);
            }
            else if (sep_mode == SeparationMode::ByAltitude) {
                sep_value = sep_alt_dist(rng);
            }

            std::array<double, 4> throttle_levels = {
                throttle_level_dist(rng),
                throttle_level_dist(rng),
                throttle_level_dist(rng),
                throttle_level_dist(rng)
            };

            const std::string prefix = "rnd_" + std::to_string(index) + "_s" + std::to_string(s);
            stages.push_back(make_stage(
                prefix,
                throttle_type,
                thrust_dist(rng),
                massflow_dist(rng),
                engine_mass_dist(rng),
                tank_dry_dist(rng),
                tank_fuel_dist(rng),
                structural_dist(rng),
                payload_dist(rng),
                area_dist(rng),
                sep_mode,
                sep_value,
                throttle_levels));
        }

        auto fair_mode = random_fair_sep_mode(rng);
        double fair_value = 0.0;
        if (fair_mode == fSeparationMode::ByStage) {
            std::uniform_int_distribution<int> stage_idx_dist(1, stages_count);
            fair_value = static_cast<double>(stage_idx_dist(rng));
        }
        else if (fair_mode == fSeparationMode::ByTime) {
            fair_value = sep_time_dist(rng);
        }
        else {
            fair_value = sep_alt_dist(rng);
        }

        std::array<double, 4> angles = {
            angle_dist(rng),
            angle_dist(rng),
            angle_dist(rng),
            angle_dist(rng)
        };
        const auto pitch_type = random_pitch_type(rng);
        Rocket rocket(
            std::move(stages),
            std::move(fair_mode),
            fair_mass_dist(rng),
            fair_value,
            make_pitch_graph(pitch_type, angles));

        std::uniform_int_distribution<int> parachute_count_dist(0, 2);
        const int parachute_count = parachute_count_dist(rng);
        if (parachute_count > 0) {
            std::uniform_int_distribution<int> order_dist(0, 1);
            const bool reverse_order = (order_dist(rng) == 1);
            if (reverse_order) {
                rocket.add_parachute(Parachute(Parachute::DataTypePar::ALTITUDE, false, 18.0, { 3000.0, 0.0 }));
                if (parachute_count > 1) {
                    rocket.add_parachute(Parachute(Parachute::DataTypePar::ALTITUDE, true, 6.0, { 8000.0, 3000.0 }));
                }
            }
            else {
                rocket.add_parachute(Parachute(Parachute::DataTypePar::ALTITUDE, true, 6.0, { 8000.0, 3000.0 }));
                if (parachute_count > 1) {
                    rocket.add_parachute(Parachute(Parachute::DataTypePar::ALTITUDE, false, 18.0, { 3000.0, 0.0 }));
                }
            }
        }

        return rocket;
    }

    void random_stress_checks(AuditContext& ctx, int num_rockets)
    {
        std::mt19937_64 rng(0xA5B6C7D8E9F00123ULL);
        std::uniform_real_distribution<double> end_time_dist(0.5, 8.0);
        std::uint64_t total_telemetry_points = 0;

        for (int i = 0; i < num_rockets; ++i) {
            try {
                Simulation sim(make_random_rocket(rng, i));
                const double end_time = end_time_dist(rng);
                sim.run(0.0, end_time);
                const auto& telemetry = sim.get_telemetry_points();
                total_telemetry_points += telemetry.size();
                verify_telemetry(telemetry, ctx, "random_case_" + std::to_string(i));
            }
            catch (const std::exception& ex) {
                ctx.check(false, std::string("random_case_") + std::to_string(i) + " threw: " + ex.what());
            }
        }

        ctx.check(total_telemetry_points > 0, "Random stress: no telemetry points produced");
    }

    void physics_random_state_checks(AuditContext& ctx, int iterations)
    {
        std::list<Stage> stages;
        stages.push_back(make_stage(
            "phys_rnd",
            Engine::ThrottlePoint::DataTypeEng::SPEED,
            350000.0,
            120.0,
            900.0,
            1200.0,
            10000.0,
            1200.0,
            300.0,
            2.5,
            SeparationMode::ByFuel,
            0.0,
            { 1.0, 0.9, 0.7, 0.45 }));

        Rocket rocket(
            std::move(stages),
            fSeparationMode::ByAltitude,
            120.0,
            9000.0,
            make_pitch_graph(Rocket::PitchAnglePoint::DataTypePitch::SPEED, { 90.0, 84.0, 72.0, 58.0 }));
        rocket.add_parachute(Parachute(Parachute::DataTypePar::ALTITUDE, true, 6.0, { 8000.0, 3000.0 }));
        rocket.add_parachute(Parachute(Parachute::DataTypePar::ALTITUDE, false, 20.0, { 3000.0, 0.0 }));

        Physics physics(rocket);
        std::mt19937_64 rng(0x123456789ABCDEF0ULL);
        std::uniform_real_distribution<double> h_dist(-2000.0, 250000.0);
        std::uniform_real_distribution<double> v_dist(-5500.0, 5500.0);
        std::uniform_real_distribution<double> m_dist(-50.0, 150000.0);
        std::uniform_real_distribution<double> t_dist(0.0, 2000.0);

        for (int i = 0; i < iterations; ++i) {
            Eigen::VectorXd state(5);
            state << h_dist(rng), v_dist(rng), v_dist(rng), v_dist(rng) * 100.0, m_dist(rng);

            const auto deriv = physics.calculate_derivatives(state, t_dist(rng), t_dist(rng));
            for (int k = 0; k < deriv.size(); ++k) {
                ctx.check(finite(deriv[k]), "Physics random state: non-finite derivative at iter=" + std::to_string(i));
            }
            ctx.check(deriv[DerivIndex::DM_DT] <= 1e-9, "Physics random state: positive mass flow derivative");
            const double last_accel = physics.get_last_acceleration();
            ctx.check(finite(last_accel), "Physics random state: non-finite acceleration cache");
            ctx.check(last_accel >= 0.0, "Physics random state: negative acceleration magnitude");
            const auto atmo = physics.get_last_atmosphere_point();
            ctx.check(finite(atmo.density) && atmo.density >= 0.0, "Physics random state: invalid cached atmosphere density");
            ctx.check(finite(atmo.sound_speed) && atmo.sound_speed > 0.0, "Physics random state: invalid cached atmosphere sound speed");
        }
    }
}

int main()
{
    AuditContext ctx;
    try {
        atmosphere_and_drag_checks(ctx);
        physics_consistency_checks(ctx);
        simulation_reference_checks(ctx);
        physics_random_state_checks(ctx, 25000);
        random_stress_checks(ctx, 220);
    }
    catch (const std::exception& ex) {
        ctx.check(false, std::string("Fatal exception in deep audit: ") + ex.what());
    }

    std::cout << "DEEP_AUDIT_CHECKS=" << ctx.checks << "\n";
    std::cout << "DEEP_AUDIT_FAILURES=" << ctx.failures << "\n";
    if (!ctx.messages.empty()) {
        std::cout << "DEEP_AUDIT_FIRST_FAILURES_BEGIN\n";
        for (const auto& msg : ctx.messages) {
            std::cout << msg << "\n";
        }
        std::cout << "DEEP_AUDIT_FIRST_FAILURES_END\n";
    }

    if (ctx.failures == 0) {
        std::cout << "DEEP_AUDIT_STATUS=PASS\n";
        return 0;
    }

    std::cout << "DEEP_AUDIT_STATUS=FAIL\n";
    return 2;
}
