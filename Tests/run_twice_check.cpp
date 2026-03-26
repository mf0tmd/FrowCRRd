#include "Core/Simulation/simulation.hpp"
#include <iostream>
#include <vector>
#include <list>

static Rocket make_rocket() {
    std::vector<Engine::ThrottlePoint> throttle = {
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 0.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 1.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 2.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 3.0}
    };
    Engine engine("e", 100000.0, 20.0, 1000.0, std::move(throttle));
    Tank tank("t", 500.0, 200.0);
    std::vector<Engine> engines;
    engines.push_back(std::move(engine));

    Stage stage(std::move(engines), std::move(tank), SeparationMode::ByFuel, 300.0, 100.0, 1.2, 0.0);
    std::list<Stage> stages;
    stages.push_back(std::move(stage));

    std::vector<Rocket::PitchAnglePoint> pitch = {
        {Rocket::PitchAnglePoint::DataTypePitch::TIME, 90.0, 0.0},
        {Rocket::PitchAnglePoint::DataTypePitch::TIME, 90.0, 1.0},
        {Rocket::PitchAnglePoint::DataTypePitch::TIME, 90.0, 2.0},
        {Rocket::PitchAnglePoint::DataTypePitch::TIME, 90.0, 3.0}
    };

    return Rocket(std::move(stages), fSeparationMode::ByTime, 0.0, 1e9, std::move(pitch));
}

int main() {
    Simulation sim(make_rocket());
    sim.run(0.0, 0.5);
    auto n1 = sim.get_telemetry_points().size();
    auto t1 = sim.get_telemetry_points().back().time;

    try {
        sim.run(0.0, 0.5);
        std::cout << "expected_exception=NO n1=" << n1 << " t1=" << t1 << "\n";
        return 1;
    } catch (const std::runtime_error& ex) {
        std::cout << "expected_exception=YES what=" << ex.what() << " n1=" << n1 << " t1=" << t1 << "\n";
        return 0;
    } catch (...) {
        std::cout << "expected_exception=UNKNOWN n1=" << n1 << " t1=" << t1 << "\n";
        return 2;
    }
}
