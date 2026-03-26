#include "Models/Rocket/rocket.hpp"
#include <iostream>
#include <vector>
#include <list>

int main() {
    int passed = 0;

    try {
        std::vector<Engine::ThrottlePoint> mixed = {
            {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 0.0},
            {Engine::ThrottlePoint::DataTypeEng::ALTITUDE, 0.5, 1000.0}
        };
        Engine e("bad", 1000.0, 1.0, 10.0, std::move(mixed));
        std::cout << "engine_mixed=FAILED\n";
    } catch (...) {
        std::cout << "engine_mixed=OK\n";
        ++passed;
    }

    try {
        std::vector<Engine::ThrottlePoint> t1 = {
            {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 0.0},
            {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 1.0}
        };
        std::vector<Engine::ThrottlePoint> t2 = {
            {Engine::ThrottlePoint::DataTypeEng::ALTITUDE, 1.0, 0.0},
            {Engine::ThrottlePoint::DataTypeEng::ALTITUDE, 1.0, 1.0}
        };
        Engine e1("e1", 1000.0, 1.0, 10.0, std::move(t1));
        Engine e2("e2", 1000.0, 1.0, 10.0, std::move(t2));
        std::vector<Engine> engines;
        engines.push_back(std::move(e1));
        engines.push_back(std::move(e2));
        Tank tank("t", 1.0, 1.0);
        Stage s(std::move(engines), std::move(tank), SeparationMode::ByFuel, 1.0, 0.0, 1.0, 0.0);
        std::cout << "stage_engine_type=FAILED\n";
    } catch (...) {
        std::cout << "stage_engine_type=OK\n";
        ++passed;
    }

    try {
        std::vector<Engine::ThrottlePoint> throttle = {
            {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 0.0}
        };
        Engine e("e", 1000.0, 1.0, 10.0, std::move(throttle));
        std::vector<Engine> engines;
        engines.push_back(std::move(e));
        Tank tank("t", 1.0, 1.0);
        Stage s(std::move(engines), std::move(tank), SeparationMode::ByFuel, 1.0, 0.0, 1.0, 0.0);
        std::list<Stage> stages;
        stages.push_back(std::move(s));

        std::vector<Rocket::PitchAnglePoint> bad_pitch = {
            {Rocket::PitchAnglePoint::DataTypePitch::TIME, 90.0, 0.0},
            {Rocket::PitchAnglePoint::DataTypePitch::ALTITUDE, 80.0, 1000.0}
        };
        Rocket r(std::move(stages), fSeparationMode::ByTime, 0.0, 0.0, std::move(bad_pitch));
        std::cout << "pitch_mixed=FAILED\n";
    } catch (...) {
        std::cout << "pitch_mixed=OK\n";
        ++passed;
    }

    try {
        std::vector<Engine::ThrottlePoint> throttle = {
            {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 0.0}
        };
        Engine e("e", 1000.0, 1.0, 10.0, std::move(throttle));
        std::vector<Engine> engines;
        engines.push_back(std::move(e));
        Tank tank("t", 1.0, 1.0);
        Stage s(std::move(engines), std::move(tank), SeparationMode::ByFuel, 1.0, 0.0, 1.0, 0.0);
        std::list<Stage> stages;
        stages.push_back(std::move(s));
        std::vector<Rocket::PitchAnglePoint> pitch = {
            {Rocket::PitchAnglePoint::DataTypePitch::TIME, 90.0, 0.0}
        };
        Rocket r(std::move(stages), fSeparationMode::ByTime, 0.0, 0.0, std::move(pitch));

        r.add_parachute(Parachute(Parachute::DataTypePar::TIME, false, 10.0, {1.0, 2.0}));
        r.add_parachute(Parachute(Parachute::DataTypePar::ALTITUDE, true, 2.0, {1000.0, 0.0}));
        std::cout << "parachute_type=FAILED\n";
    } catch (...) {
        std::cout << "parachute_type=OK\n";
        ++passed;
    }

    std::cout << "passed=" << passed << "\n";
    return (passed == 4) ? 0 : 1;
}
