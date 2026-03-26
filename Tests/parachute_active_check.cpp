#include "Models/Rocket/rocket.hpp"
#include <iostream>
#include <vector>
#include <list>
#include <array>
#include <string>

int main() {
    std::vector<Engine::ThrottlePoint> throttle = {
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 0.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 1.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 2.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 3.0}
    };

    Engine engine("e", 1.0, 0.0, 1.0, std::move(throttle));
    Tank tank("t", 1.0, 0.0);
    std::vector<Engine> engines;
    engines.push_back(std::move(engine));
    Stage stage(std::move(engines), std::move(tank), SeparationMode::ByTime, 1.0, 0.0, 1.0, 9999.0);

    std::list<Stage> stages;
    stages.push_back(std::move(stage));

    std::vector<Rocket::PitchAnglePoint> pitch = {
        {Rocket::PitchAnglePoint::DataTypePitch::TIME, 90.0, 0.0}
    };

    Rocket rocket(std::move(stages), fSeparationMode::ByTime, 0.0, 9999.0, std::move(pitch));
    rocket.add_parachute(Parachute(Parachute::DataTypePar::ALTITUDE, false, 10.0, {3000.0, 0.0}));

    const std::array<double, 5> samples = {5000.0, 2500.0, 100.0, 0.0, -10.0};
    const std::array<const char*, 5> expected = {"skip", "deploy", "deploy", "skip", "skip"};

    bool ok = true;
    for (std::size_t i = 0; i < samples.size(); ++i) {
        const char* state = rocket.get_active_parachute(samples[i]) ? "deploy" : "skip";
        std::cout << state << "\n";
        if (std::string(state) != expected[i]) {
            ok = false;
        }
    }

    return ok ? 0 : 1;
}
