#include "Core/Simulation/simulation.hpp"
#include <iostream>
#include <vector>
#include <list>
#include <cmath>
int main(){
    std::vector<Engine::ThrottlePoint> throttle = {
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 0.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 1.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 2.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 3.0}
    };
    Engine engine("e", 100000.0, 25.0, 1000.0, std::move(throttle));
    Tank tank("t", 500.0, 200.0);
    std::vector<Engine> engines;
    engines.push_back(std::move(engine));
    Stage stage(std::move(engines), std::move(tank), SeparationMode::ByFuel, 400.0, 100.0, 1.2, 0.0);
    std::list<Stage> stages; stages.push_back(std::move(stage));
    std::vector<Rocket::PitchAnglePoint> pitch = {
        {Rocket::PitchAnglePoint::DataTypePitch::TIME, 90.0, 0.0},
        {Rocket::PitchAnglePoint::DataTypePitch::TIME, 90.0, 1.0},
        {Rocket::PitchAnglePoint::DataTypePitch::TIME, 90.0, 2.0},
        {Rocket::PitchAnglePoint::DataTypePitch::TIME, 90.0, 3.0}
    };
    Rocket rocket(std::move(stages), fSeparationMode::ByTime, 0.0, 1e9, std::move(pitch));
    Simulation sim(std::move(rocket));
    sim.run(0.0, 1.0);
    const auto& telem = sim.get_telemetry_points();
    std::cout << "n=" << telem.size() << " first=" << telem.front().time << " last=" << telem.back().time << "\n";
    const bool ok_n = telem.size() == 1000;
    const bool ok_first = std::abs(telem.front().time - 0.001) <= 1e-9;
    const bool ok_last = std::abs(telem.back().time - 1.0) <= 1e-9;
    return (ok_n && ok_first && ok_last) ? 0 : 1;
}
