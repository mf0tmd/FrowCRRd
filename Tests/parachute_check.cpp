#include "Models/Rocket/rocket.hpp"
#include <iostream>
#include <vector>
#include <list>
#include <array>
#include <string>

namespace
{
    const char* state_label(const Parachute* parachute)
    {
        return (parachute != nullptr) ? "deploy" : "skip_or_cut";
    }
}

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
    const std::array<const char*, 5> expected = {"skip_or_cut", "deploy", "deploy", "skip_or_cut", "skip_or_cut"};

    bool ok = true;
    for (std::size_t i = 0; i < samples.size(); ++i) {
        const Parachute* active = rocket.get_active_parachute(samples[i]);
        const char* actual = state_label(active);
        std::cout << samples[i] << ":" << actual << "\n";
        if (std::string(actual) != expected[i]) {
            ok = false;
        }
    }

    return ok ? 0 : 1;
}
