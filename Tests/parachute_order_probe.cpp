#include "Models/Rocket/rocket.hpp"
#include <iostream>
#include <vector>
#include <list>
#include <array>
#include <string>
int main(){
    std::vector<Engine::ThrottlePoint> throttle = {
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 0.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 1.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 2.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 3.0}
    };
    Engine e("e", 1.0, 0.0, 1.0, std::move(throttle));
    Tank t("t",1.0,0.0);
    std::vector<Engine> es; es.push_back(std::move(e));
    Stage s(std::move(es), std::move(t), SeparationMode::ByTime, 1.0, 0.0, 1.0, 9999.0);
    std::list<Stage> stages; stages.push_back(std::move(s));
    std::vector<Rocket::PitchAnglePoint> pitch = {{Rocket::PitchAnglePoint::DataTypePitch::TIME, 90.0, 0.0}};
    Rocket r(std::move(stages), fSeparationMode::ByTime, 0.0, 9999.0, std::move(pitch));
    // Added in non-chronological order intentionally
    r.add_parachute(Parachute(Parachute::DataTypePar::ALTITUDE, false, 20.0, {3000.0, 0.0}));   // main
    r.add_parachute(Parachute(Parachute::DataTypePar::ALTITUDE, true, 5.0, {8000.0, 3000.0}));   // drogue
    const std::array<double, 3> samples = {9000.0, 7000.0, 2500.0};
    const std::array<const char*, 3> expected = {"skip", "deploy", "deploy"};
    bool ok = true;
    for (std::size_t i = 0; i < samples.size(); ++i) {
        const char* state = r.get_active_parachute(samples[i]) ? "deploy" : "skip";
        std::cout << samples[i] << ":" << state << "\n";
        if (std::string(state) != expected[i]) {
            ok = false;
        }
    }
    return ok ? 0 : 1;
}
