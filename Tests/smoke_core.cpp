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

        Engine engine("smoke-engine", 100000.0, 25.0, 1000.0, std::move(throttle));
        Tank tank("smoke-tank", 500.0, 200.0);
        std::vector<Engine> engines;
        engines.push_back(std::move(engine));

        Stage stage(
            std::move(engines),
            std::move(tank),
            SeparationMode::ByFuel,
            400.0,
            100.0,
            1.2,
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

        Rocket rocket(std::move(stages), fSeparationMode::ByTime, 50.0, 9999.0, std::move(pitch));

        Simulation sim(std::move(rocket));
        sim.run(0.0, 1.0);

        const auto &telemetry = sim.get_telemetry_points();
        std::cout << "telemetry_points=" << telemetry.size() << "\n";
        if (!telemetry.empty()) {
            const auto &last = telemetry.back();
            std::cout << "last_t=" << last.time << " alt=" << last.altitude << " v=" << last.vert_velocity << " m=" << last.mass << "\n";
            const bool ok_finite =
                std::isfinite(last.time) &&
                std::isfinite(last.altitude) &&
                std::isfinite(last.vert_velocity) &&
                std::isfinite(last.mass);
            const bool ok_mass = last.mass >= 1.0;
            const bool ok_time = std::abs(last.time - 1.0) <= 1e-9;
            if (!(ok_finite && ok_mass && ok_time)) {
                return 3;
            }
        }

        return telemetry.empty() ? 2 : 0;
    } catch (const std::exception &ex) {
        std::cerr << "error: " << ex.what() << "\n";
        return 1;
    }
}
