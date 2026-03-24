#include "Core/Simulation/simulation.hpp"
#include <iostream>
#include <vector>
#include <list>
#include <cmath>

int main() {
    try {
        std::vector<Engine::ThrottlePoint> throttle = {
            {Engine::ThrottlePoint::DataTypeEng::SPEED, 1.0, 0.0},
            {Engine::ThrottlePoint::DataTypeEng::SPEED, 0.8, 100.0},
            {Engine::ThrottlePoint::DataTypeEng::SPEED, 0.4, 500.0},
            {Engine::ThrottlePoint::DataTypeEng::SPEED, 0.2, 1000.0}
        };

        Engine engine("e", 200000.0, 80.0, 500.0, std::move(throttle));
        Tank tank("t", 1000.0, 5000.0);
        std::vector<Engine> engines;
        engines.push_back(std::move(engine));

        Stage stage(
            std::move(engines),
            std::move(tank),
            SeparationMode::ByTime,
            800.0,
            300.0,
            1.5,
            1e9
        );

        std::list<Stage> stages;
        stages.push_back(std::move(stage));

        std::vector<Rocket::PitchAnglePoint> pitch = {
            {Rocket::PitchAnglePoint::DataTypePitch::TIME, 90.0, 0.0},
            {Rocket::PitchAnglePoint::DataTypePitch::TIME, 88.0, 2.0},
            {Rocket::PitchAnglePoint::DataTypePitch::TIME, 75.0, 5.0},
            {Rocket::PitchAnglePoint::DataTypePitch::TIME, 60.0, 10.0}
        };

        Rocket rocket(std::move(stages), fSeparationMode::ByTime, 0.0, 1e9, std::move(pitch));

        const double initial_mass = rocket.get_mass();
        Simulation sim(std::move(rocket));
        sim.run(0.0, 20.0);

        const auto &telem = sim.get_telemetry_points();
        const double final_mass = telem.empty() ? 0.0 : telem.back().mass;
        const double integrated_burn = initial_mass - final_mass;
        const double tracked_burn = sim.get_burned_fuel_mass();
        const double diff = tracked_burn - integrated_burn;

        std::cout << "initial=" << initial_mass << " final=" << final_mass << "\n";
        std::cout << "integrated_burn=" << integrated_burn << " tracked_burn=" << tracked_burn << " diff=" << diff << "\n";

        const bool ok_mass = final_mass > 0.0 && final_mass < initial_mass;
        const bool ok_sync = std::abs(diff) <= 1e-6;
        return (ok_mass && ok_sync) ? 0 : 1;
    } catch (const std::exception& ex) {
        std::cerr << "error: " << ex.what() << "\n";
        return 1;
    }
}
