#include "Core/Simulation/simulation.hpp"
#include <iostream>
#include <vector>
#include <list>
#include <cmath>

int main() {
    try {
        std::vector<Engine::ThrottlePoint> throttle = {
            {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 0.0},
            {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 1.0},
            {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 2.0},
            {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 3.0}
        };

        Engine engine("e", 120000.0, 20.0, 1000.0, std::move(throttle));
        Tank tank("t", 400.0, 10.0);
        std::vector<Engine> engines;
        engines.push_back(std::move(engine));

        Stage stage(
            std::move(engines),
            std::move(tank),
            SeparationMode::ByFuel,
            300.0,
            100.0,
            2.0,
            0.0
        );

        std::list<Stage> stages;
        stages.push_back(std::move(stage));

        std::vector<Rocket::PitchAnglePoint> pitch = {
            {Rocket::PitchAnglePoint::DataTypePitch::TIME, 90.0, 0.0},
            {Rocket::PitchAnglePoint::DataTypePitch::TIME, 90.0, 1.0},
            {Rocket::PitchAnglePoint::DataTypePitch::TIME, 90.0, 2.0},
            {Rocket::PitchAnglePoint::DataTypePitch::TIME, 90.0, 3.0}
        };

        Rocket rocket(std::move(stages), fSeparationMode::ByTime, 0.0, 9999.0, std::move(pitch));

        Simulation sim(std::move(rocket));
        sim.run(0.0, 8.0);

        const auto &telemetry = sim.get_telemetry_points();

        std::size_t first_no_thrust_idx = telemetry.size();
        for (std::size_t i = 0; i < telemetry.size(); ++i) {
            if (telemetry[i].thrust <= 1e-9) {
                first_no_thrust_idx = i;
                break;
            }
        }

        if (first_no_thrust_idx >= telemetry.size()) {
            std::cout << "no cutoff found\n";
            return 2;
        }

        const auto &cut = telemetry[first_no_thrust_idx];
        std::size_t probe_idx = std::min(first_no_thrust_idx + 2000, telemetry.size() - 1);
        const auto &probe = telemetry[probe_idx];

        std::cout << "cut_t=" << cut.time << " cut_mass=" << cut.mass << " cut_alt=" << cut.altitude << " cut_acc=" << cut.acceleration << "\n";
        std::cout << "probe_t=" << probe.time << " probe_mass=" << probe.mass << " probe_alt=" << probe.altitude << " probe_v=" << probe.vert_velocity << " probe_acc=" << probe.acceleration << "\n";

        const bool thrust_stays_zero = probe.thrust <= 1e-9;
        const bool mass_is_stable = std::abs(probe.mass - cut.mass) <= 1e-4;
        const bool acceleration_is_finite = std::isfinite(probe.acceleration);
        return (thrust_stays_zero && mass_is_stable && acceleration_is_finite) ? 0 : 1;
    } catch (const std::exception &ex) {
        std::cerr << "error: " << ex.what() << "\n";
        return 1;
    }
}
