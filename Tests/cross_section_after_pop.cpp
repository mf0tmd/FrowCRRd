#include "Models/Rocket/rocket.hpp"
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

    Engine engine("e", 1.0, 1.0, 1.0, std::move(throttle));
    Tank tank("t", 1.0, 1.0);
    std::vector<Engine> engines;
    engines.push_back(std::move(engine));

    Stage stage(std::move(engines), std::move(tank), SeparationMode::ByFuel, 1.0, 0.0, 2.5, 0.0);

    std::list<Stage> stages;
    stages.push_back(std::move(stage));

    std::vector<Rocket::PitchAnglePoint> pitch = {
        {Rocket::PitchAnglePoint::DataTypePitch::TIME, 90.0, 0.0}
    };

    Rocket rocket(std::move(stages), fSeparationMode::ByTime, 0.0, 9999.0, std::move(pitch));
    const double area_before = rocket.get_current_cross_sectional_area();
    const double mass_before = rocket.get_mass();
    std::cout << "area_before=" << area_before << " mass_before=" << mass_before << "\n";
    rocket.next_stage();
    const double area_after = rocket.get_current_cross_sectional_area();
    const double mass_after = rocket.get_mass();
    std::cout << "area_after=" << area_after << " mass_after=" << mass_after << "\n";

    const bool ok_before = area_before > 0.0 && mass_before > 0.0;
    const bool ok_after = std::abs(area_after) <= 1e-12 && std::abs(mass_after) <= 1e-12;
    return (ok_before && ok_after) ? 0 : 1;
}
