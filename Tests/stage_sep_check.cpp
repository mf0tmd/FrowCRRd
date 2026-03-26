#include "Core/Simulation/simulation.hpp"
#include <iostream>
#include <vector>
#include <list>
#include <cmath>

int main() {
    std::vector<Engine::ThrottlePoint> throttle = {
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 0.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 1.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 2.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 3.0}
    };

    Engine engine("e", 1000.0, 1.0, 10.0, std::move(throttle));
    Tank tank("t", 10.0, 1.0); // 1 second of fuel at mf=1 kg/s
    std::vector<Engine> engines;
    engines.push_back(std::move(engine));

    Stage stage(
        std::move(engines),
        std::move(tank),
        SeparationMode::ByFuel,
        10.0,
        0.0,
        0.5,
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
    sim.run(0.0, 1.005);

    const auto& t = sim.get_telemetry_points();
    double last_thrust_t = -1.0;
    for (const auto& p : t) {
        if (p.thrust > 1e-9) {
            last_thrust_t = p.time;
        }
    }

    std::cout << "n=" << t.size() << " last_thrust_t=" << last_thrust_t << "\n";
    const bool ok_count = t.size() >= 1000;
    const bool ok_cutoff = std::abs(last_thrust_t - 1.0) <= 0.02;
    return (ok_count && ok_cutoff) ? 0 : 1;
}
